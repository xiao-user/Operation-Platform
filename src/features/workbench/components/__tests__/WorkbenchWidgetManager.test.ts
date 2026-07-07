import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import ElementPlus from "element-plus";
import WorkbenchWidgetManager from "@/features/workbench/components/WorkbenchWidgetManager.vue";
import WorkbenchWidgetSettingsDialog from "@/features/workbench/components/WorkbenchWidgetSettingsDialog.vue";
import { ADMIN_ROLE_ID } from "@/features/access-control/types";
import { useWorkbenchStore } from "@/stores/workbench";
import type { TenantInfo } from "@/types/user";

const school: TenantInfo = {
  id: "school-component",
  name: "组件测试学校",
  shortName: "测试学校",
  type: "school",
  enabled: true,
};

describe("workbench widget controls", () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("lists the complete fixed catalog and emits visibility changes", async () => {
    const store = useWorkbenchStore();
    store.load(school, "user-a", ADMIN_ROLE_ID, []);
    store.beginEditing();
    const wrapper = mount(WorkbenchWidgetManager, {
      attachTo: document.body,
      props: {
        modelValue: true,
        items: store.draftLayout!.items,
        "onUpdate:modelValue": () => undefined,
      },
      global: { plugins: [ElementPlus] },
    });
    await flushPromises();

    expect(document.body.textContent).toContain("显示 9/9");
    const switches = document.body.querySelectorAll<HTMLElement>('[role="switch"]');
    expect(switches).toHaveLength(9);

    switches[0]!.click();
    await flushPromises();
    expect(wrapper.emitted("visibilityChange")?.[0]).toEqual([
      store.draftLayout!.items[0]!.widgetKey,
      false,
    ]);
  });

  it("keeps the automatic quick-link selection when settings are opened and saved", async () => {
    const store = useWorkbenchStore();
    store.load(school, "user-a", ADMIN_ROLE_ID, []);
    store.beginEditing();
    const item = store.draftLayout!.items.find(
      (candidate) => candidate.settings.kind === "quick-links",
    )!;
    const definition = store.definitionFor(item.widgetKey)!;
    const wrapper = mount(WorkbenchWidgetSettingsDialog, {
      attachTo: document.body,
      props: {
        modelValue: true,
        item,
        definition,
        quickLinks: [
          { id: "menu-a", name: "菜单 A", kind: "internal", target: "/a" },
          { id: "menu-b", name: "菜单 B", kind: "internal", target: "/b" },
        ],
        "onUpdate:modelValue": () => undefined,
      },
      global: { plugins: [ElementPlus] },
    });
    await flushPromises();

    const saveButton = [...document.body.querySelectorAll<HTMLButtonElement>("button")]
      .find((button) => button.textContent?.trim() === "保存设置")!;
    saveButton.click();
    await flushPromises();

    expect(wrapper.emitted("save")?.[0]).toEqual([
      { kind: "quick-links", menuIds: null },
    ]);
  });
});
