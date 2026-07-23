import { expect, test } from "@playwright/test";

const deterministicJieyangDistricts = {
  type: "FeatureCollection",
  features: [{
    type: "Feature",
    properties: { adcode: 445202, name: "榕城区", level: "district" },
    geometry: {
      type: "Polygon",
      coordinates: [[
        [116.25, 23.45],
        [116.48, 23.45],
        [116.48, 23.68],
        [116.25, 23.68],
        [116.25, 23.45],
      ]],
    },
  }],
};

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

test("智慧体育数据驾驶舱从 AI精准教学菜单打开并完整复用区域大屏", async ({
  context,
  page,
}) => {
  test.setTimeout(90_000);
  let mapRequestCount = 0;
  await context.route("**/areas_v3/bound/*_full.json", (route) => {
    mapRequestCount += 1;
    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(deterministicJieyangDistricts),
    });
  });
  await page.goto("/");

  await page.getByRole("button", { name: /学校 体育东路小学海明学校/ }).click();
  await page.getByRole("menuitem", { name: "体验区教育局", exact: true }).click();

  await page
    .getByRole("navigation")
    .getByRole("link", { name: "AI精准教学", exact: true })
    .click();
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "智慧体育", exact: true })
    .click();

  const newTabPromise = page.waitForEvent("popup");
  await page.getByRole("link", { name: "智慧体育数据驾驶舱", exact: true }).click();
  const sportsPage = await newTabPromise;
  await sportsPage.waitForLoadState("domcontentloaded");
  await sportsPage.bringToFront();

  await expect(sportsPage).toHaveURL(
    /\/bureau\/ai-precision-teaching\/smart-sports\/cockpit\?tenantId=bureau-001$/,
  );
  await expect(sportsPage.locator(".regional-digital-twin")).toBeVisible({ timeout: 20_000 });
  await expect(sportsPage).toHaveTitle(/智慧体育数据驾驶舱/);
  await expect(
    sportsPage.getByLabel("智慧体育范围概览")
      .getByRole("heading", { name: "广东省", exact: true }),
  )
    .toBeVisible({ timeout: 20_000 });
  await expect(sportsPage.locator(".regional-map-canvas")).toBeVisible({ timeout: 20_000 });
  await expect(sportsPage.locator(".map-region-label")).toHaveCount(21);
  await expect(sportsPage.locator(".map-region-label", { hasText: "揭阳市" }))
    .toHaveCount(1);
  await expect(sportsPage.getByRole("tablist", { name: "驾驶舱主导航" }))
    .toHaveCount(0);
  await expect(sportsPage.getByRole("tablist", { name: "数据驾驶舱导航" }))
    .toHaveCount(0);
  await expect(sportsPage.getByRole("button", { name: "切换至生态荧光" }))
    .toBeVisible();
  await expect(sportsPage.getByRole("button", { name: /用户/ }))
    .toBeVisible();
  await expect(sportsPage.getByRole("button", { name: "学校网络", exact: true }))
    .toHaveCount(0);
  await expect(sportsPage.getByRole("button", { name: "能量锥峰", exact: true }))
    .toHaveAttribute("aria-pressed", "true");
  await expect(sportsPage.getByLabel("区域指标排名")).toBeVisible();

  const goalsBounds = (await sportsPage.getByRole("region", {
    name: "省级健康目标达成",
  }).boundingBox())!;
  const mapControlsBounds = (await sportsPage.getByLabel("地图视角与点位控制").boundingBox())!;
  const assistant = sportsPage.getByRole("link", { name: "AI数据助手，新标签打开" });
  const assistantBounds = (await assistant.boundingBox())!;
  expect(mapControlsBounds.y + mapControlsBounds.height)
    .toBeLessThanOrEqual(goalsBounds.y - 16);
  expect(assistantBounds.y + assistantBounds.height)
    .toBeLessThanOrEqual(goalsBounds.y - 16);

  await sportsPage.mouse.move(
    assistantBounds.x + assistantBounds.width / 2,
    assistantBounds.y + assistantBounds.height / 2,
  );
  await sportsPage.mouse.down();
  await sportsPage.mouse.move(
    assistantBounds.x + assistantBounds.width / 2 - 120,
    assistantBounds.y + assistantBounds.height / 2 - 60,
  );
  await sportsPage.mouse.up();
  const movedAssistantBounds = (await assistant.boundingBox())!;
  expect(movedAssistantBounds.x).toBeCloseTo(assistantBounds.x - 120, 0);
  expect(movedAssistantBounds.y).toBeCloseTo(assistantBounds.y - 60, 0);
  const assistantInlineStyle = await assistant.getAttribute("style");
  expect(assistantInlineStyle).not.toContain("inset");
  expect(assistantInlineStyle).not.toMatch(/(?:^|;)\s*(?:top|right|bottom|left):/);

  await sportsPage.getByRole("button", { name: "学段对比", exact: true }).click();
  await expect(sportsPage.getByLabel("学段体测覆盖率排行榜")).toContainText("小学");
  await expect(sportsPage.getByLabel("1000米长跑覆盖率排行榜")).toContainText("小学");
  await sportsPage.getByRole("tab", { name: "运动参与率", exact: true }).click();
  await expect(sportsPage.getByLabel("学段运动参与率排行榜")).toContainText("参与率");
  await sportsPage.getByRole("tab", { name: "阳光长跑", exact: true }).click();
  await expect(sportsPage.getByText("省级阳光长跑目标达成", { exact: true })).toBeVisible();

  const themeVariables = await sportsPage.locator(".regional-digital-twin").evaluate(
    (element) => {
      const style = element.ownerDocument.defaultView!.getComputedStyle(element);
      return [
        style.getPropertyValue("--dt-topbar-height").trim(),
        style.getPropertyValue("--dt-right-panel-width").trim(),
        style.getPropertyValue("--charts--2-100").replace(/\s/g, ""),
      ];
    },
  );
  expect(themeVariables).toEqual(["56px", "328px", "rgba(95,227,255,1)"]);

  await sportsPage.getByRole("button", { name: "切换至生态荧光" }).click();
  await expect.poll(async () => sportsPage.locator(".regional-digital-twin").evaluate(
    (element) => element.ownerDocument.defaultView!
      .getComputedStyle(element)
      .getPropertyValue("--charts--2-100")
      .replace(/\s/g, ""),
  )).toBe("rgba(4,232,108,1)");

  const jieyangLabel = sportsPage.locator(".map-region-label", { hasText: "揭阳市" });
  const labelCenter = await jieyangLabel.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
  });
  const canvas = sportsPage.locator(".regional-map-canvas");
  await canvas.dispatchEvent("pointerdown", {
    button: 0,
    buttons: 1,
    clientX: labelCenter.x,
    clientY: labelCenter.y,
    pointerType: "mouse",
  });
  await canvas.dispatchEvent("click", {
    button: 0,
    clientX: labelCenter.x,
    clientY: labelCenter.y,
  });

  const activeScopeHeading = sportsPage.getByLabel("智慧体育范围概览").locator("h2");
  await expect(activeScopeHeading).not.toHaveText("广东省", { timeout: 20_000 });
  const selectedCityName = (await activeScopeHeading.textContent())?.trim();
  expect(selectedCityName).toBeTruthy();
  await expect(sportsPage.locator(".map-context-label")).toHaveCount(20);
  await expect(sportsPage.locator(".map-region-label")).toHaveCount(1);
  await expect(sportsPage.locator(".map-stage")).toHaveAttribute(
    "aria-busy",
    "false",
    { timeout: 20_000 },
  );
  expect(mapRequestCount).toBe(1);

  const districtLabel = sportsPage.locator(".map-region-label");
  await expect(districtLabel).toHaveCount(1);
  const districtCenter = await districtLabel.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
  });
  await canvas.dispatchEvent("pointerdown", {
    button: 0,
    buttons: 1,
    clientX: districtCenter.x,
    clientY: districtCenter.y + 16,
    pointerType: "mouse",
  });
  await canvas.dispatchEvent("click", {
    button: 0,
    clientX: districtCenter.x,
    clientY: districtCenter.y + 16,
  });
  // Switch the OS preference while the old city presentation is still
  // fading. Reduced-motion must settle the new layer and synchronously remove
  // the exiting layer instead of leaving duplicate labels or invisible draws.
  await sportsPage.emulateMedia({ reducedMotion: "reduce" });
  await expect(activeScopeHeading).toHaveText("榕城区", { timeout: 20_000 });
  const scopeBreadcrumb = sportsPage.getByRole("navigation", { name: "地图下钻路径" });
  await expect(scopeBreadcrumb).toContainText("广东省");
  await expect(scopeBreadcrumb).toContainText(selectedCityName!);
  await expect(scopeBreadcrumb).toContainText("榕城区");
  await expect(sportsPage.getByText("区县同级边界 · 当前区县聚焦。公开地图原型数据。"))
    .toBeVisible();
  await expect(sportsPage.locator(".map-context-label")).toHaveCount(20);
  await expect(sportsPage.locator(".map-region-label")).toHaveCount(1);
  await expect(sportsPage.locator(".map-stage")).toHaveAttribute(
    "aria-busy",
    "false",
    { timeout: 20_000 },
  );
  expect(mapRequestCount).toBe(1);
  const scopeMeasures = await sportsPage.evaluate(() => performance
    .getEntriesByType("measure")
    .filter((entry) => entry.name.startsWith("map-scope:"))
    .map((entry) => ({ name: entry.name, duration: entry.duration })));
  const durationFor = (name: string) => {
    const durations = scopeMeasures
      .filter((entry) => entry.name === `map-scope:${name}`)
      .map((entry) => entry.duration);
    return durations.length > 0 ? Math.max(...durations) : Number.POSITIVE_INFINITY;
  };
  expect(durationFor("context")).toBeLessThan(80);
  expect(durationFor("region")).toBeLessThan(40);
  expect(durationFor("effects")).toBeLessThan(40);
  expect(durationFor("activation")).toBeLessThan(16);
  const renderBudget = await canvas.evaluate((element) => {
    const dataset = (element as unknown as {
      dataset: Record<string, string | undefined>;
    }).dataset;
    return {
      calls: Number(dataset.renderCalls),
      triangles: Number(dataset.renderTriangles),
      geometries: Number(dataset.renderGeometries),
      textures: Number(dataset.renderTextures),
    };
  });
  expect(renderBudget.calls).toBeGreaterThan(0);
  expect(renderBudget.calls).toBeLessThan(1_200);
  expect(renderBudget.triangles).toBeGreaterThan(0);
  expect(renderBudget.triangles).toBeLessThan(1_000_000);
  expect(renderBudget.geometries).toBeGreaterThan(0);
  expect(renderBudget.geometries).toBeLessThan(1_000);
  expect(renderBudget.textures).toBeLessThan(100);
  await sportsPage.emulateMedia({ reducedMotion: "no-preference" });

  const canvasBounds = (await canvas.boundingBox())!;
  const externalPoint = {
    x: canvasBounds.x + canvasBounds.width * 0.39,
    y: canvasBounds.y + canvasBounds.height * 0.27,
  };
  for (const expectedScope of [selectedCityName!, "广东省"]) {
    await canvas.dispatchEvent("pointerdown", {
      button: 0,
      buttons: 1,
      clientX: externalPoint.x,
      clientY: externalPoint.y,
      pointerType: "mouse",
    });
    await canvas.dispatchEvent("click", {
      button: 0,
      clientX: externalPoint.x,
      clientY: externalPoint.y,
    });
    await expect(activeScopeHeading).toHaveText(expectedScope, { timeout: 20_000 });
    await expect(sportsPage.locator(".map-stage")).toHaveAttribute(
      "aria-busy",
      "false",
      { timeout: 20_000 },
    );
  }

  await canvas.focus();
  await sportsPage.keyboard.press("Home");
  await expect(canvas).toHaveAttribute("aria-label", /当前选择.+按回车进入/);
  await sportsPage.keyboard.press("Enter");
  await expect(activeScopeHeading).not.toHaveText("广东省", { timeout: 20_000 });
  await expect(sportsPage.locator(".map-stage")).toHaveAttribute(
    "aria-busy",
    "false",
    { timeout: 20_000 },
  );
  await sportsPage.keyboard.press("Escape");
  await expect(activeScopeHeading).toHaveText("广东省", { timeout: 20_000 });
});

test("区域教育总览从教育局菜单打开独立数字孪生首页", async ({ page }) => {
  test.setTimeout(150_000);
  await page.goto("/");

  await page.getByRole("button", { name: /学校 体育东路小学海明学校/ }).click();
  await page.getByRole("menuitem", { name: "揭阳市榕城区教育局", exact: true }).click();

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
    /\/bureau\/visualization\/regional-education-overview\?tenantId=bureau-74b5bcaf-69af-4cf2-8c63-11f9270d4676$/,
  );
  await expect(
    overviewPage.getByRole("heading", { name: "榕城区", exact: true }),
  ).toBeVisible({ timeout: 20_000 });
  await expect(overviewPage.getByText("揭阳市榕城区智慧教育生态服务平台")).toBeVisible();
  const scopeHeading = overviewPage.getByLabel("区域教育数据汇总").locator("h2");
  const navigationCanvas = overviewPage.locator(".regional-map-canvas");
  await navigationCanvas.focus();
  await overviewPage.keyboard.press("Home");
  await overviewPage.keyboard.press("Enter");
  await expect(scopeHeading).not.toHaveText("榕城区", { timeout: 20_000 });
  await expect(overviewPage.locator(".map-stage")).toHaveAttribute("aria-busy", "false");

  const scopeBackStartedAt = Date.now();
  await overviewPage.keyboard.press("Escape");
  await expect(scopeHeading).toHaveText("榕城区");
  expect(Date.now() - scopeBackStartedAt).toBeLessThan(1_000);
  await expect(overviewPage.locator(".map-stage")).toHaveAttribute("aria-busy", "false");

  await navigationCanvas.focus();
  await overviewPage.keyboard.press("Home");
  await overviewPage.keyboard.press("Enter");
  await expect(scopeHeading).not.toHaveText("榕城区", { timeout: 20_000 });
  await expect(overviewPage.locator(".map-stage")).toHaveAttribute("aria-busy", "false");
  const breadcrumbStartedAt = Date.now();
  await overviewPage
    .getByRole("navigation", { name: "地图下钻路径" })
    .getByRole("button", { name: "榕城区" })
    .click();
  await expect(scopeHeading).toHaveText("榕城区");
  expect(Date.now() - breadcrumbStartedAt).toBeLessThan(1_000);
  await expect(overviewPage.locator(".map-stage")).toHaveAttribute("aria-busy", "false");
  await expect(overviewPage.locator(".page-topbar .user-item")).toContainText("罗吴航");
  await expect(overviewPage.locator(".page-topbar .user-item img")).toHaveCount(2);
  await overviewPage.getByRole("button", { name: "用户 罗吴航" }).click();
  await expect(overviewPage.getByRole("menu", { name: "用户与角色" })).toBeVisible();
  await expect(overviewPage.getByRole("menuitemradio", { checked: true })).toHaveCount(1);
  await expect(overviewPage.getByRole("menuitem", { name: "修改密码" })).toBeVisible();
  await expect(overviewPage.getByRole("menuitem", { name: "退出登录" })).toBeVisible();
  await expect(overviewPage.getByRole("menuitem", { name: "退出大屏" })).toBeVisible();
  await overviewPage.keyboard.press("Escape");
  await expect(overviewPage.getByRole("menu", { name: "用户与角色" })).toHaveCount(0);
  await expect(
    overviewPage.getByRole("tablist", { name: "数据驾驶舱导航" })
      .getByRole("tab", { name: "区域教育总览" }),
  ).toBeVisible({ timeout: 20_000 });
  await expect(overviewPage.getByLabel("选择教育机构")).toHaveCount(0);
  await expect(overviewPage.getByLabel("选择镇街下钻")).toHaveCount(0);
  const aiAssistantEntry = overviewPage.getByRole("link", {
    name: "AI数据助手，新标签打开",
  });
  await expect(aiAssistantEntry).toBeVisible();
  await expect(aiAssistantEntry).toHaveAttribute("target", "_blank");
  await expect(aiAssistantEntry).toHaveAttribute("aria-disabled", "true");
  await expect(aiAssistantEntry).toHaveCSS("right", "24px");
  await expect(aiAssistantEntry).toHaveCSS("bottom", "148px");
  await overviewPage.setViewportSize({ width: 1100, height: 720 });
  await expect(aiAssistantEntry).toHaveCSS("right", "24px");
  await overviewPage.setViewportSize({ width: 1280, height: 720 });
  const entryBorderBeforeHover = await aiAssistantEntry.evaluate(
    (element) => element.ownerDocument.defaultView!.getComputedStyle(element).borderColor,
  );
  await aiAssistantEntry.hover();
  await expect.poll(() => aiAssistantEntry.evaluate(
    (element) => element.ownerDocument.defaultView!.getComputedStyle(element).borderColor,
  )).toBe(entryBorderBeforeHover);
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
  await expect(overviewPage.locator(".map-layer-switch")).toHaveCount(0);
  await expect(overviewPage.locator(".map-camera-control > .map-layer-button"))
    .toHaveCount(2);
  await expect(overviewPage.getByRole("button", { name: "能量锥峰", exact: true }))
    .toHaveAttribute("aria-pressed", "true");
  const primaryDashboardNavigation = overviewPage.getByRole("tablist", {
    name: "驾驶舱主导航",
  });
  const bottomDashboardNavigation = overviewPage.getByRole("tablist", {
    name: "数据驾驶舱导航",
  });
  await expect(primaryDashboardNavigation.getByRole("tab")).toHaveCount(8);
  await expect(bottomDashboardNavigation.getByRole("tab")).toHaveCount(8);
  const overviewDashboardTab = bottomDashboardNavigation.getByRole("tab", {
    name: "区域教育总览",
  });
  const academicQualityTab = primaryDashboardNavigation.getByRole("tab", {
    name: "学业质量监测",
  });
  await academicQualityTab.click();
  await expect(academicQualityTab).toHaveAttribute("aria-selected", "true");
  await expect(bottomDashboardNavigation.getByRole("tab", {
    name: "学业质量监测",
  })).toHaveAttribute("aria-selected", "true");
  await expect(overviewPage.getByRole("tabpanel", { name: "学业质量监测" }))
    .toBeVisible();
  const academicFilters = overviewPage.getByRole("region", { name: "学业质量筛选条件" });
  await expect(academicFilters).toContainText("2026-2027学年下学期");
  await expect(academicFilters).toContainText("初三");
  await expect(academicFilters).toContainText("全部考试");
  await expect(academicFilters.getByRole("combobox")).toHaveCount(3);
  await expect(overviewPage.getByRole("button", { name: "报告中心" })).toBeVisible();
  await expect(overviewPage.getByRole("heading", { name: "学业趋势对比" })).toBeVisible();
  await expect(overviewPage.getByRole("img", {
    name: "学业趋势对比：历次考试平均分、优秀率和合格率",
  })).toBeVisible();
  const trendHelp = overviewPage.getByRole("button", { name: "查看学业趋势对比说明" });
  await expect(trendHelp).toBeVisible();
  await trendHelp.hover();
  await expect(overviewPage.locator(".dashboard-panel-help-popper"))
    .toContainText("可点击图例隐藏或恢复指标");
  await expect(overviewPage.getByText("区域学业全景总览", { exact: true }))
    .toBeVisible();
  await expect(overviewPage.locator(".quality-panel")).toHaveCount(8);
  await expect(overviewPage.getByRole("tablist", {
    name: "区域学业全景查看范围",
  })).toBeVisible();
  const deepSeaChartVariables = await overviewPage.locator(".regional-digital-twin").evaluate(
    (element) => {
      const style = element.ownerDocument.defaultView!.getComputedStyle(element);
      return [
        style.getPropertyValue("--charts--1-100").replace(/\s/g, ""),
        style.getPropertyValue("--charts--2-100").replace(/\s/g, ""),
        style.getPropertyValue("--charts--3-100").replace(/\s/g, ""),
      ];
    },
  );
  expect(deepSeaChartVariables).toEqual([
    "rgba(218,244,255,1)",
    "rgba(95,227,255,1)",
    "rgba(198,255,170,1)",
  ]);
  await expect.poll(() => page.locator("body").evaluate(
    (element) => element.ownerDocument.defaultView!
      .getComputedStyle(element)
      .getPropertyValue("--charts--2-100"),
  )).toBe("");
  await expect(overviewPage.locator(".regional-map-canvas")).toHaveCount(0);
  await overviewDashboardTab.click();
  await expect(overviewDashboardTab).toHaveAttribute("aria-selected", "true");
  await expect(primaryDashboardNavigation.getByRole("tab", {
    name: "区域教育总览",
  })).toHaveAttribute("aria-selected", "true");
  await expect(overviewPage.locator(".regional-map-canvas")).toBeVisible();
  await expect(overviewPage.locator(".dashboard-viewport"))
    .toHaveAttribute("aria-busy", "false");
  const resetViewButton = overviewPage.getByRole("button", { name: "重置视角" });
  const materialButton = overviewPage.getByRole("button", { name: "地图材质" });
  const sharedControlStyle = async (button: typeof resetViewButton) => button.evaluate(
    (element) => {
      const style = element.ownerDocument.defaultView!.getComputedStyle(element);
      return [style.height, style.borderColor, style.borderRadius, style.backgroundColor];
    },
  );
  expect(await sharedControlStyle(materialButton)).toEqual(
    await sharedControlStyle(resetViewButton),
  );
  await overviewPage.getByRole("button", { name: "学校网络", exact: true }).click();
  await expect(overviewPage.getByRole("button", { name: "学校网络", exact: true }))
    .toHaveAttribute("aria-pressed", "true");
  await overviewPage.getByRole("button", { name: "切换至多维光谱" }).click();
  await expect(overviewPage.getByRole("button", { name: "切换至多维光谱" }))
    .toHaveClass(/is-active/);
  await expect.poll(() => overviewPage.locator(".regional-digital-twin").evaluate(
    (element) => element.ownerDocument.defaultView!
      .getComputedStyle(element)
      .getPropertyValue("--charts--2-100")
      .replace(/\s/g, ""),
  )).toBe("rgba(0,255,213,1)");
  await expect(overviewPage.locator(".map-location-name.is-bureau"))
    .toHaveCSS("color", "rgb(43, 103, 209)");
  await overviewPage.getByRole("button", { name: "地图材质" }).click();
  await expect(overviewPage.getByLabel("地图材质调试")).toBeVisible();
  await expect(overviewPage.getByText("折射率 IOR", { exact: true })).toHaveCount(0);
  await expect(overviewPage.getByText("金属度", { exact: true })).toHaveCount(0);
  await expect(overviewPage.getByText("锥峰透明度", { exact: true })).toBeVisible();
  await expect(overviewPage.getByText("学校立标", { exact: true })).toBeVisible();
  await expect(overviewPage.getByText("教育局信标", { exact: true })).toBeVisible();
  await expect(overviewPage.getByText("学校飞线", { exact: true })).toBeVisible();
  await expect(overviewPage.getByText("默认透明度", { exact: true })).toBeVisible();
  await expect(overviewPage.getByText("学校轮播间隔", { exact: true })).toBeVisible();
  await expect(overviewPage.getByText("区级停留时间", { exact: true })).toBeVisible();
  await expect(overviewPage.getByText("子集停留时间", { exact: true })).toBeVisible();
  const autoRotationCheckbox = overviewPage.getByRole("checkbox", {
    name: "自动平面旋转",
  });
  await expect(autoRotationCheckbox).toBeChecked();
  await autoRotationCheckbox.uncheck();
  await expect(autoRotationCheckbox).not.toBeChecked();
  await autoRotationCheckbox.check();
  await expect(autoRotationCheckbox).toBeChecked();
  await expect(overviewPage.getByText("离地高度", { exact: true })).toBeVisible();
  await expect(overviewPage.getByLabel("行政区顶面颜色")).toBeVisible();
  await expect(overviewPage.getByText("分区明暗变化", { exact: true })).toBeVisible();
  await expect(overviewPage.getByLabel("外部地面颜色")).toBeVisible();
  await expect(overviewPage.getByText("外部地面透明度", { exact: true })).toBeVisible();
  await expect(overviewPage.getByLabel("侧边顶部颜色")).toBeVisible();
  await expect(overviewPage.getByLabel("多量顶色")).toBeVisible();
  await overviewPage.getByRole("button", { name: "地图材质" }).click();
  await expect(overviewPage.locator(".map-camera-control > span")).toHaveCount(0);
  const schoolSearch = overviewPage.getByRole("combobox", { name: "搜索学校" });
  await expect(schoolSearch).toBeVisible();
  await overviewPage.locator(".map-school-search .el-select__wrapper").click();
  await schoolSearch.fill("凤岐华侨学校");
  await overviewPage.getByRole("option", { name: /凤岐华侨学校/ }).click();
  await expect(
    overviewPage.getByRole("heading", { name: "凤岐华侨学校" }),
  ).toBeVisible();
  await expect(overviewPage.locator(".map-stage"))
    .not.toHaveAttribute("aria-label", "榕城区教育机构三维地图");
  await overviewPage.getByRole("button", { name: "切换至凤岐华侨学校" }).click();
  await expect(
    overviewPage.getByRole("heading", { name: "凤岐华侨学校" }),
  ).toBeVisible();
  await overviewPage.getByRole("button", { name: "切换至西岐学校" }).click();
  await expect(
    overviewPage.getByRole("heading", { name: "西岐学校" }),
  ).toBeVisible();
  const selectedInstitutionHeading = overviewPage
    .getByRole("complementary", { name: "当前教育机构详情" })
    .getByRole("heading", { level: 2 });
  await expect.poll(
    () => selectedInstitutionHeading.textContent(),
    { timeout: 7_000 },
  ).not.toBe("西岐学校");
  const mapCanvas = overviewPage.locator(".regional-map-canvas");
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
