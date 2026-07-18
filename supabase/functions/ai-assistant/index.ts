import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const MAX_CONTEXT_LENGTH = 12000;
const HISTORY_LIMIT = 20;
const conversationColumns = "id,tenant_id,auth_user_id,title,model,created_at,updated_at,last_message_at";
const messageColumns = "id,conversation_id,role,status,content,model,input_tokens,output_tokens,created_at,sequence_number";

interface AssistantRequest {
  tenantId: string;
  conversationId?: string | null;
  content: string;
  capability?: string | null;
  pageContext?: unknown;
}

interface DeepSeekChunk {
  choices?: Array<{ delta?: { content?: string | null } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number } | null;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authorization = request.headers.get("Authorization");
  if (!authorization) return json({ error: "登录状态无效" }, 401);

  try {
    const body = await request.json() as AssistantRequest;
    const tenantId = body.tenantId?.trim();
    const content = body.content?.trim();
    if (!tenantId || !content) return json({ error: "缺少组织或消息内容" }, 400);
    if (content.length > 10000) return json({ error: "消息内容不能超过 10000 个字符" }, 400);

    const supabaseUrl = requiredEnv("SUPABASE_URL");
    const userClient = createClient(supabaseUrl, resolvePublishableKey(), {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const adminClient = createClient(supabaseUrl, resolveSecretKey(), {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) return json({ error: "登录状态无效" }, 401);
    const authUserId = userData.user.id;

    const [tenantResult, existingConversation] = await Promise.all([
      userClient
        .from("tenants")
        .select("id")
        .eq("id", tenantId)
        .maybeSingle(),
      body.conversationId
        ? loadOwnedConversation(userClient, body.conversationId, tenantId)
        : Promise.resolve(null),
    ]);
    const { data: tenant, error: tenantError } = tenantResult;
    if (tenantError || !tenant) return json({ error: "无权访问当前组织" }, 403);

    let conversation = existingConversation;
    if (body.conversationId && !conversation) return json({ error: "会话不存在或无权访问" }, 404);

    const model = Deno.env.get("DEEPSEEK_MODEL")?.trim() || "deepseek-v4-flash";
    if (!conversation) {
      const { data, error } = await adminClient
        .from("ai_conversations")
        .insert({
          tenant_id: tenantId,
          auth_user_id: authUserId,
          title: content.slice(0, 28),
          model,
        })
        .select(conversationColumns)
        .single();
      if (error) throw error;
      conversation = data;
    }

    const pageContext = sanitizePageContext(body.pageContext);
    const { data: insertedMessages, error: messageInsertError } = await adminClient
      .from("ai_messages")
      .insert([
        {
          conversation_id: conversation.id,
          tenant_id: tenantId,
          auth_user_id: authUserId,
          role: "user",
          status: "completed",
          content,
          page_context: pageContext,
        },
        {
          conversation_id: conversation.id,
          tenant_id: tenantId,
          auth_user_id: authUserId,
          role: "assistant",
          status: "pending",
          content: "",
          model,
        },
      ])
      .select(messageColumns)
    if (messageInsertError) throw messageInsertError;
    const userMessage = insertedMessages.find((message) => message.role === "user");
    const pendingMessage = insertedMessages.find((message) => message.role === "assistant");
    if (!userMessage || !pendingMessage) throw new Error("AI 消息创建失败");

    const history = await loadConversationHistory(adminClient, conversation.id);
    return streamResponse(async (send, signal) => {
      send({ type: "start", conversation, messages: [userMessage, pendingMessage] });
      let streamedContent = "";
      try {
        let inputTokens: number | null = null;
        let outputTokens: number | null = null;
        for await (const chunk of requestDeepSeekStream({
          model,
          userId: authUserId,
          capability: body.capability,
          pageContext,
          history,
          signal,
        })) {
          const delta = chunk.choices?.[0]?.delta?.content ?? "";
          if (delta) {
            streamedContent += delta;
            send({ type: "delta", delta });
          }
          if (chunk.usage) {
            inputTokens = chunk.usage.prompt_tokens ?? null;
            outputTokens = chunk.usage.completion_tokens ?? null;
          }
        }
        if (!streamedContent.trim()) throw new Error("DeepSeek 未返回有效内容");

        const { data: assistantMessage, error: assistantError } = await adminClient
          .from("ai_messages")
          .update({
            status: "completed",
            content: streamedContent,
            input_tokens: inputTokens,
            output_tokens: outputTokens,
          })
          .eq("id", pendingMessage.id)
          .select(messageColumns)
          .single();
        if (assistantError) throw assistantError;

        const { data: updatedConversation, error: conversationError } = await adminClient
          .from("ai_conversations")
          .update({ last_message_at: new Date().toISOString(), model })
          .eq("id", conversation.id)
          .select(conversationColumns)
          .single();
        if (conversationError) throw conversationError;
        send({ type: "done", conversation: updatedConversation, messages: [userMessage, assistantMessage] });
      } catch (error) {
        const message = error instanceof Error ? error.message : "AI 助手请求失败";
        if (!signal.aborted) console.error("ai-assistant stream failed", message);
        await adminClient
          .from("ai_messages")
          .update({
            status: "failed",
            content: streamedContent || "生成失败，请稍后重试。",
          })
          .eq("id", pendingMessage.id);
        send({ type: "error", error: message });
      }
    }, request.signal);
  } catch (error) {
    console.error("ai-assistant request failed", error instanceof Error ? error.message : error);
    return json({ error: error instanceof Error ? error.message : "AI 助手请求失败" }, 500);
  }
});

async function loadOwnedConversation(client: ReturnType<typeof createClient>, id: string, tenantId: string) {
  const { data, error } = await client
    .from("ai_conversations")
    .select(conversationColumns)
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function loadConversationHistory(client: ReturnType<typeof createClient>, conversationId: string) {
  const { data, error } = await client
    .from("ai_messages")
    .select("id,role,status,content")
    .eq("conversation_id", conversationId)
    .eq("status", "completed")
    .order("sequence_number", { ascending: false })
    .limit(HISTORY_LIMIT);
  if (error) throw error;
  return [...data].reverse();
}

async function* requestDeepSeekStream(options: {
  model: string;
  userId: string;
  capability?: string | null;
  pageContext: unknown;
  history: Array<{ role: "user" | "assistant"; content: string }>;
  signal: AbortSignal;
}) {
  const apiKey = requiredEnv("DEEPSEEK_API_KEY");
  const baseUrl = (Deno.env.get("DEEPSEEK_BASE_URL")?.trim() || "https://api.deepseek.com").replace(/\/$/, "");
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: options.model,
      user_id: options.userId,
      thinking: { type: "disabled" },
      temperature: 0.3,
      max_tokens: 2000,
      stream: true,
      stream_options: { include_usage: true },
      messages: [
        {
          role: "system",
          content: buildSystemPrompt(options.capability, options.pageContext),
        },
        ...options.history.map((message) => ({ role: message.role, content: message.content })),
      ],
    }),
    signal: options.signal,
  });
  if (!response.ok) {
    let errorMessage = `DeepSeek 请求失败（${response.status}）`;
    try {
      const payload = await response.json();
      errorMessage = payload?.error?.message || errorMessage;
    } catch {
      // Keep the status-based message when the upstream response is not JSON.
    }
    throw new Error(errorMessage);
  }
  if (!response.body) throw new Error("DeepSeek 未返回流式响应");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line || line.startsWith(":")) continue;
        if (!line.startsWith("data:")) continue;
        const data = line.slice(5).trim();
        if (data === "[DONE]") return;
        yield JSON.parse(data) as DeepSeekChunk;
      }
      if (done) break;
    }
    const finalLine = buffer.trim();
    if (finalLine.startsWith("data:")) {
      const data = finalLine.slice(5).trim();
      if (data && data !== "[DONE]") yield JSON.parse(data) as DeepSeekChunk;
    }
  } finally {
    reader.releaseLock();
  }
}

function streamResponse(
  produce: (send: (event: unknown) => boolean, signal: AbortSignal) => Promise<void>,
  requestSignal: AbortSignal,
) {
  const encoder = new TextEncoder();
  const abortController = new AbortController();
  let cancelled = false;
  const abort = () => abortController.abort();
  if (requestSignal.aborted) abort();
  else requestSignal.addEventListener("abort", abort, { once: true });
  return new Response(new ReadableStream({
    start(controller) {
      const send = (event: unknown) => {
        if (cancelled) return false;
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
          return true;
        } catch {
          cancelled = true;
          abort();
          return false;
        }
      };
      void produce(send, abortController.signal)
        .catch((error) => {
          if (!abortController.signal.aborted) {
            console.error("ai-assistant stream producer failed", error);
          }
        })
        .finally(() => {
          requestSignal.removeEventListener("abort", abort);
          if (cancelled) return;
          try {
            controller.close();
          } catch {
            // The client can close the stream between the final event and cleanup.
          }
        });
    },
    cancel() {
      cancelled = true;
      abort();
      requestSignal.removeEventListener("abort", abort);
    },
  }), {
    headers: {
      ...corsHeaders,
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function buildSystemPrompt(capability: string | null | undefined, pageContext: unknown) {
  const context = pageContext ? JSON.stringify(pageContext) : "无";
  return [
    "你是教育 SaaS 运营平台中的 AI 运营助手。",
    "使用 Markdown 组织回答；公式使用标准 LaTeX，行内公式用 $...$，独立公式用 $$...$$。",
    "回答必须基于当前用户提供的问题和页面上下文；没有证据时明确说明，不得编造业务数据。",
    "仅当当前页面上下文不是“无”时，才可以引用页面中的数据或状态。",
    "优先使用简洁、可执行的中文回答。涉及风险、审批或权限时指出需要人工确认。",
    `当前页面上下文：${context}`,
    capability ? `当前用户选择的能力：${capability}` : "",
  ].filter(Boolean).join("\n");
}

function sanitizePageContext(value: unknown) {
  if (!value) return null;
  const serialized = JSON.stringify(value);
  if (serialized.length <= MAX_CONTEXT_LENGTH) return value;
  return { truncated: true, content: serialized.slice(0, MAX_CONTEXT_LENGTH) };
}

function resolvePublishableKey() {
  const legacy = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
  if (legacy) return legacy;
  const keys = JSON.parse(requiredEnv("SUPABASE_PUBLISHABLE_KEYS"));
  return keys.default;
}

function resolveSecretKey() {
  const legacy = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SECRET_KEY");
  if (legacy) return legacy;
  const keys = JSON.parse(requiredEnv("SUPABASE_SECRET_KEYS"));
  return keys.default;
}

function requiredEnv(name: string) {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error(`服务端环境变量 ${name} 未配置`);
  return value;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });
}
