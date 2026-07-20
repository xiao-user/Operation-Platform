import { shallowMount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import AiDataAssistantEntry from "../components/AiDataAssistantEntry.vue";

describe("AiDataAssistantEntry", () => {
  it("renders the Figma entry while the destination page remains unavailable", async () => {
    vi.useFakeTimers();
    const wrapper = shallowMount(AiDataAssistantEntry);
    const link = wrapper.get("a");

    expect(wrapper.get('[data-node-id="2054:2799"]').text()).toBe("AI数据助手");
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

  it("drags within the page boundary and suppresses the click produced by dragging", async () => {
    const wrapper = shallowMount(AiDataAssistantEntry, {
      attachTo: document.body,
      props: { href: "/bureau/visualization/ai-data-assistant" },
    });
    const link = wrapper.get<HTMLAnchorElement>("a");
    vi.spyOn(link.element.parentElement!, "getBoundingClientRect").mockReturnValue({
      x: 0,
      y: 0,
      top: 0,
      right: 500,
      bottom: 400,
      left: 0,
      width: 500,
      height: 400,
      toJSON: () => undefined,
    });
    vi.spyOn(link.element, "getBoundingClientRect").mockReturnValue({
      x: 330,
      y: 250,
      top: 250,
      right: 480,
      bottom: 306,
      left: 330,
      width: 150,
      height: 56,
      toJSON: () => undefined,
    });

    function dispatchPointer(
      type: string,
      values: { button?: number; pointerId: number; clientX?: number; clientY?: number },
    ) {
      const event = new Event(type, { bubbles: true, cancelable: true });
      Object.defineProperties(event, {
        button: { value: values.button ?? 0 },
        pointerId: { value: values.pointerId },
        clientX: { value: values.clientX ?? 0 },
        clientY: { value: values.clientY ?? 0 },
      });
      link.element.dispatchEvent(event);
    }

    dispatchPointer("pointerdown", {
      button: 0,
      pointerId: 7,
      clientX: 400,
      clientY: 280,
    });
    dispatchPointer("pointermove", {
      pointerId: 7,
      clientX: 300,
      clientY: 180,
    });
    expect(link.element.style.getPropertyValue("--ai-entry-drag-x")).toBe("-100px");
    expect(link.element.style.getPropertyValue("--ai-entry-drag-y")).toBe("-100px");
    expect(link.classes()).toContain("is-dragging");

    dispatchPointer("pointerup", { pointerId: 7 });
    let clickPrevented = false;
    link.element.addEventListener("click", (event) => {
      clickPrevented = event.defaultPrevented;
    }, { once: true });
    await link.trigger("click");
    expect(clickPrevented).toBe(true);
    expect(link.classes()).not.toContain("is-dragging");

    wrapper.unmount();
  });
});
