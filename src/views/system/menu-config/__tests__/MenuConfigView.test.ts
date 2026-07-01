import { beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { mount } from "@vue/test-utils";
import ElementPlus from "element-plus";
import { createMemoryHistory, createRouter } from "vue-router";
import MenuConfigView from "@/views/system/menu-config/MenuConfigView.vue";
import { useMenuConfigStore } from "@/stores/menu-config";

describe("MenuConfigView", () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
  });

  function mountView() {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: "/system/menu-config", component: { template: "<div />" } }],
    });
    void router.push("/system/menu-config");
    return mount(MenuConfigView, {
      global: {
        plugins: [ElementPlus, router],
        stubs: { teleport: true, transition: false },
      },
    });
  }

  it("loads the first available tenant into the configuration workspace", async () => {
    const wrapper = mountView();
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain("系统入口配置");
    expect(wrapper.text()).toContain("工作台");
    expect(wrapper.text()).toContain("新增一级模块");
    expect(wrapper.find(".page-heading").exists()).toBe(false);
    expect(wrapper.find(".table-toolbar .el-button-group").exists()).toBe(true);
    expect(wrapper.text()).toContain("体育东路小学海明学校");
    expect(useMenuConfigStore().records.some((record) => record.name === "家校互动")).toBe(true);
  });

  it("opens inline editing from text and saves with Enter", async () => {
    const wrapper = mountView();
    await wrapper.vm.$nextTick();

    const row = wrapper.findAll(".menu-tree-row").find((item) => item.text().includes("家校互动"));
    expect(row).toBeDefined();
    expect(row!.text()).toContain("编辑");
    expect(row!.text()).not.toContain("行内编辑");
    const nameTrigger = row!.find(".menu-name-text");
    expect(nameTrigger.attributes("draggable")).toBe("false");
    await nameTrigger.trigger("click");
    await wrapper.vm.$nextTick();

    const input = row!.find('input[aria-label="菜单名称"]');
    await input.setValue("家校协同");
    await input.trigger("keyup", { key: "Enter" });
    await wrapper.vm.$nextTick();

    expect(useMenuConfigStore().records.some((record) => record.name === "家校协同")).toBe(true);
  });

  it("opens inline editing by double-clicking a row", async () => {
    const wrapper = mountView();
    await wrapper.vm.$nextTick();

    const row = wrapper.findAll(".menu-tree-row").find((item) => item.text().includes("家校互动"));
    await row!.trigger("dblclick");
    await wrapper.vm.$nextTick();

    expect(row!.find('input[aria-label="菜单名称"]').exists()).toBe(true);
  });
});
