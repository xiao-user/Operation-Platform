import { expect, test, type Page } from "@playwright/test";

async function switchTenant(page: Page, tenantName: string) {
  await page.getByRole("button", { name: /体育东路小学海明学校|天河区第二实验小学/ }).click();
  await page.getByRole("menuitem", { name: tenantName, exact: true }).click();
}

test("按租户角色切换管理型与业务型固定组件清单", async ({ page }) => {
  await page.goto("/workbench");

  await expect(page.getByRole("heading", { name: "在校学生" })).toBeVisible();
  await expect(page.locator(".grid-stack-item")).toHaveCount(9);
  await expect(page.getByRole("banner").getByText("管理员", { exact: true })).toBeVisible();

  await switchTenant(page, "天河区第二实验小学");

  await expect(page.getByRole("button", { name: "学校 天河区第二实验小学" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "今日课程" })).toBeVisible();
  await expect(page.locator(".grid-stack-item")).toHaveCount(7);
  await expect(page.getByRole("banner").getByText("老师", { exact: true })).toBeVisible();
});

test("隐藏不会删除组件并在保存刷新后保持，重新显示后仍为完整清单", async ({ page }) => {
  await page.goto("/workbench");
  await page.getByRole("button", { name: "调整工作台" }).click();
  await page.getByRole("button", { name: /组件管理/ }).click();

  for (const title of ["在校学生", "今日到校率", "待审批"]) {
    await page.locator(".manager-item", { hasText: title }).locator(".el-switch").click();
  }
  await expect(page.getByText("显示 6/9", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "完成", exact: true }).click();
  await page.getByRole("button", { name: "保存", exact: true }).click();
  await expect(page.getByText("工作台布局已保存", { exact: true })).toBeVisible();

  await page.reload();
  await expect(page.locator(".grid-stack-item")).toHaveCount(6);

  await page.getByRole("button", { name: "调整工作台" }).click();
  await page.getByRole("button", { name: /组件管理/ }).click();
  await expect(page.getByRole("switch")).toHaveCount(9);
  await expect(page.getByText("显示 6/9", { exact: true })).toBeVisible();
  for (const title of ["在校学生", "今日到校率", "待审批"]) {
    await page.locator(".manager-item", { hasText: title }).locator(".el-switch").click();
  }
  await page.getByRole("button", { name: "完成", exact: true }).click();
  await page.getByRole("button", { name: "保存", exact: true }).click();
  await page.reload();

  await expect(page.locator(".grid-stack-item")).toHaveCount(9);
});

test("真实拖拽与缩放只修改草稿，取消后恢复保存前布局", async ({ page }) => {
  await page.goto("/workbench");
  await page.getByRole("button", { name: "调整工作台" }).click();

  const trend = page.locator('[data-widget-key="school.admin.attendance-trend"]');
  const resizeHandle = trend.locator(".ui-resizable-se");
  await resizeHandle.scrollIntoViewIfNeeded();
  const resizeBox = await resizeHandle.boundingBox();
  if (!resizeBox) throw new Error("缩放柄不可见");
  const originalWidth = await trend.getAttribute("gs-w");
  await page.mouse.move(
    resizeBox.x + resizeBox.width / 2,
    resizeBox.y + resizeBox.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    resizeBox.x + resizeBox.width / 2 + 320,
    resizeBox.y + resizeBox.height / 2 + 100,
    { steps: 16 },
  );
  await page.mouse.up();
  await expect(trend).not.toHaveAttribute("gs-w", originalWidth ?? "8");

  const originalY = await trend.getAttribute("gs-y");
  const handle = trend.locator(".widget-drag-handle");
  await handle.scrollIntoViewIfNeeded();
  const handleBox = await handle.boundingBox();
  if (!handleBox) throw new Error("拖拽柄不可见");
  await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + 12);
  await page.mouse.down();
  await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + 260, { steps: 12 });
  await page.mouse.up();
  await expect(trend).not.toHaveAttribute("gs-y", originalY ?? "2");

  await page.getByRole("button", { name: "取消", exact: true }).click();
  await page.getByRole("button", { name: "放弃修改", exact: true }).click();

  const restored = page.locator('[data-widget-key="school.admin.attendance-trend"]');
  await expect(restored).toHaveAttribute("gs-x", "0");
  await expect(restored).toHaveAttribute("gs-y", "2");
  await expect(restored).toHaveAttribute("gs-w", "8");
});

test("手机端按单列只读展示", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/workbench");

  await expect(page.getByRole("button", { name: "调整工作台" })).toBeDisabled();
  await expect(page.locator(".grid-stack-item")).toHaveCount(9);
  await expect(page.locator(".ui-resizable-handle:visible")).toHaveCount(0);

  const boxes = await page.locator(".grid-stack-item").evaluateAll((items) =>
    items.map((item) => {
      const rect = item.getBoundingClientRect();
      return { x: Math.round(rect.x), width: Math.round(rect.width) };
    }),
  );
  expect(new Set(boxes.map((box) => box.x)).size).toBe(1);
  expect(Math.max(...boxes.map((box) => box.width)) - Math.min(...boxes.map((box) => box.width))).toBeLessThanOrEqual(1);
});

test("业务工作台快捷入口只使用当前角色获权菜单", async ({ page }) => {
  await page.goto("/workbench");
  await switchTenant(page, "天河区第二实验小学");

  const permitted = await page.evaluate(() => {
    const key = "operation-platform:tenant-configuration:v1:school-002";
    const configuration = JSON.parse(localStorage.getItem(key)!) as {
      menuRecords: Array<{ id: string; name: string; type: string }>;
      roles: Array<{ id: string; menuIds: string[] }>;
    };
    const leaves = configuration.menuRecords.filter(
      (record) => record.type === "page" || record.type === "external",
    );
    const teacher = configuration.roles.find((role) => role.id === "teacher")!;
    teacher.menuIds = [leaves[0]!.id];
    localStorage.setItem(key, JSON.stringify(configuration));
    return { allowedName: leaves[0]!.name, deniedName: leaves[1]!.name };
  });

  await page.reload();
  await switchTenant(page, "天河区第二实验小学");
  const quickLinks = page.locator('[data-widget-key="school.business.quick-links"]');

  await expect(quickLinks.getByRole("link", { name: new RegExp(permitted.allowedName) })).toBeVisible();
  await expect(quickLinks.getByText(permitted.deniedName, { exact: true })).toHaveCount(0);
});
