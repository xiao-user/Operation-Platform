import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AnimatedNumber from "../components/AnimatedNumber.vue";

const gsapMocks = vi.hoisted(() => ({
  to: vi.fn(),
  kill: vi.fn(),
  revert: vi.fn(),
}));

vi.mock("gsap", () => ({
  gsap: {
    to: gsapMocks.to,
    matchMedia: () => ({
      add: (
        _conditions: Record<string, string>,
        callback: (context: { conditions: { reduceMotion: boolean } }) => void,
      ) => callback({ conditions: { reduceMotion: false } }),
      revert: gsapMocks.revert,
    }),
  },
}));

describe("AnimatedNumber", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    gsapMocks.to.mockReturnValue({ kill: gsapMocks.kill });
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn(),
    });
  });

  it("uses the shared zero-origin tween for integer and decimal metrics", async () => {
    const wrapper = mount(AnimatedNumber, {
      props: {
        value: 18.76,
        precision: 1,
        formatter: (value) => value.toFixed(1),
      },
    });

    expect(wrapper.text()).toBe("0.0");
    const [state, options] = gsapMocks.to.mock.calls[0] as unknown as [
      { value: number },
      { onUpdate: () => void },
    ];
    expect(state.value).toBe(0);

    state.value = 12.34;
    options.onUpdate();
    await nextTick();
    expect(wrapper.text()).toBe("12.3");

    await wrapper.setProps({ value: 25.5 });
    const [nextState] = gsapMocks.to.mock.calls[1] as unknown as [{ value: number }];
    expect(nextState.value).toBe(12.3);
    wrapper.unmount();
    expect(gsapMocks.revert).toHaveBeenCalledOnce();
  });
});
