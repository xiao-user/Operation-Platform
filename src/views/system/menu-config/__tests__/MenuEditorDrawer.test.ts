import { beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { mount } from "@vue/test-utils";
import ElementPlus from "element-plus";
import MenuEditorDrawer from "@/views/system/menu-config/MenuEditorDrawer.vue";
import { tenantMenuRepository } from "@/features/menu-config/local-storage-menu-repository";
import type { MenuConfigRecord } from "@/features/menu-config/types";
import type { TenantInfo } from "@/types/user";

const tenant: TenantInfo = {
  id: "school-a",
  name: "学校 A",
  shortName: "学校 A",
  type: "school",
};

describe("MenuEditorDrawer", () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = "";
    setActivePinia(createPinia());
  });

  function mountDrawer(editingRecord: MenuConfigRecord) {
    return mount(MenuEditorDrawer, {
      attachTo: document.body,
      props: {
        modelValue: true,
        tenant,
        records: tenantMenuRepository.list(tenant).records,
        editingRecord,
        defaultParentId: null,
      },
      global: {
        plugins: [ElementPlus],
        stubs: { transition: false },
      },
    });
  }

  it("shows the page selector only for internal pages", async () => {
    const pageRecord = tenantMenuRepository
      .list(tenant)
      .records.find((record) => record.type === "page")!;
    const wrapper = mountDrawer(pageRecord);
    await wrapper.vm.$nextTick();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(document.body.querySelector('[data-field="page-key"]')).not.toBeNull();
    expect(document.body.querySelector('[data-field="external-url"]')).toBeNull();
    wrapper.unmount();
  });

  it("shows URL and open-mode fields only for external links", async () => {
    const moduleRecord = tenantMenuRepository
      .list(tenant)
      .records.find((record) => record.type === "module")!;
    const externalRecord: MenuConfigRecord = {
      id: "external",
      tenantId: tenant.id,
      parentId: moduleRecord.id,
      type: "external",
      name: "帮助中心",
      icon: null,
      pageKey: null,
      externalUrl: "https://example.com/help",
      externalOpenMode: "new-tab",
      sort: 10,
      visible: true,
    };
    const wrapper = mountDrawer(externalRecord);
    await wrapper.vm.$nextTick();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(document.body.querySelector('[data-field="page-key"]')).toBeNull();
    expect(document.body.querySelector('[data-field="external-url"]')).not.toBeNull();
    expect(document.body.querySelector('[data-field="external-open-mode"]')).not.toBeNull();
    wrapper.unmount();
  });
});
