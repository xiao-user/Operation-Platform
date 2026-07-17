<template>
  <NewGatePageShell active-tab="device-list" show-info-icon>
    <div class="device-page">
      <div class="filter-bar">
        <div class="form-item">
          <span class="form-label">厂商：</span>
          <el-select v-model="filterForm.vendor" placeholder="中拓门禁" clearable>
            <el-option label="中拓门禁" value="zhongtuo" />
            <el-option label="海康威视" value="hikvision" />
            <el-option label="大华" value="dahua" />
          </el-select>
        </div>
        <div class="form-item">
          <span class="form-label">设备名称：</span>
          <el-input v-model="filterForm.deviceName" placeholder="请输入设备名称" :prefix-icon="Search" clearable />
        </div>
        <div class="form-item">
          <span class="form-label">设备地点：</span>
          <el-input v-model="filterForm.location" placeholder="请输入设备地点" :prefix-icon="Search" clearable />
        </div>
        <div class="form-btn">
          <el-button type="primary" class="search-btn" @click="handleSearch">
            <el-icon><Search /></el-icon> 查询
          </el-button>
        </div>
      </div>

      <div class="content-body">

        <div class="tree-panel">
          <div class="tree-search">
            <div class="tree-search-input">
              <input v-model="treeSearch" placeholder="请输入关键词" class="tree-input" />
              <button class="tree-search-btn">
                <el-icon><Search /></el-icon>
              </button>
            </div>
          </div>
          <div class="tree-nodes">
            <div v-for="node in filteredTree" :key="node.id">
              <div
                class="tree-node"
                :class="{ selected: selectedNode === node.id }"
                @click="selectNode(node.id)"
              >
                <div class="node-content">
                  <el-icon
                    v-if="node.children && node.children.length"
                    class="node-arrow"
                    :class="{ expanded: node.expanded }"
                    @click.stop="toggleNode(node)"
                  >
                    <ArrowRight />
                  </el-icon>
                  <div v-else class="node-dot-offset"></div>
                  <span class="node-label">{{ node.name }}</span>
                </div>
                <el-popover
                  placement="bottom-end"
                  :width="120"
                  trigger="click"
                  popper-class="custom-tree-popover"
                >
                  <template #reference>
                    <span class="node-more" @click.stop><MoreIcon /></span>
                  </template>
                  <div class="popover-menu">
                    <div class="menu-item" @click="handleMenuAction('添加子级', node)">添加子级</div>
                    <div class="menu-item" @click="handleMenuAction('编辑', node)">编辑</div>
                    <div class="menu-item danger" @click="handleMenuAction('删除', node)">删除</div>
                  </div>
                </el-popover>
              </div>
              <template v-if="node.expanded && node.children">
                <div v-for="child in node.children" :key="child.id">
                  <div
                    class="tree-node tree-node-l1"
                    :class="{ selected: selectedNode === child.id }"
                    @click="selectNode(child.id)"
                  >
                    <div class="node-content">
                      <el-icon
                        v-if="child.children && child.children.length"
                        class="node-arrow"
                        :class="{ expanded: child.expanded }"
                        @click.stop="toggleNode(child)"
                      >
                        <ArrowRight />
                      </el-icon>
                      <div v-else class="node-dot-offset"></div>
                      <span class="node-label">{{ child.name }}</span>
                    </div>
                    <el-popover
                      placement="bottom-end"
                      :width="120"
                      trigger="click"
                      popper-class="custom-tree-popover"
                    >
                      <template #reference>
                        <span class="node-more" @click.stop><MoreIcon /></span>
                      </template>
                      <div class="popover-menu">
                        <div class="menu-item" @click="handleMenuAction('添加子级', child)">添加子级</div>
                        <div class="menu-item" @click="handleMenuAction('编辑', child)">编辑</div>
                        <div class="menu-item danger" @click="handleMenuAction('删除', child)">删除</div>
                      </div>
                    </el-popover>
                  </div>
                  <template v-if="child.expanded && child.children">
                    <div
                      v-for="grand in child.children"
                      :key="grand.id"
                      class="tree-node tree-node-l2"
                      :class="{ selected: selectedNode === grand.id }"
                      @click="selectNode(grand.id)"
                    >
                      <div class="node-content">
                        <div class="node-dot-offset"></div>
                        <span class="node-label">{{ grand.name }}</span>
                      </div>
                      <el-popover
                        placement="bottom-end"
                        :width="120"
                        trigger="click"
                        popper-class="custom-tree-popover"
                      >
                        <template #reference>
                          <span class="node-more" @click.stop><MoreIcon /></span>
                        </template>
                        <div class="popover-menu">
                          <div class="menu-item" @click="handleMenuAction('添加子级', grand)">添加子级</div>
                          <div class="menu-item" @click="handleMenuAction('编辑', grand)">编辑</div>
                          <div class="menu-item danger" @click="handleMenuAction('删除', grand)">删除</div>
                        </div>
                      </el-popover>
                    </div>
                  </template>
                </div>
              </template>
            </div>
          </div>
        </div>

        <div class="table-panel">
          <div class="toolbar">
            <button class="btn-text-blue" @click="handleOperationLog">操作日志</button>
            <button class="btn-outline" @click="handleBatchAction('时间段')">时间段</button>
            <button class="btn-outline" @click="handleBatchAction('时区')">时区</button>
            <button class="btn-outline" @click="handleBatchAction('批量移入')">批量移入</button>
            <button class="btn-outline" @click="handleBatchAction('批量移除')">批量移除</button>
            <button class="btn-outline" @click="handleBatchAction('批量调组')">批量调组</button>
            <button class="btn-export" @click="handleExport">导出</button>
            <button class="btn-primary" @click="handleAdd">
              <el-icon><Plus /></el-icon> 新增权限
            </button>
          </div>

          <div class="table-container">
            <div class="table-header">
              <div class="col-checkbox">
                <el-checkbox v-model="selectAll" @change="handleSelectAll" />
              </div>
              <div class="col-name">设备名称</div>
              <div class="col-code">设备编码</div>
              <div class="col-location">设备地点</div>
              <div class="col-group">所在设备分组</div>
              <div class="col-action">操作</div>
            </div>

            <div class="table-body">
              <div
                v-for="row in filteredTableData"
                :key="row.id"
                class="table-row-card"
              >
                <div class="table-row" @click="toggleRow(row)">
                  <div class="col-checkbox" @click.stop>
                    <el-checkbox v-model="row.checked" />
                  </div>
                  <div class="col-name">
                    <span class="device-name">{{ row.name }}</span>
                    <el-tag
                      size="small"
                      :type="row.channelType === 'dual' ? 'primary' : 'info'"
                      effect="plain"
                    >
                      {{ row.channelType === 'dual' ? '双向' : '单向' }}
                    </el-tag>
                    <el-tag
                      size="small"
                      :type="getStatusType(row.statusKey)"
                    >
                      {{ row.statusLabel }}
                    </el-tag>
                  </div>
                  <div class="col-code">{{ row.code }}</div>
                  <div class="col-location">{{ row.location }}</div>
                  <div class="col-group">{{ row.group }}</div>
                  <div class="col-action" @click.stop>
                    <span class="action-link" @click="handleTiaozu(row)">调组</span>
                    <span class="action-link" @click="handleRemove(row)">移除</span>
                    <span class="action-link" @click="handlePermission(row)">权限</span>
                    <el-icon class="action-arrow" :class="{ rotated: row.expanded }"><ArrowRight /></el-icon>
                  </div>
                </div>

                <template v-if="row.expanded && row.subInfo && row.subInfo.length">
                  <div
                    v-for="(info, index) in row.subInfo"
                    :key="index"
                    class="sub-info-row"
                  >
                    <div class="col-checkbox"></div>
                    <div class="sub-info-col">
                      <span class="sub-label">分组：</span>
                      <el-tag size="small" type="primary" effect="plain">{{ info.group }}</el-tag>
                    </div>
                    <div class="sub-info-col">
                      <span class="sub-label">时区：</span>
                      <el-tag size="small" type="success" effect="plain">{{ info.timezone }}</el-tag>
                    </div>
                    <div class="sub-info-col flex-2">
                      <span class="sub-label">特殊日期：</span>
                      <span class="sub-empty">——</span>
                    </div>
                    <div class="col-action"></div>
                  </div>
                </template>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </NewGatePageShell>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { Search, Plus, ArrowRight } from "@element-plus/icons-vue";
import { ElMessage, ElMessageBox } from "element-plus";
import MoreIcon from "@/components/MoreIcon.vue";
import NewGatePageShell from "@/components/security/NewGatePageShell.vue";
import {
  gateDeviceRepository,
  type GateDevice,
  type GateDeviceGroup,
} from "@/features/gate-devices/gate-device-repository";
import { useUserStore } from "@/stores/user";

interface TreeNode extends GateDeviceGroup {
  expanded: boolean;
  children?: TreeNode[];
}

interface TableRow extends GateDevice {
  expanded?: boolean;
  checked: boolean;
  group: string;
}

const userStore = useUserStore();
const filterForm = ref({ vendor: "zhongtuo", deviceName: "", location: "" });
const treeSearch = ref("");
const selectedNode = ref("all");
const groups = ref<GateDeviceGroup[]>([]);
const treeData = ref<TreeNode[]>([]);
const rawTableData = ref<TableRow[]>([]);
const selectAll = ref(false);

function buildTree(records: GateDeviceGroup[]): TreeNode[] {
  const nodes = new Map(records.map((group) => [group.id, { ...group, expanded: true } as TreeNode]));
  const roots: TreeNode[] = [];
  for (const node of nodes.values()) {
    const parent = node.parentId ? nodes.get(node.parentId) : undefined;
    if (parent) (parent.children ??= []).push(node);
    else roots.push(node);
  }
  const sortNodes = (items: TreeNode[]) => {
    items.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "zh-CN"));
    for (const item of items) if (item.children) sortNodes(item.children);
  };
  sortNodes(roots);
  return roots;
}

async function loadData() {
  try {
    const snapshot = await gateDeviceRepository.load(userStore.currentTenant.id);
    groups.value = snapshot.groups;
    treeData.value = buildTree(snapshot.groups);
    const names = new Map(snapshot.groups.map((group) => [group.id, group.name]));
    rawTableData.value = snapshot.devices.map((device) => ({
      ...device,
      subInfo: device.subInfo.map((item) => ({ ...item })),
      group: names.get(device.groupId) ?? "未分组",
      checked: false,
    }));
    selectAll.value = false;
    if (!snapshot.groups.some((group) => group.id === selectedNode.value)) selectedNode.value = "all";
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : "门禁设备读取失败");
  }
}

onMounted(() => void loadData());
watch(() => userStore.currentTenant.id, () => void loadData());

const filteredTree = computed(() => {
  if (!treeSearch.value) return treeData.value;
  const query = treeSearch.value.toLowerCase();
  const matchNode = (node: TreeNode): boolean =>
    node.name.toLowerCase().includes(query) || (node.children?.some(matchNode) ?? false);
  return treeData.value.filter(matchNode);
});

const filteredTableData = computed(() => {
  let items = rawTableData.value;
  if (selectedNode.value !== "all") {
    const visibleGroupIds = descendantGroupIds(selectedNode.value);
    items = items.filter((row) => visibleGroupIds.has(row.groupId));
  }
  if (filterForm.value.deviceName) {
    items = items.filter((row) => row.name.includes(filterForm.value.deviceName));
  }
  if (filterForm.value.location) {
    items = items.filter((row) => row.location.includes(filterForm.value.location));
  }
  return items;
});

function descendantGroupIds(groupId: string) {
  const ids = new Set([groupId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const group of groups.value) {
      if (group.parentId && ids.has(group.parentId) && !ids.has(group.id)) {
        ids.add(group.id);
        changed = true;
      }
    }
  }
  return ids;
}

function groupDepth(groupId: string) {
  let depth = 0;
  let current = groups.value.find((group) => group.id === groupId);
  while (current?.parentId) {
    depth += 1;
    current = groups.value.find((group) => group.id === current?.parentId);
  }
  return depth;
}

const handleSearch = () => undefined;
function toggleNode(node: TreeNode) { node.expanded = !node.expanded; }
function selectNode(id: string) { selectedNode.value = id; }

async function saveGroup(group: GateDeviceGroup) {
  await gateDeviceRepository.saveGroup(userStore.currentTenant.id, group);
  await loadData();
}

function handleMenuAction(action: "添加子级" | "编辑" | "删除", node: TreeNode) {
  if (node.id === "all" && action !== "添加子级") {
    ElMessage.warning("全部设备为系统根分组，不能编辑或删除");
    return;
  }
  if (action === "添加子级") {
    if (groupDepth(node.id) >= 2) {
      ElMessage.warning("设备分组最多支持三级");
      return;
    }
    void ElMessageBox.prompt("请输入子节点名称", "添加子级", {
      confirmButtonText: "确定",
      cancelButtonText: "取消",
    }).then(async ({ value }) => {
      const name = value.trim();
      if (!name) return ElMessage.warning("名称不能为空");
      const siblings = groups.value.filter((group) => group.parentId === node.id);
      await saveGroup({
        id: crypto.randomUUID(),
        parentId: node.id,
        name,
        sortOrder: siblings.length,
      });
      ElMessage.success("添加成功");
    }).catch(() => undefined);
    return;
  }
  if (action === "编辑") {
    void ElMessageBox.prompt("请输入节点名称", "编辑", {
      confirmButtonText: "确定",
      cancelButtonText: "取消",
      inputValue: node.name,
    }).then(async ({ value }) => {
      const name = value.trim();
      if (!name) return ElMessage.warning("名称不能为空");
      await saveGroup({ ...node, name });
      ElMessage.success("修改成功");
    }).catch(() => undefined);
    return;
  }
  void ElMessageBox.confirm("确认删除该分组及其空子分组吗？", "提示", { type: "warning" })
    .then(async () => {
      await gateDeviceRepository.deleteGroup(userStore.currentTenant.id, node.id);
      if (selectedNode.value === node.id) selectedNode.value = "all";
      await loadData();
      ElMessage.success("删除成功");
    })
    .catch((error: unknown) => {
      if (error instanceof Error) ElMessage.error(error.message);
    });
}

const getStatusType = (statusKey: string) =>
  statusKey === "online" ? "success" : statusKey === "offline" ? "danger" : "warning";
const handleSelectAll = () => {
  filteredTableData.value.forEach((row) => { row.checked = selectAll.value; });
};
function toggleRow(row: TableRow) {
  if (row.subInfo.length) row.expanded = !row.expanded;
}

async function moveRows(rows: TableRow[]) {
  const available = groups.value.filter((group) => group.id !== "all");
  const groupNames = available.map((group) => group.name).join("、");
  try {
    const { value } = await ElMessageBox.prompt(`可选分组：${groupNames}`, "设备调组", {
      confirmButtonText: "确定",
      cancelButtonText: "取消",
      inputPlaceholder: "请输入分组名称",
    });
    const target = available.find((group) => group.name === value.trim());
    if (!target) return ElMessage.warning("未找到该设备分组");
    await gateDeviceRepository.moveDevices(
      userStore.currentTenant.id,
      rows.map((row) => row.id),
      target.id,
    );
    await loadData();
    ElMessage.success(`已将 ${rows.length} 台设备移入「${target.name}」`);
  } catch (error) {
    if (error instanceof Error) ElMessage.error(error.message);
  }
}

async function removeRows(rows: TableRow[]) {
  try {
    await ElMessageBox.confirm(`确认移除选中的 ${rows.length} 台设备吗？`, "移除设备", {
      type: "warning",
      confirmButtonText: "确认移除",
      cancelButtonText: "取消",
    });
    await gateDeviceRepository.deleteDevices(
      userStore.currentTenant.id,
      rows.map((row) => row.id),
    );
    await loadData();
    ElMessage.success("设备已移除");
  } catch (error) {
    if (error instanceof Error) ElMessage.error(error.message);
  }
}

function handleBatchAction(name: string) {
  const active = filteredTableData.value.filter((row) => row.checked);
  if (!active.length) return ElMessage.warning("请至少选择一条数据");
  if (name === "批量移除") return void removeRows(active);
  if (name === "批量移入" || name === "批量调组") return void moveRows(active);
  ElMessage.info(`${name}配置功能尚未接入`);
}

const handleOperationLog = () => ElMessage.info("操作日志功能尚未接入");
const handleExport = () => ElMessage.info("导出功能尚未接入");
const handleAdd = () => ElMessage.info("新增权限功能尚未接入");
const handleTiaozu = (row: TableRow) => void moveRows([row]);
const handleRemove = (row: TableRow) => void removeRows([row]);
const handlePermission = (row: TableRow) => ElMessage.info(`「${row.name}」权限配置尚未接入`);
</script>

<style scoped>
.device-page { display: flex; flex-direction: column; height: 100%; overflow: hidden; background: var(--color-bg); }

/* Filter */
.filter-bar { display: flex; flex-wrap: wrap; gap: var(--spacing-20); padding: var(--spacing-16); background: var(--color-white); border-bottom: 1px solid var(--color-border); }
.form-item { display: flex; align-items: center; gap: var(--spacing-8); flex: 1; min-width: 200px; }
.form-label { font-size: var(--font-size-md); color: var(--color-title); line-height: var(--line-height-md); white-space: nowrap; }
.form-item :deep(.el-select), .form-item :deep(.el-input) { flex: 1; --el-input-height: 32px; }
.form-btn { display: flex; justify-content: flex-end; flex: 1; }
.search-btn { background: var(--el-color-primary); height: 32px; }

/* Body Area */
.content-body { display: flex; flex: 1; overflow: hidden; }

/* Tree Panel */
.tree-panel { width: 220px; border-right: 1px solid var(--color-border); display: flex; flex-direction: column; background: var(--color-bg); }
.tree-search { padding: var(--spacing-12); }
.tree-search-input { display: flex; background: var(--color-white); border: 1px solid var(--color-border-strong); border-radius: var(--radius-md); height: 32px; overflow: hidden; }
.tree-input { flex: 1; border: none; outline: none; font-size: var(--font-size-sm); color: var(--color-body); padding: 0 var(--spacing-10); }
.tree-search-btn { width: 32px; background: var(--color-bg-subtle); border: none; border-left: 1px solid var(--color-border-strong); }
.tree-nodes { flex: 1; overflow-y: auto; padding: 0 var(--spacing-12) var(--spacing-12); display: flex; flex-direction: column; gap: var(--spacing-4); }

.tree-node { display: flex; align-items: center; justify-content: space-between; height: 36px; padding: var(--spacing-6) var(--spacing-12); border-radius: var(--radius-md); cursor: pointer; }

/* Selected node is Pure White (No border as requested) */
.tree-node.selected { background: var(--color-white); border: none; }
.tree-node:not(.selected):hover { background: var(--color-white); }

.tree-node-l1 { padding-left: 28px; }
.tree-node-l2 { padding-left: 44px; }

.node-content { display: flex; align-items: center; gap: var(--spacing-6); flex: 1; overflow: hidden; }
.node-arrow { font-size: var(--font-size-xs); transition: transform 0.2s; }
.node-arrow.expanded { transform: rotate(90deg); }
.node-dot-offset { width: 14px; flex-shrink: 0; }

.node-label { font-size: var(--font-size-sm); color: var(--color-title); line-height: var(--line-height-md); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.node-more { font-size: var(--font-size-md); color: var(--color-secondary); opacity: 1; cursor: pointer; display: flex; align-items: center; }
.node-more:hover :deep(path:not(:first-child)) { fill: var(--el-color-primary); }

.popover-menu { display: flex; flex-direction: column; padding: 0; border: none; }
.menu-item { padding: var(--spacing-10) var(--spacing-20); font-size: var(--font-size-md); color: var(--color-title); cursor: pointer; transition: background 0.2s; text-align: left; }
.menu-item:hover { background: var(--color-bg-muted); }
.menu-item.danger { color: var(--color-error); }

/* Table Panel */
.table-panel { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
.toolbar { display: flex; justify-content: flex-end; gap: var(--spacing-10); padding: var(--spacing-12) var(--spacing-16); }

.btn-text-blue { background: none; border: none; font-size: var(--font-size-md); color: var(--el-color-primary); cursor: pointer; }
.btn-outline { background: var(--color-white); border: 1px solid var(--color-border-strong); border-radius: var(--radius-md); color: var(--color-body); padding: 5px var(--spacing-12); cursor: pointer; }
.btn-export { background: var(--color-primary-light); border: 1px solid var(--el-color-primary); border-radius: var(--radius-md); color: var(--el-color-primary); padding: 5px var(--spacing-12); cursor: pointer; }
.btn-primary { background: var(--el-color-primary); border: none; border-radius: var(--radius-md); color: var(--color-white); padding: 5px var(--spacing-14); cursor: pointer; display: flex; align-items: center; gap: var(--spacing-4); }

.table-container { flex: 1; overflow-y: auto; padding: 0 var(--spacing-16); display: flex; flex-direction: column; }
.table-header { 
  display: flex; 
  align-items: center; 
  height: 40px; 
  border: 1px solid var(--color-border); 
  background: var(--color-white); 
  border-radius: var(--radius-md); 
  position: sticky; 
  top: 0; 
  z-index: 2; 
  font-weight: var(--font-weight-semibold); 
  font-size: var(--font-size-md); 
  width: max-content; 
  min-width: 100%; 
}
.table-body { display: flex; flex-direction: column; gap: var(--spacing-12); padding: var(--spacing-12) 0; width: max-content; min-width: 100%; }

.table-row-card { border: 1px solid var(--color-border); border-radius: var(--radius-md); background: var(--color-white); margin-bottom: 0; transition: all 0.2s; overflow: hidden; }

.table-row-card:hover { 
  border-color: transparent !important; 
  box-shadow: var(--shadow-s); 
}
.table-row { display: flex; align-items: stretch; min-height: 48px; cursor: pointer; background: var(--color-white); }

/* Clamped Columns Layouts */
.col-checkbox { 
  width: 44px; 
  flex-shrink: 0; 
  display: flex;
  align-items: center;
  justify-content: center;
}

.col-name { 
  flex: 1; 
  min-width: 240px; 
  padding: 0 var(--spacing-12); 
  display: flex; 
  align-items: center; 
  gap: var(--spacing-6); 
  font-size: var(--font-size-md); 
  font-weight: var(--font-weight-medium); 
}

.col-code, .col-location, .col-group { 
  flex: 1; 
  min-width: 200px; 
  max-width: 240px; 
  padding: 0 var(--spacing-12); 
  display: flex;
  align-items: center;
  color: var(--color-secondary); 
  font-size: var(--font-size-sm); 
  line-height: var(--line-height-md); 
}

.col-action { 
  width: 180px; 
  flex-shrink: 0; 
  display: flex; 
  justify-content: flex-end; 
  gap: var(--spacing-12); 
  padding: 0 var(--spacing-16); 
  align-items: center; 
}

.action-link { color: var(--el-color-primary); cursor: pointer; font-size: var(--font-size-sm); line-height: var(--line-height-md); }
.action-arrow { font-size: var(--font-size-xs); color: var(--color-title); transition: transform 0.2s; }
.action-arrow.rotated { transform: rotate(90deg); }

.sub-info-row { display: flex; align-items: center; min-height: 40px; background: var(--color-bg-page); border-top: 1px solid var(--color-bg-soft); padding-left: var(--spacing-20); }
.sub-info-col { flex: 1; display: flex; align-items: center; gap: var(--spacing-4); }
.flex-2 { flex: 1.5; }
.sub-label { font-size: var(--font-size-xs); color: var(--color-secondary); line-height: var(--line-height-xs); }
.sub-empty { font-size: var(--font-size-xs); color: var(--color-placeholder); line-height: var(--line-height-xs); }

.table-pagination { padding: var(--spacing-12) var(--spacing-16); border-top: 1px solid var(--color-border); background: var(--color-white); display: flex; justify-content: flex-end; }
</style>

<style>
/* Adjust popover overlay borders transparent using standard shadow definitions */
.custom-tree-popover {
  border-radius: var(--radius-lg) !important;
  box-shadow: var(--shadow-m) !important;
  padding: 0 !important;
  border: none !important;
  overflow: hidden !important;
}
</style>
