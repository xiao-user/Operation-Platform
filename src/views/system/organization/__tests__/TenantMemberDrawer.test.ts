import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import ElementPlus from "element-plus";
import TenantMemberDrawer from "@/views/system/organization/TenantMemberDrawer.vue";
import { ADMIN_ROLE_ID, STAFF_ROLE_ID } from "@/features/access-control/types";
import {
  createCurrentUserAdminMember,
  tenantMemberRepository,
} from "@/features/tenant-members/local-storage-tenant-member-repository";
import { MOCK_TENANTS, MOCK_USER_INFO } from "@/config/mock";
import type { TenantMemberRecord } from "@/features/tenant-members/types";

const school = MOCK_TENANTS.find((tenant) => tenant.id === "school-001")!;

function teacherMember(): TenantMemberRecord {
  return {
    id: "member-teacher",
    tenantId: school.id,
    userId: "user-teacher",
    name: "李老师",
    initials: "李",
    account: "teacher-li",
    phone: "13800000000",
    title: "班主任",
    enabled: true,
    roleIds: [STAFF_ROLE_ID],
    createdAt: 1000,
    updatedAt: 1000,
  };
}

function mountDrawer() {
  return mount(TenantMemberDrawer, {
    attachTo: document.body,
    props: {
      modelValue: true,
      tenant: school,
    },
    global: {
      plugins: [ElementPlus],
      stubs: { transition: false },
    },
  });
}

describe("TenantMemberDrawer", () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = "";
    setActivePinia(createPinia());
    tenantMemberRepository.replace(school, [
      createCurrentUserAdminMember(school, MOCK_USER_INFO, 1000),
      teacherMember(),
    ]);
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("opens with the tenant member list and filters by keyword", async () => {
    const wrapper = mountDrawer();
    await flushPromises();

    expect(document.body.textContent).toContain("体育东路小学海明学校 · 成员管理");
    expect(document.body.textContent).toContain("罗吾航");
    expect(document.body.textContent).toContain("李老师");

    await wrapper
      .find('input[placeholder="搜索姓名、账号或手机号"]')
      .setValue("teacher-li");
    await flushPromises();

    expect(document.body.textContent).toContain("李老师");
    expect(document.body.textContent).not.toContain("罗吾航");
    wrapper.unmount();
  });

  it("validates role selection from the create-member dialog", async () => {
    const wrapper = mountDrawer();
    await flushPromises();

    await wrapper.findAll("button").find((button) => button.text() === "新增成员")!.trigger("click");
    await flushPromises();
    await wrapper.find('input[placeholder="请输入成员姓名"]').setValue("新成员");
    await wrapper.find('input[placeholder="用于本地 demo 的账号标识"]').setValue("new-user");
    await wrapper.findAll("button").find((button) => button.text() === "保存")!.trigger("click");
    await flushPromises();

    expect(document.body.textContent).toContain("请至少选择一个角色");
    wrapper.unmount();
  });

  it("blocks disabling the last enabled admin member from the drawer", async () => {
    tenantMemberRepository.replace(school, [
      createCurrentUserAdminMember(school, MOCK_USER_INFO, 1000),
    ]);
    const wrapper = mountDrawer();
    await flushPromises();

    wrapper.findComponent({ name: "ElSwitch" }).vm.$emit("change", false);
    await flushPromises();

    expect(document.body.textContent).toContain("至少保留一个启用管理员成员");
    expect(tenantMemberRepository.list(school).members[0]).toMatchObject({
      enabled: true,
      roleIds: [ADMIN_ROLE_ID],
    });
    wrapper.unmount();
  });
});
