import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const requiredEnvironment = [
  "SUPABASE_URL",
  "SUPABASE_SECRET_KEY",
  "MIGRATION_AUTH_USER_ID",
  "VITE_SUPABASE_PUBLISHABLE_KEY",
] as const;

function environment(name: (typeof requiredEnvironment)[number]) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

test("DeepSeek responds through the authenticated Edge Function and persists the conversation", async () => {
  test.setTimeout(60_000);
  test.skip(
    process.env.DEEPSEEK_E2E !== "1"
      || requiredEnvironment.some((name) => !process.env[name]?.trim()),
    "Run explicitly after DEEPSEEK_API_KEY has been uploaded to Supabase Secrets",
  );

  const url = environment("SUPABASE_URL");
  const admin = createClient(url, environment("SUPABASE_SECRET_KEY"), {
    auth: { persistSession: false },
  });
  const userId = environment("MIGRATION_AUTH_USER_ID");
  let conversationId = "";
  let cleanupError: Error | null = null;

  try {
    const { data: userData, error: userError } = await admin.auth.admin.getUserById(userId);
    if (userError) throw userError;
    if (!userData.user.email) throw new Error("The migration Auth user has no email");

    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email: userData.user.email,
    });
    if (linkError) throw linkError;

    const client = createClient(url, environment("VITE_SUPABASE_PUBLISHABLE_KEY"), {
      auth: { persistSession: false },
    });
    const { data: authData, error: authError } = await client.auth.verifyOtp({
      token_hash: linkData.properties.hashed_token,
      type: "magiclink",
    });
    if (authError) throw authError;
    if (!authData.session) throw new Error("Supabase did not return an authenticated session");

    const response = await fetch(`${url}/functions/v1/ai-assistant`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${authData.session.access_token}`,
        apikey: environment("VITE_SUPABASE_PUBLISHABLE_KEY"),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tenantId: "school-001",
        content: "请只回复“连接成功”，不要补充其他内容。",
        capability: "连接验证",
        pageContext: {
          route: { path: "/workbench", name: "workbench" },
          page: { title: "工作台", text: "DeepSeek 连接验证" },
        },
      }),
    });
    if (!response.ok) throw new Error(await response.text());
    if (!response.body) throw new Error("Edge Function did not return a response stream");
    const events = await readNdjson(response.body);
    const start = events.find((event) => event.type === "start");
    const done = events.find((event) => event.type === "done");
    const deltas = events.filter((event) => event.type === "delta");
    if (!start?.conversation || !done?.conversation) throw new Error("Streaming response is incomplete");
    conversationId = start.conversation.id;

    expect(start.conversation).toEqual(expect.objectContaining({
      tenant_id: "school-001",
      auth_user_id: userId,
      model: "deepseek-v4-flash",
    }));
    expect(start.messages).toHaveLength(2);
    expect(start.messages[0]).toEqual(expect.objectContaining({
      role: "user",
      status: "completed",
    }));
    expect(start.messages[1]).toEqual(expect.objectContaining({
      role: "assistant",
      status: "pending",
      model: "deepseek-v4-flash",
    }));
    expect(deltas.length).toBeGreaterThan(0);
    expect(deltas.map((event) => event.delta).join("").trim()).not.toBe("");
    expect(done.messages[1]).toEqual(expect.objectContaining({
      role: "assistant",
      status: "completed",
      model: "deepseek-v4-flash",
    }));

    const { data: persistedMessages, error: persistedError } = await client
      .from("ai_messages")
      .select("role,status,model,content,sequence_number")
      .eq("conversation_id", conversationId)
      .order("sequence_number", { ascending: true });
    if (persistedError) throw persistedError;
    expect(persistedMessages).toHaveLength(2);
    expect(persistedMessages[1]).toEqual(expect.objectContaining({
      role: "assistant",
      status: "completed",
      model: "deepseek-v4-flash",
    }));
    expect(persistedMessages[0]!.sequence_number).toBeLessThan(
      persistedMessages[1]!.sequence_number,
    );

    const { error: renameError } = await client
      .from("ai_conversations")
      .update({ title: "连接验证会话" })
      .eq("id", conversationId);
    expect(renameError).toBeNull();

    const { error: forbiddenUpdateError } = await client
      .from("ai_conversations")
      .update({ model: "tampered-model" })
      .eq("id", conversationId);
    expect(forbiddenUpdateError).not.toBeNull();
  } finally {
    if (conversationId) {
      const { error } = await admin.from("ai_conversations").delete().eq("id", conversationId);
      cleanupError = error;
    }
  }
  if (cleanupError) throw cleanupError;
});

interface StreamEvent {
  type: "start" | "delta" | "done" | "error";
  conversation?: Record<string, string>;
  messages: Array<Record<string, unknown>>;
  delta?: string;
}

async function readNdjson(stream: ReadableStream<Uint8Array>) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const events: StreamEvent[] = [];
  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (line.trim()) events.push(JSON.parse(line) as StreamEvent);
    }
    if (done) break;
  }
  if (buffer.trim()) events.push(JSON.parse(buffer) as StreamEvent);
  const error = events.find((event) => event.type === "error");
  if (error) throw new Error(JSON.stringify(error));
  return events;
}
