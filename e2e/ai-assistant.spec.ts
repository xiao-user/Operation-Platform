import { expect, test } from "@playwright/test";

test("AI 助手读取当前页面并完成侧栏交互", async ({ page }) => {
  await page.goto("/workbench");
  const assistantEntry = page.getByRole("button", { name: "AI 运营助手" });
  await assistantEntry.click();
  await expect(assistantEntry).not.toHaveClass(/is-active/);
  await expect(assistantEntry).toHaveCSS("border-top-style", "none");

  const assistant = page.getByRole("complementary", { name: "AI 运营助手" });
  await expect(assistant).toBeVisible();
  const normalBox = await assistant.boundingBox();
  expect(Math.round(normalBox?.width ?? 0)).toBe(419);
  await expect(assistant.getByText("我能帮您做", { exact: true })).toBeVisible();
  await expect(assistant.getByText("您是否想问", { exact: true })).toBeVisible();
  await expect(assistant.getByRole("button", { name: "关闭助手" }).locator("svg")).toBeVisible();
  await expect(assistant.getByRole("button", { name: "新建对话" }).last().locator("svg")).toBeVisible();
  await expect(assistant.getByRole("button", { name: "发送问题" }).locator("svg")).toBeVisible();

  const input = assistant.getByRole("textbox", { name: "向 AI 运营助手提问" });
  await input.fill("正在输入中文");
  await input.dispatchEvent("keydown", { key: "Enter", isComposing: true });
  await expect(input).toHaveValue("正在输入中文");
  await expect(assistant.locator(".message-entry")).toHaveCount(0);
  await input.fill("");

  await page.evaluate(`(() => {
    const element = document.querySelector('.assistant-main');
    const snapshots = [];
    const observer = new MutationObserver(() => {
      const length = element?.querySelector('.assistant-markdown')?.textContent?.length ?? 0;
      if (length > 0 && snapshots.at(-1) !== length) snapshots.push(length);
    });
    observer.observe(element, { childList: true, subtree: true, characterData: true });
    globalThis.__assistantStreamSnapshots = snapshots;
  })()`);

  await assistant.getByRole("button", { name: /总结“工作台”的重点信息/ }).click();
  await expect(input).toHaveValue("总结“工作台”的重点信息");
  await assistant.getByRole("button", { name: "发送问题" }).click();

  await expect(assistant.getByText("本地演示模式已读取“工作台”的页面上下文。", { exact: false })).toBeVisible();
  await expect(assistant.locator(".assistant-markdown h2", { hasText: "页面上下文" })).toBeVisible();
  await expect(assistant.locator(".assistant-markdown li")).toHaveCount(2);
  await expect(assistant.locator(".assistant-markdown .katex")).toBeVisible();
  const streamSnapshots = await page.evaluate("globalThis.__assistantStreamSnapshots ?? []") as number[];
  expect(streamSnapshots.length).toBeGreaterThan(1);
  expect(streamSnapshots.at(-1)).toBeGreaterThan(streamSnapshots[0]!);

  await assistant.getByRole("button", { name: "展开助手" }).click();
  const expandedBox = await assistant.boundingBox();
  expect(Math.round(expandedBox?.width ?? 0)).toBe(1280);
  expect(Math.round(expandedBox?.x ?? -1)).toBe(0);
  const historyRail = assistant.getByRole("region", { name: "历史会话列表" });
  await expect(historyRail).toBeVisible();
  await expect(historyRail.getByRole("button", { name: "新建对话" })).toBeVisible();
  await expect(historyRail.getByText("智能体广场", { exact: true })).toBeVisible();

  await historyRail.getByRole("button", { name: "隐藏历史对话栏" }).click();
  await expect(historyRail).toHaveCount(0);
  await assistant.getByRole("button", { name: "显示历史对话栏" }).click();
  await expect(assistant.getByRole("region", { name: "历史会话列表" })).toBeVisible();
  await assistant.getByRole("button", { name: "退出全屏" }).click();

  await assistant.getByRole("button", { name: "关闭助手" }).click();
  await expect(assistant).toHaveCount(0);
});

test("移动端助手覆盖内容区且保留 Header", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/workbench");
  await page.getByRole("button", { name: "AI 运营助手" }).click();

  const assistant = page.getByRole("complementary", { name: "AI 运营助手" });
  const box = await assistant.boundingBox();
  expect(box).not.toBeNull();
  expect(Math.round(box?.width ?? 0)).toBe(390);
  expect(Math.round(box?.y ?? 0)).toBe(56);
  await expect(page.locator(".app-header")).toBeVisible();

  await assistant.getByRole("button", { name: "展开助手" }).click();
  const expandedBox = await assistant.boundingBox();
  expect(Math.round(expandedBox?.width ?? 0)).toBe(390);
  expect(Math.round(expandedBox?.y ?? 0)).toBe(56);
  await expect(assistant.getByRole("region", { name: "历史会话列表" })).toBeHidden();
});
