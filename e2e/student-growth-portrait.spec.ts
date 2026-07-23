import { expect, test, type Locator, type Page } from "@playwright/test";

async function switchToBureauTenant(page: Page) {
  await page.goto("/workbench");
  await page
    .getByRole("button", { name: /体育东路小学海明学校|天河区第二实验小学/ })
    .click();
  await page.getByRole("menuitem", { name: "体验区教育局", exact: true }).click();
}

async function expectStandardTable(table: Locator) {
  await expect(table).toBeVisible();
  await expect(table).toHaveClass(/el-table--border/);
  await expect(table).toHaveClass(/el-table--striped/);
}

test("学生成长画像表格统一样式并按业务决定分页", async ({ page }) => {
  await switchToBureauTenant(page);
  await page.goto("/bureau/education-governance/student-growth-portrait");

  const topicNavigation = page.getByRole("navigation", { name: "学生成长画像专题" });
  await expect(topicNavigation).toHaveCSS("position", "sticky");
  await expect(topicNavigation).toHaveCSS("top", "0px");
  const topicNavigationHeight = await topicNavigation.evaluate((element) => {
    const view = element.ownerDocument.defaultView!;
    const rootStyle = view.getComputedStyle(element.ownerDocument.documentElement);
    const style = view.getComputedStyle(element);
    return {
      minHeight: Number.parseFloat(style.minHeight),
      maxHeight: Number.parseFloat(style.maxHeight),
      viewportHeight: view.innerHeight,
      headerHeight: Number.parseFloat(rootStyle.getPropertyValue("--header-height")),
      contentPadding: Number.parseFloat(rootStyle.getPropertyValue("--content-padding")),
    };
  });
  expect(topicNavigationHeight.minHeight).toBe(topicNavigationHeight.maxHeight);
  expect(topicNavigationHeight.minHeight).toBe(
    topicNavigationHeight.viewportHeight
      - topicNavigationHeight.headerHeight
      - topicNavigationHeight.contentPadding * 2,
  );
  await expect(page.getByRole("button", { name: "更多筛选" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "查询" })).toBeVisible();
  await expect(page.getByRole("button", { name: "重置" })).toBeVisible();
  await expect(page.getByRole("button", { name: "数据说明" })).toBeVisible();
  await expect(page.getByRole("combobox", { name: "年级" })).toBeVisible();
  await expect(page.getByRole("combobox", { name: "学段" })).toBeVisible();
  await expect(page.getByRole("combobox", { name: "教育阶段" })).toHaveCount(0);
  await expect(page.getByRole("combobox", { name: "镇街" })).toHaveCount(0);
  await expect(page.getByRole("combobox", { name: "数据状态" })).toHaveCount(0);
  await expect(page.getByText("综合发展指数", { exact: true })).toHaveCount(0);
  await expect(page.getByText("进步质量指数", { exact: true })).toHaveCount(0);

  const overviewSegmented = page.locator(".student-growth-portrait__view-switch .el-segmented");
  await expect(overviewSegmented).toHaveCSS("border-radius", "4px");

  await page.getByText("学校差异", { exact: true }).click();
  const schoolComparison = page.getByLabel("学校发展差异比较");
  await expectStandardTable(schoolComparison.locator(".el-table"));
  const schoolPagination = schoolComparison.locator(".el-pagination");
  await expect(schoolComparison.getByText("数据完整度", { exact: true })).toHaveCount(0);
  await expect(schoolPagination).toBeVisible();
  await expect(schoolPagination).toContainText("共 12 条");
  await expect(schoolPagination.locator(".el-pagination__sizes")).toBeVisible();
  await expect(schoolPagination.locator(".el-pagination__jump")).toBeVisible();

  await page.getByText("趋势与跟进", { exact: true }).click();
  const followUp = page.getByLabel("区域发展趋势与跟进");
  await expectStandardTable(followUp.locator(".el-table"));
  await expect(followUp.locator(".el-pagination")).toHaveCount(0);
  await expect(followUp.getByText("建议动作", { exact: true })).toHaveCount(0);
  const trendExplanation = followUp.getByRole("button", { name: "查看区域发展趋势说明" });
  await trendExplanation.hover();
  await expect(page.getByRole("tooltip")).toContainText("五育均衡指数 79.6");
  const contentOverflow = await page.locator(".student-growth-portrait__content").evaluate(
    (element) => element.scrollWidth - element.clientWidth,
  );
  expect(contentOverflow).toBeLessThanOrEqual(1);

  await page.getByRole("menuitem", { name: "五育评价", exact: true }).click();
  const topic = page.getByLabel("五育评价专题分析");
  await expectStandardTable(topic.locator(".el-table"));
  await expect(topic.locator(".el-pagination")).toHaveCount(0);
  await expect(topic.locator(".topic-analysis__header")).toHaveCount(0);
  const topicExplanation = topic.getByRole("button", { name: "查看五育发展结构说明" });
  await topicExplanation.hover();
  await expect(page.getByRole("tooltip")).toContainText("体育与智育表现稳定");

  await page.getByRole("menuitem", { name: /心理健康/ }).click();
  const mentalHealth = page.getByLabel("心理健康模块规划占位");
  await expectStandardTable(mentalHealth.locator(".el-table"));
  await expect(mentalHealth.locator(".el-pagination")).toHaveCount(0);
});
