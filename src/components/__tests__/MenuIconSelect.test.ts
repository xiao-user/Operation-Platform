import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import MenuIconSelect from "@/components/MenuIconSelect.vue";
import { menuIconOptions } from "@/components/menu-icon-options";

describe("MenuIconSelect", () => {
  it("shows one readable name for each option", () => {
    const firstOption = menuIconOptions[0]!;
    const wrapper = mount(MenuIconSelect, {
      props: {
        modelValue: null,
        "onUpdate:modelValue": () => undefined,
      },
      global: {
        stubs: {
          ElSelectV2: {
            props: ["options"],
            template: '<div><slot :item="options[0]" /></div>',
          },
        },
      },
    });

    expect(wrapper.get(".icon-option-name").text()).toBe(firstOption.label);
    expect(wrapper.findAll(".icon-option-name")).toHaveLength(1);
    expect(wrapper.find(".icon-option-key").exists()).toBe(false);
  });
});
