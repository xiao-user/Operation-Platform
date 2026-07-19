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

test("刷新后恢复用户最后切换的机构", async ({ page }) => {
  await page.goto("/workbench");
  await switchTenant(page, "天河区第二实验小学");

  await page.reload();

  await expect(page.getByRole("button", { name: "学校 天河区第二实验小学" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "今日课程" })).toBeVisible();
});

test("教育局工作台展示门户与区域资源组件", async ({ page }) => {
  await page.goto("/workbench");
  await switchTenant(page, "体验区教育局");

  await expect(page.getByRole("button", { name: "教育局 体验区教育局" })).toBeVisible();
  await expect(page.locator(".grid-stack-item")).toHaveCount(20);
  for (const title of [
    "快捷应用入口",
    "局内新闻",
    "信息公开",
    "教学应用排行榜",
    "消息与待办中心",
    "日程与任务管理",
    "个人成长与发展",
    "我的订阅",
    "通知公告",
    "年级应用情况",
    "应用类型分布",
    "区域活跃度排名",
    "资源应用情况",
    "资源增长趋势",
    "资源贡献分布",
    "学科资源统计",
    "资源使用排行",
  ]) {
    await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
  }
});

test("教育局日程、待办和门户信息支持真实操作", async ({ page }) => {
  await page.goto("/workbench");
  await switchTenant(page, "体验区教育局");

  const calendar = page.locator('[data-widget-key="bureau.business.calendar-tasks"]');
  await calendar.getByRole("button", { name: "新增日程", exact: true }).click();
  await page.getByPlaceholder("请输入日程名称").fill("区级项目进度确认");
  await page.getByRole("button", { name: "保存", exact: true }).click();
  await expect(calendar.getByText("区级项目进度确认", { exact: true })).toBeVisible();

  const currentMonth = await calendar.locator(".calendar-period strong").textContent();
  await calendar.getByRole("button", { name: "下个月", exact: true }).click();
  await expect(calendar.locator(".calendar-period strong")).not.toHaveText(currentMonth ?? "");
  await calendar.getByRole("button", { name: "今日", exact: true }).click();

  const tasks = page.locator('[data-widget-key="bureau.business.message-todo-center"]');
  await tasks.locator(".el-checkbox").first().click();
  await tasks.getByRole("tab", { name: "已完成", exact: true }).click();
  await expect(tasks.getByText("复核星辰艺术机构资质", { exact: true })).toBeVisible();

  const news = page.locator('[data-widget-key="bureau.business.bureau-news"]');
  await news.getByRole("tab", { name: "重点工作", exact: true }).click();
  await news.getByText("暑期校园安全专项检查工作启动", { exact: true }).click();
  await expect(page.getByRole("dialog", { name: "内容详情" })).toContainText("专项检查覆盖消防");
  await page.getByRole("button", { name: "关闭此对话框" }).click();

  const ranking = page.locator('[data-widget-key="bureau.business.teaching-app-ranking"]');
  await ranking.getByRole("tab", { name: "近 7 天", exact: true }).click();
  await expect(ranking).toContainText("4.80 万次");

  const subscriptions = page.locator('[data-widget-key="bureau.business.subscriptions"]');
  await subscriptions.locator(".el-switch").nth(3).click();
  await expect(subscriptions.getByRole("switch", { name: "取消订阅教师发展与教研资讯" })).toBeChecked();

  const quickApps = page.locator('[data-widget-key="bureau.business.quick-apps"]');
  const activeTab = quickApps.getByRole("tab", { name: "协同管理", exact: true });
  await activeTab.click();
  const tabBounds = await Promise.all([
    quickApps.locator(".secondary-tabs-viewport").evaluate((element) => {
      const bounds = element.getBoundingClientRect();
      return { top: bounds.top, right: bounds.right, bottom: bounds.bottom, left: bounds.left };
    }),
    activeTab.evaluate((element) => {
      const bounds = element.getBoundingClientRect();
      return { top: bounds.top, right: bounds.right, bottom: bounds.bottom, left: bounds.left };
    }),
  ]);
  expect(tabBounds[1].top).toBeGreaterThanOrEqual(tabBounds[0].top);
  expect(tabBounds[1].bottom).toBeLessThanOrEqual(tabBounds[0].bottom);

  const constrainedViewportHeight = await quickApps.evaluate((element) => {
    const viewport = element.querySelector(".secondary-tabs-viewport");
    if (!viewport) throw new Error("Secondary tabs viewport not found");
    element.style.height = "24px";
    return viewport.getBoundingClientRect().height;
  });
  expect(constrainedViewportHeight).toBe(36);
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

  await page.getByRole("button", { name: "取消", exact: true }).click();
  await page.getByRole("button", { name: "放弃修改", exact: true }).click();

  const restored = page.locator('[data-widget-key="school.admin.attendance-trend"]');
  await expect(restored).toHaveAttribute("gs-x", "0");
  await expect(restored).toHaveAttribute("gs-y", "2");
  await expect(restored).toHaveAttribute("gs-w", "8");
});

test("新版工作台按顺序流拖拽并独立保存组件宽度", async ({ page }) => {
  await page.goto("/workbench");
  await page.getByRole("button", { name: "切换为新版" }).click();

  await expect(page.getByText("新版工作台", { exact: true })).toBeVisible();
  await expect(page.locator(".simple-grid-item")).toHaveCount(9);
  await expect(page.locator(".grid-stack-item")).toHaveCount(0);
  const pairedHeights = await page.locator(".simple-grid-item").evaluateAll((items) =>
    items.slice(0, 2).map((item) => Math.round(item.getBoundingClientRect().height)),
  );
  expect(new Set(pairedHeights).size).toBe(1);

  await page.getByRole("button", { name: "调整工作台" }).click();
  const first = page.locator(".simple-grid-item").first();
  const second = page.locator(".simple-grid-item").nth(1);
  const firstKey = await first.getAttribute("data-widget-key");
  const secondKey = await second.getAttribute("data-widget-key");
  if (!firstKey || !secondKey) throw new Error("新版工作台组件标识缺失");

  const secondBox = await second.boundingBox();
  if (!secondBox) throw new Error("顺序流拖拽目标不可见");
  await first.locator(".widget-drag-handle").dragTo(second, {
    targetPosition: { x: secondBox.width / 2, y: secondBox.height * 0.75 },
  });
  await expect(page.locator(".simple-grid-item").nth(1)).toHaveAttribute("data-widget-key", firstKey);

  const moved = page.locator(`[data-widget-key="${firstKey}"]`);
  await moved.getByRole("button", { name: "组件操作" }).click();
  await page.getByRole("menuitem", { name: "整行 · 单列" }).click();
  await expect(moved).toHaveAttribute("data-widget-span", "6");

  const cardHeight = await moved.locator(".workbench-widget").evaluate((element) => ({
    card: Math.round(element.getBoundingClientRect().height),
    content: Math.round(element.scrollHeight),
  }));
  expect(cardHeight.card).toBeGreaterThanOrEqual(cardHeight.content);

  await page.getByRole("button", { name: "保存", exact: true }).click();
  await page.reload();
  await expect(page.getByText("新版工作台", { exact: true })).toBeVisible();
  await expect(page.locator(`[data-widget-key="${firstKey}"]`)).toHaveAttribute("data-widget-span", "6");
  await expect(page.locator(".simple-grid-item").nth(1)).toHaveAttribute("data-widget-key", firstKey);

  await page.getByRole("button", { name: "回到经典版" }).click();
  await expect(page.locator(".grid-stack-item")).toHaveCount(9);
  await expect(page.locator(`[data-widget-key="${firstKey}"]`)).toHaveAttribute("gs-w", "3");
});

test("新版双列瀑布独立排布并支持跨列拖拽", async ({ page }) => {
  await page.goto("/workbench");
  await page.getByRole("button", { name: "切换为新版" }).click();
  await page.getByRole("button", { name: "调整工作台" }).click();
  await page.getByText("分两列", { exact: true }).click();
  await page.getByText("6 : 2", { exact: true }).click();
  await expect(page.locator('input[type="radio"][value="columns"]')).toBeChecked();
  await expect(page.locator('input[type="radio"][value="6:2"]')).toBeChecked();

  const primary = page.getByRole("region", { name: "主列" });
  const secondary = page.getByRole("region", { name: "辅列" });
  const columnBottoms = await page.locator(".simple-column").evaluateAll((columns) =>
    columns.map((column) => Math.round(column.getBoundingClientRect().bottom)),
  );
  expect(Math.abs(columnBottoms[0]! - columnBottoms[1]!)).toBeLessThanOrEqual(1);

  const secondaryTail = secondary.locator(".column-tail-drop");
  await secondaryTail.scrollIntoViewIfNeeded();
  expect(await page.locator(".app-content").evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  const appendSource = primary.locator(".column-item").last();
  const appendSourceKey = await appendSource.getAttribute("data-widget-key");
  if (!appendSourceKey) throw new Error("末尾拖拽组件标识缺失");
  await appendSource.locator(".widget-drag-handle").dragTo(secondaryTail);
  await expect(secondary.locator(".column-item").last()).toHaveAttribute(
    "data-widget-key",
    appendSourceKey,
  );
  await page.locator(".app-content").evaluate((element) => { element.scrollTop = 0; });

  const source = primary.locator(".column-item").first();
  const target = secondary.locator(".column-item").first();
  const sourceKey = await source.getAttribute("data-widget-key");
  if (!sourceKey) throw new Error("主列组件标识缺失");

  const sourceHeight = Math.round((await source.boundingBox())?.height ?? 0);
  const targetBox = await target.boundingBox();
  if (!targetBox) throw new Error("跨列拖拽目标不可见");
  const dataTransfer = await page.evaluateHandle("new DataTransfer()");
  const sourceHandle = source.locator(".widget-drag-handle");
  await sourceHandle.dispatchEvent("dragstart", { dataTransfer });
  await target.dispatchEvent("dragover", {
    dataTransfer,
    clientX: targetBox.x + targetBox.width / 2,
    clientY: targetBox.y + targetBox.height * 0.75,
  });
  const placeholder = secondary.locator(".drag-placeholder");
  await expect(placeholder).toBeVisible();
  expect(Math.round((await placeholder.boundingBox())?.height ?? 0)).toBe(sourceHeight);
  await placeholder.dispatchEvent("drop", { dataTransfer });
  await sourceHandle.dispatchEvent("dragend", { dataTransfer });
  await expect(secondary.locator(`[data-widget-key="${sourceKey}"]`)).toHaveAttribute(
    "data-widget-column",
    "secondary",
  );

  await page.getByRole("button", { name: "保存", exact: true }).click();
  await page.reload();
  await expect(page.getByText("双列瀑布 · 6:2", { exact: true })).toBeVisible();

  const columnWidths = await page.locator(".simple-column").evaluateAll((columns) =>
    columns.map((column) => column.getBoundingClientRect().width),
  );
  expect(columnWidths[0]! / columnWidths[1]!).toBeGreaterThan(2.8);
  expect(columnWidths[0]! / columnWidths[1]!).toBeLessThan(3.2);
  await expect(secondary.locator(`[data-widget-key="${sourceKey}"]`)).toBeVisible();
});

test("完整流式拖拽会自动适配目标位置的整行或半行宽度", async ({ page }) => {
  await page.goto("/workbench");
  await page.getByRole("button", { name: "切换为新版" }).click();
  await page.getByRole("button", { name: "调整工作台" }).click();

  const full = page.locator('.flow-item[data-widget-span="6"]').first();
  const half = page.locator('.flow-item[data-widget-span="3"]').first();
  const fullKey = await full.getAttribute("data-widget-key");
  if (!fullKey) throw new Error("整行组件标识缺失");
  await full.locator(".widget-drag-handle").dragTo(half.locator(".widget-drag-handle"));
  await expect(page.locator(`[data-widget-key="${fullKey}"]`)).toHaveAttribute(
    "data-widget-span",
    "3",
  );
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

test("教育局资源组件在手机端保持单列且图表可见", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/workbench");
  await switchTenant(page, "体验区教育局");
  await page.setViewportSize({ width: 390, height: 844 });

  const widgets = page.locator(".grid-stack-item");
  await expect(widgets).toHaveCount(20);
  const boxes = await widgets.evaluateAll((items) => items.map((item) => {
    const box = item.getBoundingClientRect();
    return { x: box.x, width: box.width };
  }));
  expect(Math.max(...boxes.map((box) => box.x)) - Math.min(...boxes.map((box) => box.x))).toBeLessThanOrEqual(1);
  expect(Math.max(...boxes.map((box) => box.width)) - Math.min(...boxes.map((box) => box.width))).toBeLessThanOrEqual(1);

  const gradeChart = page.locator('[data-widget-key="bureau.business.grade-applications"] canvas');
  await gradeChart.scrollIntoViewIfNeeded();
  await expect(gradeChart).toBeVisible();
  const workbenchWidth = await page.locator(".workbench-page").evaluate((element) => ({
    client: element.clientWidth,
    scroll: element.scrollWidth,
  }));
  expect(workbenchWidth.scroll - workbenchWidth.client).toBeLessThanOrEqual(6);
});

test("宽度切换时紧凑重排且恢复桌面布局", async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1000 });
  await page.goto("/workbench");

  const metrics = page.locator([
    '[data-widget-key="school.admin.student-count"]',
    '[data-widget-key="school.admin.arrival-rate"]',
    '[data-widget-key="school.admin.pending-approvals"]',
    '[data-widget-key="school.admin.device-online-rate"]',
  ].join(", "));
  await expect(metrics).toHaveCount(4);

  await page.setViewportSize({ width: 1100, height: 1000 });
  await expect
    .poll(() => metrics.evaluateAll((items) => items.map((item) => item.getAttribute("gs-y"))))
    .toEqual(["0", "0", "2", "2"]);
  expect(await metrics.evaluateAll((items) => items.map((item) => item.getAttribute("gs-x"))))
    .toEqual(["0", "3", "0", "3"]);

  const primaryPanel = page.locator('[data-widget-key="school.admin.attendance-trend"]');
  await expect(primaryPanel).toHaveAttribute("gs-w", "6");
  const secondaryPanels = page.locator([
    '[data-widget-key="school.admin.operational-alerts"]',
    '[data-widget-key="school.admin.notices"]',
    '[data-widget-key="school.admin.student-distribution"]',
    '[data-widget-key="school.admin.quick-links"]',
  ].join(", "));
  expect(await secondaryPanels.evaluateAll((items) =>
    items.map((item) => ({
      x: item.getAttribute("gs-x"),
      w: item.getAttribute("gs-w"),
    })),
  )).toEqual([
    { x: "0", w: "3" },
    { x: "3", w: "3" },
    { x: "0", w: "3" },
    { x: "3", w: "3" },
  ]);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(() => metrics.evaluateAll((items) => items.map((item) => item.getAttribute("gs-x"))))
    .toEqual(["0", "0", "0", "0"]);

  await page.setViewportSize({ width: 1920, height: 1000 });
  await expect
    .poll(() => metrics.evaluateAll((items) => items.map((item) => item.getAttribute("gs-x"))))
    .toEqual(["0", "3", "6", "9"]);
  expect(await metrics.evaluateAll((items) => items.map((item) => item.getAttribute("gs-y"))))
    .toEqual(["0", "0", "0", "0"]);
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
