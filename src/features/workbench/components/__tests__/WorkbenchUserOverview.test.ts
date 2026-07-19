import { describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import ElementPlus from "element-plus";
import WorkbenchUserOverview from "@/features/workbench/components/WorkbenchUserOverview.vue";

describe("WorkbenchUserOverview", () => {
  it("renders the current identity and copies the account id", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    const wrapper = mount(WorkbenchUserOverview, {
      props: {
        data: {
          kind: "user-overview",
          name: "罗吴航",
          initials: "罗",
          account: "luowuhang@example.com",
          roleName: "教研员",
          stats: [
            { label: "通知消息", value: 0 },
            { label: "我的邮件", value: 0 },
            { label: "我的订阅", value: 0 },
          ],
        },
      },
      global: { plugins: [ElementPlus] },
    });

    expect(wrapper.text()).toContain("罗吴航");
    expect(wrapper.text()).toContain("教研员");
    expect(wrapper.text()).toContain("账号 ID：luowuhang@example.com");
    await wrapper.get('button[aria-label="复制账号 ID"]').trigger("click");
    await flushPromises();

    expect(writeText).toHaveBeenCalledWith("luowuhang@example.com");
  });
});
