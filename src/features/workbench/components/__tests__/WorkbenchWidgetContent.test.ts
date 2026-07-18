import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import WorkbenchWidgetContent from "@/features/workbench/components/WorkbenchWidgetContent.vue";

describe("WorkbenchWidgetContent quick links", () => {
  it("renders a filled Element icon and a single link label", () => {
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
    expect(wrapper.get(".quick-link-icon path").attributes("fill")).toBe("currentColor");
  });
});
