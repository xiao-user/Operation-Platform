import { describe, expect, it, vi } from "vitest";
import { MapNavigationCoordinator } from "../map-navigation-coordinator";

describe("MapNavigationCoordinator", () => {
  it("lets user navigation supersede automatic navigation without clearing busy state", () => {
    const onBusyChange = vi.fn();
    const coordinator = new MapNavigationCoordinator(onBusyChange);
    const automatic = coordinator.begin("automatic")!;

    expect(coordinator.begin("automatic")).toBeUndefined();

    const user = coordinator.begin("user")!;
    expect(automatic.signal.aborted).toBe(true);
    expect(automatic.isCurrent()).toBe(false);
    expect(user.isCurrent()).toBe(true);
    expect(onBusyChange).toHaveBeenCalledTimes(1);
    expect(onBusyChange).toHaveBeenLastCalledWith(true);

    automatic.finish();
    expect(onBusyChange).toHaveBeenCalledTimes(1);

    user.finish();
    expect(onBusyChange).toHaveBeenLastCalledWith(false);
  });

  it("aborts the active task when disposed", () => {
    const onBusyChange = vi.fn();
    const coordinator = new MapNavigationCoordinator(onBusyChange);
    const navigation = coordinator.begin("user")!;

    coordinator.dispose();

    expect(navigation.signal.aborted).toBe(true);
    expect(navigation.isCurrent()).toBe(false);
    expect(onBusyChange).toHaveBeenLastCalledWith(false);
  });
});
