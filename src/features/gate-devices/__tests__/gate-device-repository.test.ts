import { describe, expect, it } from "vitest";
import { gateDeviceRepository } from "@/features/gate-devices/gate-device-repository";

describe("gate device repository", () => {
  it("persists group, move, and delete operations through the feature contract", async () => {
    const tenantId = "gate-repository-test";
    await gateDeviceRepository.saveGroup(tenantId, {
      id: "temporary-group",
      parentId: "all",
      name: "临时分组",
      sortOrder: 99,
    });
    await gateDeviceRepository.moveDevices(tenantId, [1], "temporary-group");

    let snapshot = await gateDeviceRepository.load(tenantId);
    expect(snapshot.groups).toContainEqual(expect.objectContaining({ id: "temporary-group" }));
    expect(snapshot.devices.find((device) => device.id === 1)?.groupId).toBe("temporary-group");
    await expect(
      gateDeviceRepository.deleteGroup(tenantId, "temporary-group"),
    ).rejects.toThrow("仍有设备");

    await gateDeviceRepository.moveDevices(tenantId, [1], "all");
    await gateDeviceRepository.deleteGroup(tenantId, "temporary-group");
    await gateDeviceRepository.deleteDevices(tenantId, [1]);

    snapshot = await gateDeviceRepository.load(tenantId);
    expect(snapshot.groups.some((group) => group.id === "temporary-group")).toBe(false);
    expect(snapshot.devices.some((device) => device.id === 1)).toBe(false);
  });
});
