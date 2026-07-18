import { afterEach, describe, expect, it } from "vitest";
import type { RouteLocationNormalizedLoaded } from "vue-router";
import {
  collectAssistantPageContext,
  registerAssistantPageContextProvider,
  shouldIncludeAssistantPageContext,
} from "@/features/ai-assistant/page-context";
import type { TenantInfo } from "@/types/user";

const tenant: TenantInfo = {
  id: "school-001",
  name: "测试学校",
  shortName: "测试学校",
  type: "school",
  enabled: true,
};

const route = {
  path: "/workbench",
  fullPath: "/workbench",
  name: "workbench",
  meta: {},
} as unknown as RouteLocationNormalizedLoaded;

afterEach(() => {
  document.body.innerHTML = "";
});

describe("assistant page context", () => {
  it("includes page context only for explicit page-related requests", () => {
    expect(shouldIncludeAssistantPageContext("总结当前页面", null)).toBe(true);
    expect(shouldIncludeAssistantPageContext("结合这些数据给出建议", null)).toBe(true);
    expect(shouldIncludeAssistantPageContext("再详细一点", null)).toBe(false);
    expect(shouldIncludeAssistantPageContext("如何设计招生审核流程", null)).toBe(false);
    expect(shouldIncludeAssistantPageContext("给出建议", "运营建议")).toBe(true);
    expect(shouldIncludeAssistantPageContext("总结“工作台”的重点信息", null, "工作台")).toBe(true);
  });

  it("collects page semantics without form or button content", async () => {
    document.body.innerHTML = `
      <main class="app-content-inner">
        <h1>运营工作台</h1>
        <p>今日共有 12 项待办</p>
        <button>删除全部数据</button>
        <input value="secret-value" />
      </main>
    `;

    const context = await collectAssistantPageContext({
      route,
      tenant,
      moduleName: "工作台",
      navigationTrail: [],
    });

    expect(context.page.title).toBe("运营工作台");
    expect(context.page.text).toContain("今日共有 12 项待办");
    expect(context.page.text).not.toContain("删除全部数据");
    expect(context.page.text).not.toContain("secret-value");
  });

  it("uses a registered structured provider for matching pages", async () => {
    const unregister = registerAssistantPageContextProvider({
      id: "workbench-test",
      matches: (currentRoute) => currentRoute.path === "/workbench",
      collect: () => ({ pendingTasks: 12 }),
    });

    try {
      const context = await collectAssistantPageContext({
        route,
        tenant,
        moduleName: "工作台",
        navigationTrail: [],
      });
      expect(context.page.source).toBe("provider");
      expect(context.page.structuredData).toEqual({ pendingTasks: 12 });
    } finally {
      unregister();
    }
  });

  it("does not remove a replacement provider when the old provider unregisters", async () => {
    const unregisterOld = registerAssistantPageContextProvider({
      id: "replaceable-provider",
      matches: () => true,
      collect: () => ({ version: "old" }),
    });
    const unregisterCurrent = registerAssistantPageContextProvider({
      id: "replaceable-provider",
      matches: () => true,
      collect: () => ({ version: "current" }),
    });

    try {
      unregisterOld();
      const context = await collectAssistantPageContext({
        route,
        tenant,
        moduleName: "工作台",
        navigationTrail: [],
      });
      expect(context.page.structuredData).toEqual({ version: "current" });
    } finally {
      unregisterCurrent();
    }
  });
});
