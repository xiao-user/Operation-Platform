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

test("二次确认弹窗保持居中卡片布局", async ({ page }) => {
  await page.goto("/system/organization");

  const schoolRow = page.getByRole("row", { name: /school-001/ });
  await schoolRow.getByRole("button", { name: "删除" }).click();

  const messageBox = page.locator(".el-message-box");
  await expect(messageBox).toBeVisible();
  await expect(messageBox).toHaveCSS("position", "relative");
  await expect(messageBox).toHaveCSS("background-color", "rgb(255, 255, 255)");
  await expect(messageBox.getByText("删除组织", { exact: true })).toBeVisible();

  const viewport = page.viewportSize()!;
  const bounds = (await messageBox.boundingBox())!;
  expect(bounds.width).toBeGreaterThanOrEqual(400);
  expect(bounds.width).toBeLessThanOrEqual(500);
  expect(Math.abs(bounds.x + bounds.width / 2 - viewport.width / 2)).toBeLessThan(2);

  await messageBox.getByRole("button", { name: "取消" }).click();
  await expect(messageBox).toBeHidden();
});

test("区域教育总览从教育局菜单打开独立数字孪生首页", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto("/");

  await page.getByRole("button", { name: /学校 体育东路小学海明学校/ }).click();
  await page.getByRole("menuitem", { name: "体验区教育局", exact: true }).click();

  await page
    .getByRole("navigation")
    .getByRole("link", { name: "智慧大脑", exact: true })
    .click();
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "数据驾驶舱", exact: true })
    .click();

  const newTabPromise = page.waitForEvent("popup");
  await page.getByRole("link", { name: "区域教育总览", exact: true }).click();
  const overviewPage = await newTabPromise;
  await overviewPage.waitForLoadState("domcontentloaded");

  await expect(overviewPage).toHaveURL(
    /\/bureau\/visualization\/regional-education-overview\?tenantId=bureau-001$/,
  );
  await expect(
    overviewPage.getByRole("heading", { name: "榕城区", exact: true }),
  ).toBeVisible({ timeout: 20_000 });
  await expect(overviewPage.getByText("体验区智慧教育生态服务平台")).toBeVisible();
  await expect(
    overviewPage.getByRole("button", { name: "区域教育总览" }),
  ).toBeVisible({ timeout: 20_000 });
  await expect(overviewPage.getByLabel("选择教育机构")).toHaveCount(0);
  await expect(overviewPage.getByLabel("选择镇街下钻")).toHaveCount(0);
  expect(await overviewPage.locator(".school-list-item").count()).toBeGreaterThan(3);
  await expect(overviewPage.locator(".profile-meta")).toHaveCSS("align-items", "center");
  const profileMetaRows = overviewPage.locator(".profile-meta dl > div");
  await expect(profileMetaRows).toHaveCount(2);
  const firstMetaBounds = (await profileMetaRows.nth(0).boundingBox())!;
  const secondMetaBounds = (await profileMetaRows.nth(1).boundingBox())!;
  expect(secondMetaBounds.y).toBeGreaterThan(firstMetaBounds.y);
  await expect(overviewPage.locator(".profile-tabs")).toHaveCSS("height", "34px");

  const firstAccordion = overviewPage.locator(
    "#collaboration-panel .accordion-list details",
  ).nth(0);
  await expect(firstAccordion).toHaveAttribute("open", "");
  await firstAccordion.locator("summary").click();
  await expect(firstAccordion).not.toHaveAttribute("open", "");
  const secondAccordion = overviewPage.locator(
    "#collaboration-panel .accordion-list details",
  ).nth(1);
  await secondAccordion.locator("summary").click();
  await expect(secondAccordion).toHaveAttribute("open", "");
  await expect(overviewPage.getByText("地图调试", { exact: true })).toHaveCount(0);
  await expect(overviewPage.getByRole("button", { name: "保存视角" })).toHaveCount(0);
  await expect(overviewPage.getByRole("button", { name: "恢复视角" })).toHaveCount(0);
  await expect(overviewPage.getByRole("button", { name: "重置视角" })).toBeVisible();
  await expect(overviewPage.locator(".map-camera-control > span")).toHaveCount(0);
  await overviewPage.getByRole("button", { name: "切换至凤岐华侨学校" }).click();
  await expect(
    overviewPage.getByRole("heading", { name: "凤岐华侨学校" }),
  ).toBeVisible();
  await overviewPage.getByRole("button", { name: "切换至西岐学校" }).click();
  await expect(
    overviewPage.getByRole("heading", { name: "西岐学校" }),
  ).toBeVisible();
  const mapCanvas = overviewPage.locator("canvas");
  await expect(mapCanvas).toBeVisible();
  await overviewPage.getByRole("button", { name: "能量锥峰", exact: true }).click();
  await expect(overviewPage.getByRole("button", { name: "能量锥峰", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(overviewPage.locator(".map-energy-tower-label")).not.toHaveCount(0);
  const pinnedTowerCard = overviewPage.locator(".map-energy-tower-label.is-pinned");
  await expect(pinnedTowerCard).toHaveCount(1);
  const initialTowerCardId = await pinnedTowerCard.getAttribute("data-energy-tower-id");
  await expect.poll(
    () => pinnedTowerCard.getAttribute("data-energy-tower-id"),
    { timeout: 7_000 },
  ).not.toBe(initialTowerCardId);
  await expect(pinnedTowerCard).toHaveCount(1);
  await overviewPage.getByRole("button", { name: "学校网络", exact: true }).click();
  await expect(overviewPage.locator(".map-energy-tower-label")).toHaveCount(0);
  const mapCanvasBounds = await mapCanvas.boundingBox();
  const overviewSurfaceBounds = await overviewPage
    .locator("main.regional-digital-twin")
    .boundingBox();
  expect(mapCanvasBounds).not.toBeNull();
  expect(overviewSurfaceBounds).not.toBeNull();
  expect(mapCanvasBounds?.x).toBe(overviewSurfaceBounds?.x);
  expect(mapCanvasBounds?.y).toBe(overviewSurfaceBounds?.y);
  expect(mapCanvasBounds?.width).toBe(overviewSurfaceBounds?.width);
  expect(mapCanvasBounds?.height).toBe(overviewSurfaceBounds?.height);

  await overviewPage.getByRole("button", { name: "切换至星河钴蓝" }).click();
  await expect(overviewPage.getByRole("button", { name: "切换至星河钴蓝" })).toHaveClass(/is-active/);
  await overviewPage.reload();
  await expect(overviewPage.getByRole("button", { name: "切换至星河钴蓝" })).toHaveClass(/is-active/);

  await expect(overviewPage.getByRole("banner")).toHaveCount(0);
  await expect(page).not.toHaveURL(/regional-education-overview/);
});
