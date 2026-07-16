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
  expect(await overviewPage.locator(".pagination-item").count()).toBeGreaterThan(3);
  await overviewPage.getByText("地图调试", { exact: true }).click();
  const horizontalOffset = overviewPage.getByRole("slider", { name: "水平偏移" });
  await expect(horizontalOffset).toHaveValue("-60");
  await horizontalOffset.press("ArrowLeft");
  await expect(horizontalOffset).toHaveValue("-62");
  await overviewPage.getByRole("button", { name: "恢复默认参数" }).click();
  await expect(horizontalOffset).toHaveValue("-60");
  await overviewPage.getByText("地图调试", { exact: true }).click();
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

  const mapCenterX = (mapCanvasBounds?.x ?? 0) + (mapCanvasBounds?.width ?? 0) * 0.5;
  const mapCenterY = (mapCanvasBounds?.y ?? 0) + (mapCanvasBounds?.height ?? 0) * 0.5;
  await overviewPage.getByText("地图调试", { exact: true }).click();
  const cameraFieldLabels = [
    "相机 X",
    "相机 Y",
    "相机 Z",
    "焦点 X",
    "焦点 Y",
    "焦点 Z",
  ] as const;
  const cameraFields = cameraFieldLabels.map((label) =>
    overviewPage.locator(`input[aria-label="${label}"]`)
  );
  const readCameraValues = async () => Promise.all(
    cameraFields.map(async (field) => Number(await field.inputValue())),
  );
  const cameraValuesBeforeOrbit = await readCameraValues();
  await overviewPage.mouse.move(mapCenterX, mapCenterY);
  await overviewPage.mouse.down();
  await overviewPage.mouse.move(mapCenterX + 70, mapCenterY, { steps: 8 });
  await overviewPage.mouse.up();
  await expect.poll(async () => (await readCameraValues()).join("|")).not.toBe(
    cameraValuesBeforeOrbit.join("|"),
  );
  const cameraValuesAfterOrbit = await readCameraValues();
  expect(cameraValuesAfterOrbit[0]).not.toBeCloseTo(cameraValuesBeforeOrbit[0], 3);
  expect(cameraValuesAfterOrbit[1]).not.toBeCloseTo(cameraValuesBeforeOrbit[1], 3);
  expect(cameraValuesAfterOrbit[2]).toBeCloseTo(cameraValuesBeforeOrbit[2], 3);
  expect(cameraValuesAfterOrbit.slice(3)).toEqual(cameraValuesBeforeOrbit.slice(3));

  await overviewPage.getByRole("button", { name: "恢复默认参数" }).click();
  const cameraValuesBeforeRightDrag = await readCameraValues();
  await overviewPage.mouse.move(mapCenterX, mapCenterY);
  await overviewPage.mouse.down({ button: "right" });
  await overviewPage.mouse.move(mapCenterX + 70, mapCenterY, { steps: 8 });
  await overviewPage.mouse.up({ button: "right" });
  await overviewPage.waitForTimeout(200);
  expect(await readCameraValues()).toEqual(cameraValuesBeforeRightDrag);
  await overviewPage.getByText("地图调试", { exact: true }).click();

  await overviewPage.getByRole("button", { name: "切换至深海矩阵" }).click();
  await expect(overviewPage.getByRole("button", { name: "切换至深海矩阵" })).toHaveClass(/is-active/);
  await overviewPage.reload();
  await expect(overviewPage.getByRole("button", { name: "切换至深海矩阵" })).toHaveClass(/is-active/);

  await expect(overviewPage.getByRole("banner")).toHaveCount(0);
  await expect(page).not.toHaveURL(/regional-education-overview/);
});
