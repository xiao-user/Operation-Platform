import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import WorkbenchWidgetContent from "@/features/workbench/components/WorkbenchWidgetContent.vue";

describe("WorkbenchWidgetContent quick links", () => {
  it("groups internal pages by top-level menu tabs", async () => {
    const wrapper = mount(WorkbenchWidgetContent, {
      props: {
        data: {
          kind: "quick-links",
          items: [
            {
              id: "school-entry",
              name: "学校管理",
              kind: "internal",
              target: "/school",
              icon: "School",
              moduleId: "module-school",
              moduleName: "学校管理",
              moduleIcon: "School",
            },
            {
              id: "notice-entry",
              name: "通知公告",
              kind: "internal",
              target: "/notice",
              icon: "Bell",
              moduleId: "module-service",
              moduleName: "公共服务",
              moduleIcon: "LayoutGrid",
            },
          ],
        },
      },
      global: {
        stubs: {
          RouterLink: {
            template: "<a><slot /></a>",
          },
        },
      },
    });

    expect(wrapper.get(".quick-link-name").text()).toBe("学校管理");
    expect(wrapper.findAll(".quick-link-name")).toHaveLength(1);
    expect(wrapper.get(".quick-navigation-icon svg").classes()).toContain("lucide-school");
    const tabs = wrapper.findAll('[role="tab"]');
    expect(tabs.map((tab) => tab.text())).toEqual(["学校管理", "公共服务"]);
    await tabs[1]!.trigger("click");
    expect(wrapper.get(".quick-link-name").text()).toBe("通知公告");
  });
});
