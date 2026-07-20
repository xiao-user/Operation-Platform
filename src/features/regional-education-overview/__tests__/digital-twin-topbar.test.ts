import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import DigitalTwinTopbar from "../components/DigitalTwinTopbar.vue";
import { digitalTwinMapThemes } from "../map-themes";

describe("DigitalTwinTopbar user menu", () => {
  it("switches global role options and exposes the standalone exit action", async () => {
    const wrapper = mount(DigitalTwinTopbar, {
      props: {
        tenantName: "榕城区教育局",
        userName: "罗吴航",
        activeRoleId: "teacher",
        roles: [
          { id: "admin", name: "管理员" },
          { id: "teacher", name: "职员" },
        ],
        formattedDate: "2026-07-16",
        formattedTime: "18:50:00",
        themes: digitalTwinMapThemes,
        activeThemeId: "cyan",
        activeSection: "regional-overview",
      },
    });

    const userButton = wrapper.get(".user-item");
    expect(userButton.attributes("aria-expanded")).toBe("false");
    await userButton.trigger("click");

    expect(userButton.attributes("aria-expanded")).toBe("true");
    const roles = wrapper.findAll('[role="menuitemradio"]');
    expect(roles.map((role) => role.text())).toEqual(["管理员", "职员"]);
    expect(roles[1]?.attributes("aria-checked")).toBe("true");

    await roles[0]?.trigger("click");
    expect(wrapper.emitted("roleSelect")?.[0]).toEqual(["admin"]);
    expect(wrapper.find('[role="menu"]').exists()).toBe(false);

    await userButton.trigger("click");
    await wrapper.get('[role="menuitem"]:nth-of-type(3)').trigger("click");
    expect(wrapper.emitted("changePassword")).toHaveLength(1);

    await userButton.trigger("click");
    await wrapper.get(".exit-action").trigger("click");
    expect(wrapper.emitted("exit")).toHaveLength(1);

    wrapper.unmount();
  });

  it("uses the shared dashboard sections and switches enabled pages", async () => {
    const wrapper = mount(DigitalTwinTopbar, {
      props: {
        tenantName: "榕城区教育局",
        userName: "罗吴航",
        activeRoleId: "admin",
        roles: [{ id: "admin", name: "管理员" }],
        formattedDate: "2026-07-16",
        formattedTime: "18:50:00",
        themes: digitalTwinMapThemes,
        activeThemeId: "cyan",
        activeSection: "regional-overview",
      },
    });

    const navigation = wrapper.get('[role="tablist"][aria-label="驾驶舱主导航"]');
    const tabs = navigation.findAll<HTMLButtonElement>('[role="tab"]');
    expect(tabs).toHaveLength(8);
    expect(tabs.map((tab) => tab.attributes("aria-label"))).toEqual([
      "区域教育总览",
      "学业质量监测",
      "教师发展分析",
      "学生情况分析",
      "办学条件及安全",
      "教育投入与效能",
      "数字教育实施",
      "学前/职教/特教情况",
    ]);
    expect(tabs[0]?.attributes("aria-selected")).toBe("true");
    expect(tabs[0]?.element.disabled).toBe(false);
    expect(tabs[1]?.element.disabled).toBe(false);
    expect(tabs.slice(2).every((tab) => tab.element.disabled)).toBe(true);

    await tabs[1]?.trigger("click");
    expect(wrapper.emitted("sectionSelect")?.[0]).toEqual(["academic-quality"]);
  });
});
