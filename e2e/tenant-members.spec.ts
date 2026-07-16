import { expect, test, type Page } from "@playwright/test";

async function openTenantMembers(page: Page, tenantName: string) {
  await page
    .getByRole("row", { name: new RegExp(tenantName) })
    .getByRole("button", { name: "成员" })
    .click();
  await expect(page.getByText(`${tenantName} · 成员管理`, { exact: true })).toBeVisible();
}

async function ensureRoleOptions(page: Page, roleNames: string[]) {
  const roleSelect = page
    .locator(".el-dialog:visible .el-form-item", { hasText: "角色" })
    .locator(".el-select");

  for (const roleName of roleNames) {
    const selectedText = ((await roleSelect.textContent()) ?? "").replace(/\s+/g, "");
    if (selectedText.includes(roleName)) continue;

    if ((await page.locator(".el-select-dropdown:visible").count()) === 0) {
      await roleSelect.click();
    }
    await page
      .locator(".el-select-dropdown:visible .el-select-dropdown__item")
      .filter({ hasText: roleName })
      .first()
      .click();
  }
  await page.keyboard.press("Escape");
}

async function setRoleOptions(page: Page, roleNames: string[]) {
  const roleSelect = page
    .locator(".el-dialog:visible .el-form-item", { hasText: "角色" })
    .locator(".el-select");
  const expectedRoleNames = new Set(roleNames);

  if ((await page.locator(".el-select-dropdown:visible").count()) === 0) {
    await roleSelect.click();
  }
  const options = page.locator(".el-select-dropdown:visible .el-select-dropdown__item");
  await expect(options.first()).toBeVisible();
  const optionCount = await options.count();
  for (let index = 0; index < optionCount; index += 1) {
    const option = options.nth(index);
    const optionName = ((await option.textContent()) ?? "").replace(/\s+/g, "");
    const shouldSelect = expectedRoleNames.has(optionName);
    const isSelected = await option.evaluate((element) =>
      element.classList.contains("is-selected") ||
      element.getAttribute("aria-selected") === "true",
    );
    if (shouldSelect !== isSelected) await option.click();
  }
  await page.keyboard.press("Escape");
}

async function saveMemberDialog(page: Page) {
  await page
    .locator(".el-dialog:visible")
    .getByRole("button", { name: "保存", exact: true })
    .click();
}

async function expectMemberSaved(page: Page) {
  await expect(page.locator(".el-message__content", { hasText: "成员已保存" }).last()).toBeVisible();
}

async function expectHeaderRole(page: Page, roleName: string) {
  await expect(
    page.getByRole("banner").locator(".role-tag").filter({ hasText: roleName }).first(),
  ).toBeVisible();
}

test("组织成员抽屉支持新增多角色成员并保护最后管理员", async ({ page }) => {
  await page.goto("/system/organization");
  await openTenantMembers(page, "体育东路小学海明学校");

  const currentUserRow = page.getByRole("row", { name: /罗吾航/ });
  await currentUserRow.locator(".el-switch").click();
  await expect(page.getByText("至少保留一个启用管理员成员", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "新增成员" }).click();
  const dialog = page.locator(".el-dialog:visible");
  await dialog.locator('input[placeholder="请输入成员姓名"]').fill("端到端多角色成员");
  await dialog.locator('input[placeholder="用于本地 demo 的账号标识"]').fill("e2e-member");
  await dialog.locator('input[placeholder="请输入手机号"]').fill("13900000000");
  await dialog.locator('input[placeholder="例如：教务主任、审核员"]').fill("教务协同");
  await ensureRoleOptions(page, ["管理员", "老师"]);
  await saveMemberDialog(page);

  await expectMemberSaved(page);
  const newMemberRow = page.getByRole("row", { name: /端到端多角色成员/ });
  await expect(newMemberRow).toContainText("管理员");
  await expect(newMemberRow).toContainText("老师");
});

test("当前用户成员角色变更后 Header 与工作台按新角色生效", async ({ page }) => {
  await page.goto("/system/organization");
  await openTenantMembers(page, "体育东路小学海明学校");

  await page.getByRole("button", { name: "新增成员" }).click();
  const createDialog = page.locator(".el-dialog:visible");
  await createDialog.locator('input[placeholder="请输入成员姓名"]').fill("备用管理员");
  await createDialog.locator('input[placeholder="用于本地 demo 的账号标识"]').fill("backup-admin");
  await ensureRoleOptions(page, ["管理员"]);
  await saveMemberDialog(page);
  await expectMemberSaved(page);

  await page.getByRole("row", { name: /罗吾航/ }).getByRole("button", { name: "编辑" }).click();
  await ensureRoleOptions(page, ["管理员", "老师"]);
  await saveMemberDialog(page);
  await expectMemberSaved(page);
  await expect(page.locator(".el-dialog:visible")).toHaveCount(0);
  await page.locator(".el-drawer__close-btn").click();
  await expect(page.getByText("体育东路小学海明学校 · 成员管理", { exact: true })).toBeHidden();

  await page.getByRole("button", { name: "运营平台 运营平台" }).click();
  await page.getByRole("menuitem", { name: "体育东路小学海明学校", exact: true }).click();

  await expect(page).toHaveURL(/\/workbench$/);
  await expectHeaderRole(page, "管理员");
  await expect(page.getByRole("heading", { name: "在校学生" })).toBeVisible();
  await expect(page.locator(".grid-stack-item")).toHaveCount(9);

  await page.getByRole("button", { name: "切换当前角色" }).click();
  await page.getByRole("menuitem", { name: "老师", exact: true }).click();

  await expectHeaderRole(page, "老师");
  await expect(page.getByRole("heading", { name: "今日课程" })).toBeVisible();
  await expect(page.locator(".grid-stack-item")).toHaveCount(7);

  await page.reload();
  await expectHeaderRole(page, "老师");
  await expect(page.getByRole("heading", { name: "今日课程" })).toBeVisible();
});

test("当前用户失去管理员角色后立即离开系统管理页", async ({ page }) => {
  await page.goto("/system/organization");
  await openTenantMembers(page, "运营平台");

  await page.getByRole("button", { name: "新增成员" }).click();
  const createDialog = page.locator(".el-dialog:visible");
  await createDialog.locator('input[placeholder="请输入成员姓名"]').fill("平台备用管理员");
  await createDialog.locator('input[placeholder="用于本地 demo 的账号标识"]').fill("platform-backup-admin");
  await ensureRoleOptions(page, ["管理员"]);
  await saveMemberDialog(page);
  await expectMemberSaved(page);

  await page.getByRole("row", { name: /罗吾航/ }).getByRole("button", { name: "编辑" }).click();
  await setRoleOptions(page, ["职员"]);
  await saveMemberDialog(page);
  await expectMemberSaved(page);

  await expect(page).toHaveURL(/\/workbench$/);
  await expectHeaderRole(page, "职员");
  await expect(page.getByRole("heading", { name: "个人待办" })).toBeVisible();
});

test("删除组织后同步清理该组织成员数据", async ({ page }) => {
  const organizationName = "端到端待删除学校";

  await page.goto("/system/organization");
  await page.getByRole("button", { name: "新增组织" }).click();
  const dialog = page.getByRole("dialog", { name: "新增组织" });
  await dialog.getByRole("textbox", { name: /组织名称/ }).fill(organizationName);
  await dialog.getByRole("textbox", { name: /简称/ }).fill("待删学校");
  await dialog.getByRole("button", { name: "保存", exact: true }).click();
  await expect(page.getByText("组织已保存", { exact: true })).toBeVisible();

  const tenantId = await page.evaluate((name) => {
    const tenants = JSON.parse(
      localStorage.getItem("operation-platform:tenants:v1") ?? "[]",
    ) as Array<{ id: string; name: string }>;
    return tenants.find((tenant) => tenant.name === name)?.id ?? "";
  }, organizationName);
  expect(tenantId).toBeTruthy();
  await expect.poll(async () =>
    page.evaluate((id) =>
      localStorage.getItem(`operation-platform:tenant-members:v1:${id}`),
    tenantId),
  ).not.toBeNull();

  await page
    .getByRole("row", { name: new RegExp(organizationName) })
    .getByRole("button", { name: "删除" })
    .click();
  await page
    .getByRole("dialog", { name: "删除组织" })
    .getByRole("button", { name: "删除", exact: true })
    .click();
  await expect(page.getByText("组织已删除", { exact: true })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("row", { name: new RegExp(organizationName) })).toHaveCount(0);
  expect(
    await page.evaluate((id) =>
      localStorage.getItem(`operation-platform:tenant-members:v1:${id}`),
    tenantId),
  ).toBeNull();
});
