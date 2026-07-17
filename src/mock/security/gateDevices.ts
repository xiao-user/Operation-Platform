import type { GateDeviceSnapshot } from "@/features/gate-devices/gate-device-repository";

export const defaultGateDeviceSnapshot: GateDeviceSnapshot = {
  groups: [
    { id: "all", parentId: null, name: "全部设备", sortOrder: 0 },
    { id: "gate", parentId: "all", name: "校门口", sortOrder: 0 },
    { id: "main-gate", parentId: "gate", name: "正门", sortOrder: 0 },
    { id: "side-gate", parentId: "gate", name: "侧门", sortOrder: 1 },
    { id: "canteen", parentId: "all", name: "食堂", sortOrder: 1 },
    { id: "dorm", parentId: "all", name: "宿舍", sortOrder: 2 },
    { id: "more", parentId: "all", name: "更多", sortOrder: 3 },
  ],
  devices: [
    { id: 1, name: "校正门-人脸闸机1", channelType: "dual", statusKey: "online", statusLabel: "在线", code: "G001-MAIN-01", location: "校正面左侧", groupId: "main-gate", subInfo: [{ group: "测试A组", timezone: "固定全天通行" }] },
    { id: 2, name: "校正门-人脸闸机6", channelType: "single", statusKey: "online", statusLabel: "在线", code: "G001-SIDE-02", location: "校正面右侧", groupId: "side-gate", subInfo: [{ group: "测试B组", timezone: "晚上通行" }] },
    { id: 3, name: "校正门-人脸闸机5", channelType: "dual", statusKey: "offline", statusLabel: "离线", code: "G001-MAIN-05", location: "正门内测", groupId: "main-gate", subInfo: [{ group: "测试A组", timezone: "早班时区" }] },
    { id: 4, name: "校正门-人脸闸机3", channelType: "dual", statusKey: "online", statusLabel: "在线", code: "G001-MAIN-03", location: "正门北柱", groupId: "all", subInfo: [{ group: "测试C组", timezone: "特定通道时区" }] },
    { id: 5, name: "食堂人脸闸机4", channelType: "single", statusKey: "online", statusLabel: "在线", code: "C002-DOOR-01", location: "食堂侧门", groupId: "canteen", subInfo: [{ group: "后勤组", timezone: "就餐时段通行" }] },
    { id: 6, name: "树木园围墙闸机1", channelType: "dual", statusKey: "online", statusLabel: "在线", code: "G002-SIDE-01", location: "后山入口", groupId: "all", subInfo: [{ group: "巡逻组", timezone: "特定工作时段" }] },
    { id: 7, name: "后门通道闸机3", channelType: "single", statusKey: "offline", statusLabel: "离线", code: "G003-BACK-03", location: "北门后墙", groupId: "all", subInfo: [{ group: "维保组", timezone: "维保测试时段" }] },
    { id: 8, name: "宿舍闸机1", channelType: "single", statusKey: "online", statusLabel: "在线", code: "D003-MAIN-01", location: "宿舍A座", groupId: "dorm", subInfo: [{ group: "宿管组", timezone: "查寝通行时段" }] },
    { id: 9, name: "宿舍闸机2", channelType: "dual", statusKey: "online", statusLabel: "在线", code: "D003-MAIN-02", location: "宿舍B座", groupId: "dorm", subInfo: [{ group: "学生组", timezone: "归寝限制时段" }] },
    { id: 10, name: "体育馆人脸主入口", channelType: "dual", statusKey: "online", statusLabel: "在线", code: "S004-MAIN-01", location: "体育馆正门", groupId: "all", subInfo: [{ group: "学生组", timezone: "课程及自由时间" }] },
  ],
};
