import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AutoFocusTour } from "../auto-focus-tour";
import type { AutoFocusTourAdapter } from "../auto-focus-tour";

function createHarness() {
  let visible = true;
  let currentCode: string | undefined;
  const enterTownship = vi.fn(async (code: string) => {
    currentCode = code;
    return true;
  });
  const leaveTownship = vi.fn(async () => {
    currentCode = undefined;
    return true;
  });
  const adapter: AutoFocusTourAdapter = {
    isVisible: () => visible,
    isTownshipScope: () => currentCode !== undefined,
    currentTownshipCode: () => currentCode,
    townshipCodes: () => ["township-a", "township-b", "township-c"],
    enterTownship,
    leaveTownship,
    districtDwellDurationMs: () => 100,
    townshipDwellDurationMs: () => 30,
  };
  const tour = new AutoFocusTour(adapter);
  return {
    tour,
    enterTownship,
    leaveTownship,
    currentCode: () => currentCode,
    setVisible: (next: boolean) => {
      visible = next;
    },
  };
}

describe("AutoFocusTour", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("dwells on every sibling before returning to the district and rearming idle time", async () => {
    const harness = createHarness();
    harness.tour.start();

    await vi.advanceTimersByTimeAsync(99);
    expect(harness.enterTownship).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(harness.enterTownship.mock.calls.map(([code]) => code)).toEqual(["township-a"]);

    await vi.advanceTimersByTimeAsync(30);
    expect(harness.enterTownship.mock.calls.map(([code]) => code))
      .toEqual(["township-a", "township-b"]);
    expect(harness.leaveTownship).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(30);
    expect(harness.enterTownship.mock.calls.map(([code]) => code))
      .toEqual(["township-a", "township-b", "township-c"]);
    expect(harness.leaveTownship).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(30);
    expect(harness.leaveTownship).toHaveBeenCalledOnce();
    expect(harness.currentCode()).toBeUndefined();

    await vi.advanceTimersByTimeAsync(99);
    expect(harness.enterTownship).toHaveBeenCalledTimes(3);
    await vi.advanceTimersByTimeAsync(1);
    expect(harness.enterTownship).toHaveBeenLastCalledWith("township-a");
    harness.tour.dispose();
  });

  it("starts a full sibling round from the currently focused township", async () => {
    const harness = createHarness();
    await harness.enterTownship("township-b");
    harness.enterTownship.mockClear();
    harness.tour.start();

    await vi.advanceTimersByTimeAsync(100);
    expect(harness.enterTownship).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(30);
    expect(harness.enterTownship).toHaveBeenLastCalledWith("township-c");
    await vi.advanceTimersByTimeAsync(30);
    expect(harness.enterTownship).toHaveBeenLastCalledWith("township-a");
    await vi.advanceTimersByTimeAsync(30);
    expect(harness.leaveTownship).toHaveBeenCalledOnce();
    harness.tour.dispose();
  });

  it("cancels sibling switching on user input and requires a fresh idle period", async () => {
    const harness = createHarness();
    harness.tour.start();
    await vi.advanceTimersByTimeAsync(100);
    expect(harness.enterTownship).toHaveBeenCalledOnce();

    harness.tour.notifyUserActivity();
    await vi.advanceTimersByTimeAsync(99);
    expect(harness.enterTownship).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(1);
    expect(harness.enterTownship).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(30);
    expect(harness.enterTownship).toHaveBeenLastCalledWith("township-b");
    harness.tour.dispose();
  });

  it("does not count time spent in a hidden tab", async () => {
    const harness = createHarness();
    harness.tour.start();
    harness.setVisible(false);
    harness.tour.handleVisibilityChange();
    await vi.advanceTimersByTimeAsync(500);
    expect(harness.enterTownship).not.toHaveBeenCalled();

    harness.setVisible(true);
    harness.tour.handleVisibilityChange();
    await vi.advanceTimersByTimeAsync(100);
    expect(harness.enterTownship).toHaveBeenCalledOnce();
    harness.tour.dispose();
  });
});
