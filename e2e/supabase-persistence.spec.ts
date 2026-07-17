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
  return { admin, client, session: data.session };
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

test.describe("Supabase persistence", () => {
  test.describe.configure({ mode: "serial" });

  test.skip(
    process.env.SUPABASE_E2E !== "1" || requiredEnvironment.some((name) => !process.env[name]?.trim()),
    "Run through npm run test:e2e:supabase after loading .env.local",
  );

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
