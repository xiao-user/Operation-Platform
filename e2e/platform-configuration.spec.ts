import { expect, test } from "@playwright/test";

test("新增组织后刷新页面仍然保留", async ({ page }) => {
  const organizationName = "端到端测试学校";

  await page.goto("/system/organization");
  await page.getByRole("button", { name: "新增组织" }).click();

  const dialog = page.getByRole("dialog", { name: "新增组织" });
  await dialog.getByRole("textbox", { name: /组织名称/ }).fill(organizationName);
  await dialog.getByRole("textbox", { name: /简称/ }).fill("E2E学校");
  await dialog.getByRole("button", { name: "保存", exact: true }).click();

  await expect(page.getByText("组织已保存", { exact: true })).toBeVisible();
  await expect(page.getByRole("row", { name: new RegExp(organizationName) })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("row", { name: new RegExp(organizationName) })).toBeVisible();
  await expect(page.getByText("共 7 个组织", { exact: true })).toBeVisible();
});

test("新增一级模块后刷新页面仍然保留", async ({ page }) => {
  const moduleName = "端到端测试模块";

  await page.goto("/system/menu-config");
  await page.getByRole("button", { name: "新增一级模块" }).click();

  const dialog = page.getByRole("dialog", { name: "新增菜单" });
  await dialog.getByRole("textbox", { name: /菜单名称/ }).fill(moduleName);
  await dialog.getByRole("button", { name: "确认保存" }).click();

  await expect(page.getByText("菜单已新增", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("treeitem").filter({ hasText: moduleName }),
  ).toBeVisible();

  await page.reload();
  await expect(
    page.getByRole("treeitem").filter({ hasText: moduleName }),
  ).toBeVisible();
  await expect(page.getByText("共 5 条业务菜单记录", { exact: true })).toBeVisible();
});
