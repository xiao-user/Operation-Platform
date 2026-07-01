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
    expect(wrapper.findAll(".el-tree-node.is-expanded")).toHaveLength(0);
  });

  it("only expands manually and keeps that state after menu data changes", async () => {
    const wrapper = mountView();
    await wrapper.vm.$nextTick();

    const moduleRow = wrapper
      .findAll(".menu-tree-row")
      .find((item) => item.find(".menu-name-text").text() === "家校互动")!;
    await moduleRow.find('button[aria-label="展开菜单"]').trigger("click");
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain("通知公告");

    const store = useMenuConfigStore();
    const module = store.records.find((record) => record.name === "家校互动")!;
    store.update(module.id, { ...module, name: "家校互动更新" });
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain("通知公告");
  });

  it("does not keep a current-row selection after a single click", async () => {
    const wrapper = mountView();
    await wrapper.vm.$nextTick();

    const row = wrapper.findAll(".menu-tree-row")[0]!;
    await row.trigger("click");
    await wrapper.vm.$nextTick();

    expect(wrapper.find(".el-tree-node.is-current").exists()).toBe(false);
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

  it("shows a concrete insertion placeholder while dragging between rows", async () => {
    const wrapper = mountView();
    await wrapper.vm.$nextTick();

    const moduleRow = wrapper
      .findAll(".menu-tree-row")
      .find((item) => item.find(".menu-name-text").text() === "家校互动")!;
    await moduleRow.find('button[aria-label="展开菜单"]').trigger("click");
    await wrapper.vm.$nextTick();

    const store = useMenuConfigStore();
    const source = store.tree
      .flatMap((node) => node.children)
      .find((record) => record.name === "通知公告")!;
    const target = store.tree
      .flatMap((node) => node.children)
      .find((record) => record.name === "活动管理")!;
    const targetRow = wrapper
      .findAll(".menu-tree-row")
      .find((item) => item.find(".menu-name-text").text() === "活动管理")!;
    const targetContent = targetRow.element.parentElement as HTMLElement;
    targetContent.getBoundingClientRect = () => ({
      x: 0,
      y: 100,
      top: 100,
      right: 1000,
      bottom: 148,
      left: 0,
      width: 1000,
      height: 48,
      toJSON: () => ({}),
    });

    wrapper.findComponent({ name: "ElTree" }).vm.$emit(
      "node-drag-over",
      { data: source },
      { data: target },
      { target: targetContent, clientY: 102 },
    );
    await wrapper.vm.$nextTick();

    expect(targetRow.classes()).toContain("is-drop-preview-before");
  });
});
