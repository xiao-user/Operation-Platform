import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import ElementPlus from "element-plus";
import WorkbenchWidgetManager from "@/features/workbench/components/WorkbenchWidgetManager.vue";
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
});
