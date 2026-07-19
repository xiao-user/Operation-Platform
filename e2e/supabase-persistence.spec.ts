import { expect, test, type BrowserContext } from "@playwright/test";
import { createClient, type Session } from "@supabase/supabase-js";

const requiredEnvironment = [
  "SUPABASE_URL",
  "SUPABASE_SECRET_KEY",
  "SUPABASE_PROJECT_REF",
  "MIGRATION_AUTH_USER_ID",
  "VITE_SUPABASE_PUBLISHABLE_KEY",
] as const;

function environment(name: (typeof requiredEnvironment)[number]) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

async function authenticatedSession() {
  const url = environment("SUPABASE_URL");
  const admin = createClient(url, environment("SUPABASE_SECRET_KEY"), {
    auth: { persistSession: false },
  });
  const { data: userData, error: userError } = await admin.auth.admin.getUserById(
    environment("MIGRATION_AUTH_USER_ID"),
  );
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
  const { data, error } = await client.auth.verifyOtp({
    token_hash: linkData.properties.hashed_token,
    type: "magiclink",
  });
  if (error) throw error;
  if (!data.session) throw new Error("Supabase did not return an authenticated session");
  const session = data.session;
  await expect.poll(async () => {
    const { error: readinessError } = await client
      .from("profiles")
      .select("id", { head: true })
      .eq("id", session.user.id);
    return readinessError?.message ?? null;
  }, {
    timeout: 10_000,
    message: "wait for PostgREST to accept the newly issued session JWT",
  }).toBeNull();
  return { admin, client, session };
}

async function browserWithSession(newContext: () => Promise<BrowserContext>, session: Session) {
  const context = await newContext();
  await context.addInitScript(({ key, value }) => {
    localStorage.setItem(key, JSON.stringify(value));
  }, {
    key: `sb-${environment("SUPABASE_PROJECT_REF")}-auth-token`,
    value: session,
  });
  return context;
}

async function switchToBureau(page: import("@playwright/test").Page) {
  const bureauButton = page.getByRole("button", { name: "教育局 体验区教育局" });
  if (await bureauButton.isVisible()) return;
  await page.locator(".tenant-switch").click();
  await page.getByRole("menuitem", { name: "体验区教育局", exact: true }).click();
  await expect(bureauButton).toBeVisible();
}

async function revealCalendarEvent(
  calendar: import("@playwright/test").Locator,
  title: string,
) {
  const event = calendar.getByText(title, { exact: true });
  if (!await event.isVisible()) {
    const more = calendar.getByRole("button", { name: "查看更多事项", exact: true });
    if (await more.isVisible()) await more.click();
  }
  await expect(event).toBeVisible();
}

test.describe("Supabase persistence", () => {
  test.describe.configure({ mode: "serial" });

  test.skip(
    process.env.SUPABASE_E2E !== "1" || requiredEnvironment.some((name) => !process.env[name]?.trim()),
    "Run through npm run test:e2e:supabase after loading .env.local",
  );

  test("the last active tenant survives reloads without being overwritten by a standalone tab", async ({ browser }) => {
    const { session } = await authenticatedSession();
    const context = await browserWithSession(() => browser.newContext(), session);
    const shellPage = await context.newPage();
    const standalonePage = await context.newPage();
    const userId = environment("MIGRATION_AUTH_USER_ID");
    const activeTenantKey = `operation-platform:active-tenant-session:v1:${userId}`;

    try {
      await shellPage.goto("/workbench");
      await shellPage.locator(".tenant-switch").click();
      await shellPage.getByRole("menuitem", { name: "天河区第二实验小学", exact: true }).click();
      await expect(shellPage.getByRole("button", { name: "学校 天河区第二实验小学" }))
        .toBeVisible();
      await expect.poll(() => shellPage.evaluate(
        (key) => sessionStorage.getItem(key),
        activeTenantKey,
      )).toBe("school-002");

      await standalonePage.goto(
        "/bureau/visualization/regional-education-overview?tenantId=bureau-001",
      );
      await expect(
        standalonePage.getByRole("heading", { name: "榕城区", exact: true }),
      ).toBeVisible({ timeout: 20_000 });
      await shellPage.reload();
      await expect(shellPage.getByRole("button", { name: "学校 天河区第二实验小学" }))
        .toBeVisible({ timeout: 20_000 });
    } finally {
      await context.close();
    }
  });

  test("a tenant created in one browser is available in another browser", async ({ browser }) => {
    const { client, session } = await authenticatedSession();
    const firstContext = await browserWithSession(() => browser.newContext(), session);
    const secondContext = await browserWithSession(() => browser.newContext(), session);
    const firstPage = await firstContext.newPage();
    const secondPage = await secondContext.newPage();
    const tenantName = `跨浏览器同步学校-${Date.now()}`;
    let tenantId = "";
    let cleanupError: Error | null = null;

    try {
      await Promise.all([
        firstPage.goto("/system/organization"),
        secondPage.goto("/system/organization"),
      ]);

      await firstPage.getByRole("button", { name: "新增组织" }).click();
      const dialog = firstPage.getByRole("dialog", { name: "新增组织" });
      await dialog.getByRole("textbox", { name: /组织名称/ }).fill(tenantName);
      await dialog.getByRole("textbox", { name: /简称/ }).fill("同步验证");
      await dialog.getByRole("button", { name: "保存", exact: true }).click();
      await expect(firstPage.getByText("组织已保存", { exact: true })).toBeVisible();

      const { data, error } = await client.from("tenants").select("id").eq("name", tenantName).single();
      if (error) throw error;
      tenantId = data.id;

      await secondPage.reload();
      await expect(secondPage.getByRole("row", { name: new RegExp(tenantName) })).toBeVisible();
    } finally {
      if (tenantId) {
        const { error } = await client.from("tenants").delete().eq("id", tenantId);
        cleanupError = error;
      }
      await Promise.all([firstContext.close(), secondContext.close()]);
    }
    if (cleanupError) throw cleanupError;
  });

  test("business data and the user visualization theme come from Supabase", async ({ browser }) => {
    const { client, session } = await authenticatedSession();
    const firstContext = await browserWithSession(() => browser.newContext(), session);
    const secondContext = await browserWithSession(() => browser.newContext(), session);
    const firstPage = await firstContext.newPage();
    const secondPage = await secondContext.newPage();
    const userId = environment("MIGRATION_AUTH_USER_ID");
    let cleanupError: Error | null = null;
    const { data: initialPreference, error: initialPreferenceError } = await client
      .from("user_tenant_preferences")
      .select("visualization_theme_id")
      .eq("tenant_id", "bureau-001")
      .eq("auth_user_id", userId)
      .maybeSingle();
    if (initialPreferenceError) throw initialPreferenceError;

    try {
      const [reviewResult, groupResult, deviceResult] = await Promise.all([
        client.from("org_review_applications").select("id", { count: "exact", head: true }).eq("tenant_id", "bureau-001"),
        client.from("gate_device_groups").select("id", { count: "exact", head: true }).eq("tenant_id", "school-001"),
        client.from("gate_devices").select("id", { count: "exact", head: true }).eq("tenant_id", "school-001"),
      ]);
      if (reviewResult.error) throw reviewResult.error;
      if (groupResult.error) throw groupResult.error;
      if (deviceResult.error) throw deviceResult.error;
      expect(reviewResult.count).toBe(30);
      expect(groupResult.count).toBe(7);
      expect(deviceResult.count).toBe(10);

      await firstPage.goto(
        "/bureau/visualization/regional-education-overview?tenantId=bureau-001",
      );
      await firstPage.getByRole("button", { name: "切换至城市琥珀" }).click();
      await expect(firstPage.getByRole("button", { name: "切换至城市琥珀" }))
        .toHaveClass(/is-active/);
      await expect.poll(async () => {
        const { data, error } = await client
          .from("user_tenant_preferences")
          .select("visualization_theme_id")
          .eq("tenant_id", "bureau-001")
          .eq("auth_user_id", userId)
          .single();
        if (error) throw error;
        return data.visualization_theme_id;
      }).toBe("amber");

      await secondPage.goto(
        "/bureau/visualization/regional-education-overview?tenantId=bureau-001",
      );
      await expect(secondPage.getByRole("button", { name: "切换至城市琥珀" }))
        .toHaveClass(/is-active/);

      await secondPage.getByRole("button", { name: "用户 罗吴航" }).click();
      await expect(secondPage.getByRole("menuitem", { name: "修改密码" })).toBeVisible();
      await expect(secondPage.getByRole("menuitem", { name: "退出登录" })).toBeVisible();
    } finally {
      const { error } = await client
        .from("user_tenant_preferences")
        .update({ visualization_theme_id: initialPreference?.visualization_theme_id ?? null })
        .eq("tenant_id", "bureau-001")
        .eq("auth_user_id", userId);
      await Promise.all([firstContext.close(), secondContext.close()]);
      cleanupError = error;
    }
    if (cleanupError) throw cleanupError;
  });

  test("calendar events survive reloads with viewed and completed state", async ({ browser }) => {
    test.setTimeout(120_000);
    const { client, session } = await authenticatedSession();
    const firstContext = await browserWithSession(() => browser.newContext(), session);
    const firstPage = await firstContext.newPage();
    const title = `Supabase 日程-${Date.now()}`;
    let eventId = "";
    let cleanupError: Error | null = null;

    try {
      const { error: staleCleanupError } = await client
        .from("calendar_events")
        .delete()
        .eq("tenant_id", "bureau-001")
        .eq("auth_user_id", session.user.id)
        .like("title", "Supabase 日程-%");
      if (staleCleanupError) throw staleCleanupError;

      await firstPage.goto("/workbench");
      await switchToBureau(firstPage);
      const firstCalendar = firstPage.locator('[data-widget-key$=".calendar-tasks"]');
      await firstCalendar.getByRole("button", { name: "新增日程", exact: true }).click();
      await firstPage.getByPlaceholder("请输入日程名称").fill(title);
      await firstPage.getByRole("button", { name: "保存", exact: true }).click();

      await expect.poll(async () => {
        const { data, error } = await client
          .from("calendar_events")
          .select("id")
          .eq("tenant_id", "bureau-001")
          .eq("auth_user_id", session.user.id)
          .eq("title", title)
          .maybeSingle();
        if (error) throw error;
        eventId = data?.id ?? "";
        return eventId;
      }).not.toBe("");
      await revealCalendarEvent(firstCalendar, title);

      await firstPage.reload();
      await switchToBureau(firstPage);
      const reloadedCalendar = firstPage.locator('[data-widget-key$=".calendar-tasks"]');
      await revealCalendarEvent(reloadedCalendar, title);
      await expect(reloadedCalendar.getByText("已过期", { exact: true }).last()).toBeVisible();

      await reloadedCalendar.getByText(title, { exact: true }).click();
      await expect(firstPage.getByRole("dialog", { name: "编辑日程" })).toBeVisible();
      await expect.poll(async () => {
        const { data, error } = await client
          .from("calendar_events")
          .select("viewed_at")
          .eq("id", eventId)
          .single();
        if (error) throw error;
        return data.viewed_at;
      }).not.toBeNull();
      await firstPage.getByRole("button", { name: "关闭此对话框" }).click();

      const eventCard = reloadedCalendar.locator(".agenda-event-card", { hasText: title });
      await eventCard.hover();
      await eventCard.locator(".el-checkbox").click();
      await expect(eventCard.locator(".event-state")).toHaveText("已完成");
      await expect.poll(async () => {
        const { data, error } = await client
          .from("calendar_events")
          .select("status,completed_at")
          .eq("id", eventId)
          .single();
        if (error) throw error;
        return data;
      }).toMatchObject({ status: "completed", completed_at: expect.any(String) });
    } finally {
      if (eventId) {
        const { error } = await client.from("calendar_events").delete().eq("id", eventId);
        cleanupError = error;
      }
      await firstContext.close();
    }
    if (cleanupError) throw cleanupError;
  });

  test("AI conversations are isolated by authenticated user and browser writes are restricted", async () => {
    const { admin, client, session } = await authenticatedSession();
    const ownerUserId = session.user.id;
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    let otherUserId = "";
    const conversationIds: string[] = [];
    const cleanupErrors: Error[] = [];

    try {
      const { data: otherUserData, error: otherUserError } = await admin.auth.admin.createUser({
        email: `ai-history-${suffix}@example.com`,
        password: `Ai-History-${suffix}!`,
        email_confirm: true,
      });
      if (otherUserError) throw otherUserError;
      otherUserId = otherUserData.user.id;

      const { data: conversations, error: conversationError } = await admin
        .from("ai_conversations")
        .insert([
          {
            tenant_id: "school-001",
            auth_user_id: ownerUserId,
            title: `当前用户会话-${suffix}`,
          },
          {
            tenant_id: "school-001",
            auth_user_id: otherUserId,
            title: `其他用户会话-${suffix}`,
          },
        ])
        .select("id,auth_user_id");
      if (conversationError) throw conversationError;
      conversationIds.push(...conversations.map((conversation) => conversation.id));
      const ownConversation = conversations.find(
        (conversation) => conversation.auth_user_id === ownerUserId,
      );
      if (!ownConversation) throw new Error("AI conversation fixture was not created");

      const { error: messageError } = await admin.from("ai_messages").insert({
        conversation_id: ownConversation.id,
        tenant_id: "school-001",
        auth_user_id: ownerUserId,
        role: "assistant",
        status: "completed",
        content: "仅当前用户可见",
        model: "deepseek-chat",
      });
      if (messageError) throw messageError;

      const { data: visibleConversations, error: visibleConversationError } = await client
        .from("ai_conversations")
        .select("id,title,auth_user_id")
        .in("id", conversationIds);
      if (visibleConversationError) throw visibleConversationError;
      expect(visibleConversations).toEqual([
        expect.objectContaining({ id: ownConversation.id, auth_user_id: ownerUserId }),
      ]);

      const { data: visibleMessages, error: visibleMessageError } = await client
        .from("ai_messages")
        .select("content")
        .eq("conversation_id", ownConversation.id);
      if (visibleMessageError) throw visibleMessageError;
      expect(visibleMessages).toEqual([{ content: "仅当前用户可见" }]);

      const forbiddenInsert = await client.from("ai_conversations").insert({
        tenant_id: "school-001",
        auth_user_id: ownerUserId,
        title: "浏览器不应创建的会话",
      });
      expect(forbiddenInsert.error).not.toBeNull();
    } finally {
      if (conversationIds.length) {
        const { error } = await admin.from("ai_conversations").delete().in("id", conversationIds);
        if (error) cleanupErrors.push(error);
      }
      if (otherUserId) {
        const { error } = await admin.auth.admin.deleteUser(otherUserId);
        if (error) cleanupErrors.push(error);
      }
    }
    if (cleanupErrors.length) throw cleanupErrors[0];
  });

  test("an organization member email is linked to Auth and the user can change password", async ({ browser }) => {
    const { admin, client, session } = await authenticatedSession();
    const context = await browserWithSession(() => browser.newContext(), session);
    const page = await context.newPage();
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const tenantName = `邮箱绑定验证学校-${suffix}`;
    const memberEmail = `member-${suffix}@example.com`;
    const currentPassword = `Current-${suffix}!`;
    const newPassword = `Updated-${suffix}!`;
    let tenantId = "";
    let memberAuthUserId = "";
    let memberContext: BrowserContext | null = null;
    const cleanupErrors: Error[] = [];

    try {
      const { data: authUserData, error: authUserError } = await admin.auth.admin.createUser({
        email: memberEmail,
        password: currentPassword,
        email_confirm: true,
        user_metadata: { display_name: "邮箱绑定验证成员" },
      });
      if (authUserError) throw authUserError;
      memberAuthUserId = authUserData.user.id;

      await page.goto("/system/organization");
      await page.getByRole("button", { name: "新增组织" }).click();
      const tenantDialog = page.getByRole("dialog", { name: "新增组织" });
      await tenantDialog.getByRole("textbox", { name: /组织名称/ }).fill(tenantName);
      await tenantDialog.getByRole("textbox", { name: /简称/ }).fill("邮箱绑定验证");
      await tenantDialog.getByRole("button", { name: "保存", exact: true }).click();
      await expect(page.getByText("组织已保存", { exact: true })).toBeVisible();

      const { data: tenantData, error: tenantError } = await client
        .from("tenants")
        .select("id")
        .eq("name", tenantName)
        .single();
      if (tenantError) throw tenantError;
      tenantId = tenantData.id;

      await page
        .getByRole("row", { name: new RegExp(tenantName) })
        .getByRole("button", { name: "成员" })
        .click();
      await page.getByRole("button", { name: "新增成员" }).click();
      const memberDialog = page.locator(".el-dialog:visible");
      await memberDialog.locator('input[placeholder="请输入成员姓名"]').fill("邮箱绑定验证成员");
      await memberDialog
        .locator('input[placeholder="请输入已在 Supabase Auth 创建的邮箱"]')
        .fill(memberEmail.toUpperCase());
      await memberDialog.locator(".el-select").click();
      await page
        .locator(".el-select-dropdown:visible .el-select-dropdown__item")
        .filter({ hasText: "老师" })
        .first()
        .click();
      await memberDialog.getByRole("button", { name: "保存", exact: true }).click();
      await expect(page.getByText("成员已保存", { exact: true })).toBeVisible();

      const { data: memberData, error: memberError } = await client
        .from("tenant_members")
        .select("auth_user_id, account, name")
        .eq("tenant_id", tenantId)
        .eq("account", memberEmail)
        .single();
      if (memberError) throw memberError;
      expect(memberData).toEqual({
        auth_user_id: memberAuthUserId,
        account: memberEmail,
        name: "邮箱绑定验证成员",
      });

      memberContext = await browser.newContext();
      const memberPage = await memberContext.newPage();
      await memberPage.goto("/");
      await memberPage.getByPlaceholder("请输入登录邮箱").fill(memberEmail);
      await memberPage.getByPlaceholder("请输入密码").fill(currentPassword);
      await memberPage.getByRole("button", { name: "登录", exact: true }).click();
      await expect(memberPage).toHaveURL(/\/workbench$/);

      await memberPage.getByRole("button", { name: /邮箱绑定验证成员/ }).click();
      await memberPage.getByRole("menuitem", { name: "修改密码" }).click();
      const passwordDialog = memberPage.getByRole("dialog", { name: "修改密码" });
      await passwordDialog.getByPlaceholder("请输入当前密码").fill(currentPassword);
      await passwordDialog.getByPlaceholder("请输入至少 6 位新密码").fill(newPassword);
      await passwordDialog.getByRole("button", { name: "保存新密码" }).click();
      await expect(memberPage.getByText("密码修改成功", { exact: true })).toBeVisible();

      const passwordVerifier = createClient(
        environment("SUPABASE_URL"),
        environment("VITE_SUPABASE_PUBLISHABLE_KEY"),
        { auth: { persistSession: false } },
      );
      const oldPasswordResult = await passwordVerifier.auth.signInWithPassword({
        email: memberEmail,
        password: currentPassword,
      });
      expect(oldPasswordResult.error).not.toBeNull();
      const newPasswordResult = await passwordVerifier.auth.signInWithPassword({
        email: memberEmail,
        password: newPassword,
      });
      expect(newPasswordResult.error).toBeNull();
      expect(newPasswordResult.data.user?.id).toBe(memberAuthUserId);
    } finally {
      await memberContext?.close();
      if (tenantId) {
        const { error } = await client.from("tenants").delete().eq("id", tenantId);
        if (error) cleanupErrors.push(error);
      }
      if (memberAuthUserId) {
        const { error } = await admin.auth.admin.deleteUser(memberAuthUserId);
        if (error) cleanupErrors.push(error);
      }
      await context.close();
    }
    if (cleanupErrors.length) throw new AggregateError(cleanupErrors, "Supabase cleanup failed");
  });
});
