import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import WorkbenchSecondaryTabs from "@/features/workbench/components/WorkbenchSecondaryTabs.vue";

describe("WorkbenchSecondaryTabs", () => {
  it("keeps scrolling and tab state on separate elements", async () => {
    const wrapper = mount(WorkbenchSecondaryTabs, {
      props: {
        modelValue: "all",
        options: [
          { label: "全部应用", value: "all" },
          { label: "协同管理", value: "collaboration" },
        ],
        "onUpdate:modelValue": (value: string) => wrapper.setProps({ modelValue: value }),
      },
    });

    expect(wrapper.get(".secondary-tabs-viewport").find('[role="tablist"]').exists()).toBe(true);
    expect(wrapper.get('[data-state="active"]').text()).toBe("全部应用");

    await wrapper.findAll('[role="tab"]')[1]!.trigger("click");

    expect(wrapper.get('[data-state="active"]').text()).toBe("协同管理");
    expect(wrapper.get('[role="tab"][aria-selected="true"]').text()).toBe("协同管理");
  });
});
