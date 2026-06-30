import { beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { mount } from "@vue/test-utils";
import ElementPlus from "element-plus";
import MenuConfigView from "@/views/system/menu-config/MenuConfigView.vue";
import { useMenuConfigStore } from "@/stores/menu-config";

describe("MenuConfigView", () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
  });

  it("loads the first available tenant into the configuration workspace", async () => {
    const wrapper = mount(MenuConfigView, {
      global: {
        plugins: [ElementPlus],
        stubs: { teleport: true, transition: false },
      },
    });
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain("菜单配置");
    expect(wrapper.text()).toContain("体育东路小学海明学校");
    expect(useMenuConfigStore().records.some((record) => record.name === "家校互动")).toBe(true);
  });
});
