import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import ElementPlus from "element-plus";
import WorkbenchCalendarAgenda from "@/features/workbench/components/WorkbenchCalendarAgenda.vue";

function localIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

describe("WorkbenchCalendarAgenda", () => {
  it("renders the Figma-derived date summary and schedule card hierarchy", () => {
    const today = new Date();
    const wrapper = mount(WorkbenchCalendarAgenda, {
      props: {
        data: {
          kind: "calendar",
          events: [{
            id: "meeting-1",
            date: localIsoDate(today),
            time: "09:30",
            endTime: "11:00",
            title: "重点项目周调度会",
            type: "meeting",
            status: "pending",
            location: "第一会议室",
            audience: "项目负责人",
          }],
        },
      },
      global: {
        plugins: [ElementPlus],
      },
    });

    expect(wrapper.get(".calendar-period strong").text()).toContain(`${today.getFullYear()}年`);
    expect(wrapper.get(".agenda-date-number").text()).toBe(String(today.getDate()));
    expect(wrapper.get(".agenda-event-card").text()).toContain("会议日程");
    expect(wrapper.get(".agenda-event-card").text()).toContain("09:30～11:00");
    expect(wrapper.get(".agenda-event-card").text()).toContain("第一会议室");
    expect(wrapper.find('button[aria-label="新增日程"]').exists()).toBe(true);
  });
});
