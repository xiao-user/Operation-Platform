import { shallowMount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import AiDataAssistantEntry from "../components/AiDataAssistantEntry.vue";

describe("AiDataAssistantEntry", () => {
  it("renders the Figma entry while the destination page remains unavailable", async () => {
    vi.useFakeTimers();
    const wrapper = shallowMount(AiDataAssistantEntry);
    const link = wrapper.get("a");

    expect(link.text()).toBe("AI数据助手");
    expect(link.attributes()).toMatchObject({
      href: "#",
      target: "_blank",
      rel: "noopener noreferrer",
      "aria-disabled": "true",
      "data-node-id": "2054:2781",
    });
    const orb = wrapper.getComponent({ name: "CloudOrb" });
    expect(orb.props()).toMatchObject({
      state: "listening",
      size: 40,
      diameterRatio: 0.8,
    });
    vi.advanceTimersByTime(4_000);
    await wrapper.vm.$nextTick();
    expect(orb.props("state")).toBe("speaking");
    vi.advanceTimersByTime(4_000);
    await wrapper.vm.$nextTick();
    expect(orb.props("state")).toBe("listening");

    await link.trigger("click");
    expect(link.element.getAttribute("href")).toBe("#");
    wrapper.unmount();
    vi.useRealTimers();
  });

  it("opens a configured destination in a new tab", () => {
    const wrapper = shallowMount(AiDataAssistantEntry, {
      props: { href: "/bureau/visualization/ai-data-assistant" },
    });
    const link = wrapper.get("a");

    expect(link.attributes("href")).toBe("/bureau/visualization/ai-data-assistant");
    expect(link.attributes("target")).toBe("_blank");
    expect(link.attributes("aria-disabled")).toBeUndefined();
    wrapper.unmount();
  });
});
