import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import LocationProfilePanel from "../components/LocationProfilePanel.vue";
import {
  educationLocationTypeMeta,
  rongchengEducationLocations,
} from "../education-locations";

const locations = rongchengEducationLocations.slice(0, 5);
const lastLocation = locations[locations.length - 1]!;

describe("LocationProfilePanel school locator", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows schools in the active scope and updates the profile after selection", async () => {
    const wrapper = mount(LocationProfilePanel, {
      props: {
        location: locations[0],
        locations,
        scopeName: "榕城区",
        formattedDate: "2026-07-15",
      },
    });

    const schools = locations.filter((location) => location.type !== "bureau");
    expect(wrapper.findAll(".school-list-item")).toHaveLength(schools.length);
    expect(wrapper.findAll(".school-list-item").map((item) => item.text()))
      .toEqual(schools.map((school) => `${school.name}${educationLocationTypeMeta[school.type].label}`));
    expect(wrapper.findAll(".school-list-item").map((item) => item.attributes("aria-label")))
      .toEqual(schools.map((school) => `切换至${school.name}`));
    expect(wrapper.find(".pagination-item").exists()).toBe(false);

    const schoolRows = wrapper.findAll(".school-list-item");
    await schoolRows[schoolRows.length - 1]?.trigger("click");
    expect(wrapper.emitted("locationSelect")?.[0]?.[0]).toEqual(lastLocation);
    expect(wrapper.emitted("schoolNavigate")?.[0]?.[0]).toEqual(lastLocation);
    await wrapper.setProps({ location: lastLocation });
    expect(wrapper.get(".school-list-item.is-active").attributes("data-school-id"))
      .toBe(lastLocation.id);
    expect(wrapper.get(".profile-content h2").text()).toBe(lastLocation.name);
    expect(wrapper.get(".entity-emblem img").attributes("src"))
      .toContain("data:image/svg+xml");

    const collaborationTab = wrapper.get('[role="tab"][aria-controls="collaboration-panel"]');
    const noticeTab = wrapper.get('[role="tab"][aria-controls="school-notice-panel"]');
    expect(collaborationTab.text()).toBe("协同办公");
    expect(collaborationTab.attributes("aria-selected")).toBe("true");
    expect(wrapper.findAll("#collaboration-panel .detail-grid")).toHaveLength(2);
    expect(wrapper.findAll("#collaboration-panel .accordion-list details")).toHaveLength(3);
    await noticeTab.trigger("click");
    expect(noticeTab.text()).toBe("通知信息");
    expect(noticeTab.attributes("aria-selected")).toBe("true");
    expect(wrapper.find("#collaboration-panel").exists()).toBe(false);
    expect(wrapper.findAll("#school-notice-panel .detail-grid")).toHaveLength(2);
    expect(wrapper.findAll("#school-notice-panel .accordion-list details")).toHaveLength(3);
    expect(wrapper.get("#school-notice-panel").text()).toContain("学校基础信息核验");

    wrapper.unmount();
  });

  it("scrolls by one school row per interval and pauses while the list is in use", async () => {
    vi.useFakeTimers();
    const wrapper = mount(LocationProfilePanel, {
      props: {
        location: locations[0],
        locations,
        scopeName: "榕城区",
        formattedDate: "2026-07-15",
      },
    });
    const scroller = wrapper.get(".school-list");
    Object.defineProperties(scroller.element, {
      clientHeight: { configurable: true, value: 240 },
      scrollHeight: { configurable: true, value: 480 },
      scrollTop: { configurable: true, value: 0, writable: true },
    });
    const rows = wrapper.findAll<HTMLElement>(".school-list-item");
    rows.forEach((row, index) => {
      Object.defineProperty(row.element, "offsetTop", {
        configurable: true,
        value: index * 48,
      });
    });
    const scrollTo = vi.fn();
    Object.defineProperty(scroller.element, "scrollTo", { configurable: true, value: scrollTo });

    await vi.advanceTimersByTimeAsync(4_000);
    expect(scrollTo).toHaveBeenLastCalledWith({ top: 48, behavior: "smooth" });

    await scroller.trigger("pointerenter");
    scrollTo.mockClear();
    await vi.advanceTimersByTimeAsync(8_000);
    expect(scrollTo).not.toHaveBeenCalled();

    await scroller.trigger("pointerleave");
    await vi.advanceTimersByTimeAsync(4_000);
    expect(scrollTo).toHaveBeenCalledOnce();

    wrapper.unmount();
  });

  it("starts accordion animation before updating the native details state", async () => {
    const wrapper = mount(LocationProfilePanel, {
      props: {
        location: locations[0],
        locations,
        scopeName: "榕城区",
        formattedDate: "2026-07-15",
      },
    });
    const firstDetails = wrapper.get<HTMLDetailsElement>(".accordion-list details");
    const content = firstDetails.get<HTMLElement>(".accordion-content");

    expect(firstDetails.element.open).toBe(true);
    await firstDetails.get("summary").trigger("click");
    expect(firstDetails.element.open).toBe(true);
    expect(content.attributes("style")).toContain("overflow: hidden");

    const secondDetails = wrapper.findAll<HTMLDetailsElement>(".accordion-list details")[1]!;
    await secondDetails.get("summary").trigger("click");
    expect(secondDetails.element.open).toBe(true);
    expect(secondDetails.get(".accordion-content").attributes("style"))
      .toContain("overflow: hidden");

    wrapper.unmount();
  });
});
