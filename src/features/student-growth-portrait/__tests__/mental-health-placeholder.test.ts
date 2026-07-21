import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import MentalHealthPlaceholder from "../components/MentalHealthPlaceholder.vue";

describe("MentalHealthPlaceholder", () => {
  it("shows a safe planning state without fabricated risk conclusions", () => {
    const wrapper = mount(MentalHealthPlaceholder, {
      global: {
        stubs: {
          ElAlert: { template: "<div><slot /></div>" },
          ElIcon: { template: "<span><slot /></span>" },
          ElTable: { template: "<div><slot /></div>" },
          ElTableColumn: true,
          ElTag: { template: "<span><slot /></span>" },
        },
      },
    });

    expect(wrapper.text()).toContain("已规划 · 待数据接入");
    expect(wrapper.text()).toContain("不展示原始答卷、咨询文本或学生心理标签");
    expect(wrapper.text()).not.toMatch(/高风险\s*\d+/);
    expect(wrapper.text()).not.toContain("心理健康得分");
  });
});
