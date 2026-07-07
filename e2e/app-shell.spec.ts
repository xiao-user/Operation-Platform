import { expect, test } from "@playwright/test";

test("首次进入工作台并打开业务模块", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveURL(/\/workbench$/);
  await expect(
    page.getByRole("button", { name: "学校 体育东路小学海明学校" }),
  ).toBeVisible();
  await expect(page.getByRole("banner").getByText("管理员", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "调整工作台" })).toBeVisible();

  await page
    .getByRole("navigation")
    .getByRole("link", { name: "平安校园", exact: true })
    .click();

  await expect(page).toHaveURL(/\/developing\/[^/]+$/);
  await expect(page.getByRole("button", { name: "平安校园", exact: true })).toBeVisible();
  await expect(page.getByText(/开发中\.\.\.$/)).toBeVisible();
});

test("访问系统页面时自动进入运营平台租户", async ({ page }) => {
  await page.goto("/system/organization");

  await expect(page).toHaveURL(/\/system\/organization$/);
  await expect(page.getByRole("button", { name: "运营平台 运营平台" })).toBeVisible();
  await expect(page.getByRole("row", { name: /platform-001/ })).toBeVisible();
  await expect(page.getByText("共 6 个组织", { exact: true })).toBeVisible();
});
