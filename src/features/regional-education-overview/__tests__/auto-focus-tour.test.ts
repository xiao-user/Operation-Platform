import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AutoFocusTour } from "../auto-focus-tour";
import type { AutoFocusTourAdapter } from "../auto-focus-tour";

function createHarness() {
  let visible = true;
  let currentCode: string | undefined;
  const enterChild = vi.fn(async (code: string) => {
    currentCode = code;
    return true;
  });
  const leaveChild = vi.fn(async () => {
    currentCode = undefined;
    return true;
  });
  const adapter: AutoFocusTourAdapter = {
    isVisible: () => visible,
    isChildScope: () => currentCode !== undefined,
    currentChildCode: () => currentCode,
    childCodes: () => ["child-a", "child-b", "child-c"],
    enterChild,
    leaveChild,
    parentDwellDurationMs: () => 100,
    childDwellDurationMs: () => 30,
  };
  const tour = new AutoFocusTour(adapter);
  return {
    tour,
    enterChild,
    leaveChild,
    currentCode: () => currentCode,
    setVisible: (next: boolean) => {
      visible = next;
    },
  };
}

describe("AutoFocusTour", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("dwells on every child before returning to the parent and rearming idle time", async () => {
    const harness = createHarness();
    harness.tour.start();

    await vi.advanceTimersByTimeAsync(99);
    expect(harness.enterChild).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(harness.enterChild.mock.calls.map(([code]) => code)).toEqual(["child-a"]);

    await vi.advanceTimersByTimeAsync(30);
    expect(harness.enterChild.mock.calls.map(([code]) => code))
      .toEqual(["child-a", "child-b"]);
    expect(harness.leaveChild).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(30);
    expect(harness.enterChild.mock.calls.map(([code]) => code))
      .toEqual(["child-a", "child-b", "child-c"]);
    expect(harness.leaveChild).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(30);
    expect(harness.leaveChild).toHaveBeenCalledOnce();
    expect(harness.currentCode()).toBeUndefined();

    await vi.advanceTimersByTimeAsync(99);
    expect(harness.enterChild).toHaveBeenCalledTimes(3);
    await vi.advanceTimersByTimeAsync(1);
    expect(harness.enterChild).toHaveBeenLastCalledWith("child-a");
    harness.tour.dispose();
  });

  it("starts a full sibling round from the currently focused child", async () => {
    const harness = createHarness();
    await harness.enterChild("child-b");
    harness.enterChild.mockClear();
    harness.tour.start();

    await vi.advanceTimersByTimeAsync(100);
    expect(harness.enterChild).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(30);
    expect(harness.enterChild).toHaveBeenLastCalledWith("child-c");
    await vi.advanceTimersByTimeAsync(30);
    expect(harness.enterChild).toHaveBeenLastCalledWith("child-a");
    await vi.advanceTimersByTimeAsync(30);
    expect(harness.leaveChild).toHaveBeenCalledOnce();
    harness.tour.dispose();
  });

  it("cancels sibling switching on user input and requires a fresh idle period", async () => {
    const harness = createHarness();
    harness.tour.start();
    await vi.advanceTimersByTimeAsync(100);
    expect(harness.enterChild).toHaveBeenCalledOnce();

    harness.tour.notifyUserActivity();
    await vi.advanceTimersByTimeAsync(99);
    expect(harness.enterChild).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(1);
    expect(harness.enterChild).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(30);
    expect(harness.enterChild).toHaveBeenLastCalledWith("child-b");
    harness.tour.dispose();
  });

  it("does not count time spent in a hidden tab", async () => {
    const harness = createHarness();
    harness.tour.start();
    harness.setVisible(false);
    harness.tour.handleVisibilityChange();
    await vi.advanceTimersByTimeAsync(500);
    expect(harness.enterChild).not.toHaveBeenCalled();

    harness.setVisible(true);
    harness.tour.handleVisibilityChange();
    await vi.advanceTimersByTimeAsync(100);
    expect(harness.enterChild).toHaveBeenCalledOnce();
    harness.tour.dispose();
  });
});
