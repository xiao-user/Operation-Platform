import { dataBackend } from "@/config/runtime-providers";
import { getSupabaseClient } from "@/lib/supabase";

export interface GateDeviceGroup {
  id: string;
  parentId: string | null;
  name: string;
  sortOrder: number;
}

export interface GateDeviceSubInfo {
  group: string;
  timezone: string;
}

export interface GateDevice {
  id: number;
  name: string;
  channelType: "dual" | "single";
  statusKey: "online" | "offline" | "running";
  statusLabel: string;
  code: string;
  location: string;
  groupId: string;
  subInfo: GateDeviceSubInfo[];
}

export interface GateDeviceSnapshot {
  groups: GateDeviceGroup[];
  devices: GateDevice[];
}

export interface GateDeviceRepository {
  load(tenantId: string): Promise<GateDeviceSnapshot>;
  saveGroup(tenantId: string, group: GateDeviceGroup): Promise<GateDeviceGroup>;
  deleteGroup(tenantId: string, groupId: string): Promise<void>;
  moveDevices(tenantId: string, deviceIds: number[], groupId: string): Promise<void>;
  deleteDevices(tenantId: string, deviceIds: number[]): Promise<void>;
}

function cloneSnapshot(snapshot: GateDeviceSnapshot): GateDeviceSnapshot {
  return {
    groups: snapshot.groups.map((group) => ({ ...group })),
    devices: snapshot.devices.map((device) => ({
      ...device,
      subInfo: device.subInfo.map((item) => ({ ...item })),
    })),
  };
}

const localSnapshots = new Map<string, GateDeviceSnapshot>();

async function localSnapshot(tenantId: string) {
  const stored = localSnapshots.get(tenantId);
  if (stored) return stored;
  const { defaultGateDeviceSnapshot } = await import("@/mock/security/gateDevices");
  const initial = cloneSnapshot(defaultGateDeviceSnapshot);
  localSnapshots.set(tenantId, initial);
  return initial;
}

const localGateDeviceRepository: GateDeviceRepository = {
  async load(tenantId) {
    return cloneSnapshot(await localSnapshot(tenantId));
  },
  async saveGroup(tenantId, group) {
    const snapshot = await localSnapshot(tenantId);
    const index = snapshot.groups.findIndex((item) => item.id === group.id);
    if (index >= 0) snapshot.groups[index] = { ...group };
    else snapshot.groups.push({ ...group });
    return { ...group };
  },
  async deleteGroup(tenantId, groupId) {
    const snapshot = await localSnapshot(tenantId);
    const removed = new Set([groupId]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const group of snapshot.groups) {
        if (group.parentId && removed.has(group.parentId) && !removed.has(group.id)) {
          removed.add(group.id);
          changed = true;
        }
      }
    }
    if (snapshot.devices.some((device) => removed.has(device.groupId))) {
      throw new Error("该分组或子分组仍有设备，请先调组");
    }
    snapshot.groups = snapshot.groups.filter((group) => !removed.has(group.id));
  },
  async moveDevices(tenantId, deviceIds, groupId) {
    const ids = new Set(deviceIds);
    for (const device of (await localSnapshot(tenantId)).devices) {
      if (ids.has(device.id)) device.groupId = groupId;
    }
  },
  async deleteDevices(tenantId, deviceIds) {
    const ids = new Set(deviceIds);
    const snapshot = await localSnapshot(tenantId);
    snapshot.devices = snapshot.devices.filter((device) => !ids.has(device.id));
  },
};

interface GroupDto {
  id: string;
  parent_id: string | null;
  name: string;
  sort_order: number;
}

interface DeviceDto {
  id: number;
  name: string;
  channel_type: GateDevice["channelType"];
  status_key: GateDevice["statusKey"];
  status_label: string;
  code: string;
  location: string;
  group_id: string;
  sub_info: GateDeviceSubInfo[];
}

const supabaseGateDeviceRepository: GateDeviceRepository = {
  async load(tenantId) {
    const client = getSupabaseClient();
    const [groupsResult, devicesResult] = await Promise.all([
      client.from("gate_device_groups").select("id,parent_id,name,sort_order").eq("tenant_id", tenantId).order("sort_order"),
      client.from("gate_devices").select("id,name,channel_type,status_key,status_label,code,location,group_id,sub_info").eq("tenant_id", tenantId).order("id"),
    ]);
    if (groupsResult.error) throw new Error(groupsResult.error.message || "设备分组读取失败");
    if (devicesResult.error) throw new Error(devicesResult.error.message || "门禁设备读取失败");
    return {
      groups: (groupsResult.data as GroupDto[]).map((row) => ({
        id: row.id,
        parentId: row.parent_id,
        name: row.name,
        sortOrder: row.sort_order,
      })),
      devices: (devicesResult.data as DeviceDto[]).map((row) => ({
        id: Number(row.id),
        name: row.name,
        channelType: row.channel_type,
        statusKey: row.status_key,
        statusLabel: row.status_label,
        code: row.code,
        location: row.location,
        groupId: row.group_id,
        subInfo: Array.isArray(row.sub_info) ? row.sub_info.map((item) => ({ ...item })) : [],
      })),
    };
  },
  async saveGroup(tenantId, group) {
    const { error } = await getSupabaseClient().from("gate_device_groups").upsert({
      tenant_id: tenantId,
      id: group.id,
      parent_id: group.parentId,
      name: group.name,
      sort_order: group.sortOrder,
    }, { onConflict: "tenant_id,id" });
    if (error) throw new Error(error.message || "设备分组保存失败");
    return { ...group };
  },
  async deleteGroup(tenantId, groupId) {
    const { error } = await getSupabaseClient()
      .from("gate_device_groups")
      .delete()
      .eq("tenant_id", tenantId)
      .eq("id", groupId);
    if (error) throw new Error(error.message || "设备分组删除失败");
  },
  async moveDevices(tenantId, deviceIds, groupId) {
    const { error } = await getSupabaseClient()
      .from("gate_devices")
      .update({ group_id: groupId })
      .eq("tenant_id", tenantId)
      .in("id", deviceIds);
    if (error) throw new Error(error.message || "设备调组失败");
  },
  async deleteDevices(tenantId, deviceIds) {
    const { error } = await getSupabaseClient()
      .from("gate_devices")
      .delete()
      .eq("tenant_id", tenantId)
      .in("id", deviceIds);
    if (error) throw new Error(error.message || "设备移除失败");
  },
};

export const gateDeviceRepository: GateDeviceRepository = dataBackend === "supabase"
  ? supabaseGateDeviceRepository
  : localGateDeviceRepository;
