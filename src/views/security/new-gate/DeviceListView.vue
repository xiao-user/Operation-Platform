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
                    <span class="action-link" @click="handleTiaozu(row)">调租</span>
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
import { computed, ref } from 'vue'
import { Search, Plus, ArrowRight } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import MoreIcon from '@/components/MoreIcon.vue'
import NewGatePageShell from '@/components/security/NewGatePageShell.vue'

const filterForm = ref({ vendor: 'zhongtuo', deviceName: '', location: '' })
const handleSearch = () => { ElMessage.info('触发查询: ' + filterForm.value.deviceName) }

// --- Tree ---
const treeSearch = ref('')
const selectedNode = ref('all')

interface TreeNode {
  id: string
  name: string
  expanded: boolean
  children?: TreeNode[]
}

const treeData = ref<TreeNode[]>([
  {
    id: 'all', name: '全部设备', expanded: true,
    children: [
      {
        id: 'gate', name: '校门口', expanded: true,
        children: [
          { id: 'main-gate', name: '正门', expanded: false },
          { id: 'side-gate', name: '侧门', expanded: false },
        ]
      },
      { id: 'canteen', name: '食堂', expanded: false },
      { id: 'dorm', name: '宿舍', expanded: false },
      { id: 'more', name: '更多', expanded: false },
    ]
  }
])

const filteredTree = computed(() => {
  if (!treeSearch.value) return treeData.value
  const q = treeSearch.value.toLowerCase()
  const matchNode = (node: TreeNode): boolean =>
    node.name.toLowerCase().includes(q) ||
    (node.children?.some(matchNode) ?? false)
  return treeData.value.filter(matchNode)
})

function toggleNode(node: TreeNode) { node.expanded = !node.expanded }
function selectNode(id: string) { selectedNode.value = id }

function handleMenuAction(action: '添加子级' | '编辑' | '删除', node: TreeNode) {
  if (action === '添加子级') {
    ElMessageBox.prompt('请输入子节点名称', '添加子级', { confirmButtonText: '确定', cancelButtonText: '取消' })
      .then(({ value }) => {
        if (!value) return ElMessage.warning('名称不能为空')
        if (!node.children) node.children = []
        node.children.push({ id: Date.now().toString(), name: value, expanded: false })
        node.expanded = true
        ElMessage.success('添加成功')
      })
  } else if (action === '编辑') {
    ElMessageBox.prompt('请输入节点名称', '编辑', { confirmButtonText: '确定', cancelButtonText: '取消', inputValue: node.name })
      .then(({ value }) => {
        if (!value) return ElMessage.warning('名称不能为空')
        node.name = value
        ElMessage.success('修改成功')
      })
  } else if (action === '删除') {
    ElMessageBox.confirm('确认删除该节点吗?', '提示', { type: 'warning' })
      .then(() => {
        const removeNode = (nodes: TreeNode[]): boolean => {
          for (let i = 0; i < nodes.length; i++) {
            const n = nodes[i]
            if (n && n.id === node.id) { nodes.splice(i, 1); return true }
            if (n && n.children && removeNode(n.children as TreeNode[])) return true
          }
          return false
        }
        removeNode(treeData.value)
        if (selectedNode.value === node.id) selectedNode.value = 'all'
        ElMessage.success('删除成功')
      })
  }
}

// --- Table Data ---
interface SubInfo { group: string; timezone: string }
interface TableRow {
  id: number; expanded?: boolean; name: string; channelType: 'dual' | 'single';
  statusKey: 'online' | 'offline' | 'running'; statusLabel: string;
  code: string; location: string; groupId: string; group: string; checked: boolean; subInfo?: SubInfo[];
}

const rawTableData = ref<TableRow[]>([
  { id: 1, name: '校正门-人脸闸机1', channelType: 'dual', statusKey: 'online', statusLabel: '在线', code: 'G001-MAIN-01', location: '校正面左侧', groupId: 'main-gate', group: '正门', checked: false, subInfo: [{ group: '测试A组', timezone: '固定全天通行' }] },
  { id: 2, name: '校正门-人脸闸机6', channelType: 'single', statusKey: 'online', statusLabel: '在线', code: 'G001-SIDE-02', location: '校正面右侧', groupId: 'side-gate', group: '侧门', checked: false, subInfo: [{ group: '测试B组', timezone: '晚上通行' }] },
  { id: 3, name: '校正门-人脸闸机5', channelType: 'dual', statusKey: 'offline', statusLabel: '离线', code: 'G001-MAIN-05', location: '正门内测', groupId: 'main-gate', group: '正门', checked: false, subInfo: [{ group: '测试A组', timezone: '早班时区' }] },
  { id: 4, name: '校正门-人脸闸机3', channelType: 'dual', statusKey: 'online', statusLabel: '在线', code: 'G001-MAIN-03', location: '正门北柱', groupId: 'all', group: '全部设备', checked: false, subInfo: [{ group: '测试C组', timezone: '特定通道时区' }] },
  { id: 5, name: '食堂人脸闸机4', channelType: 'single', statusKey: 'online', statusLabel: '在线', code: 'C002-DOOR-01', location: '食堂侧门', groupId: 'canteen', group: '食堂', checked: false, subInfo: [{ group: '后勤组', timezone: '就餐时段通行' }] },
  { id: 6, name: '树木园围墙闸机1', channelType: 'dual', statusKey: 'online', statusLabel: '在线', code: 'G002-SIDE-01', location: '后山入口', groupId: 'all', group: '全部设备', checked: false, subInfo: [{ group: '巡逻组', timezone: '特定工作时段' }] },
  { id: 7, name: '后门通道闸机3', channelType: 'single', statusKey: 'offline', statusLabel: '离线', code: 'G003-BACK-03', location: '北门后墙', groupId: 'all', group: '全部设备', checked: false, subInfo: [{ group: '维保组', timezone: '维保测试时段' }] },
  { id: 8, name: '宿舍闸机1', channelType: 'single', statusKey: 'online', statusLabel: '在线', code: 'D003-MAIN-01', location: '宿舍A座', groupId: 'dorm', group: '宿舍', checked: false, subInfo: [{ group: '宿管组', timezone: '查寝通行时段' }] },
  { id: 9, name: '宿舍闸机2', channelType: 'dual', statusKey: 'online', statusLabel: '在线', code: 'D003-MAIN-02', location: '宿舍B座', groupId: 'dorm', group: '宿舍', checked: false, subInfo: [{ group: '学生组', timezone: '归寝限制时段' }] },
  { id: 10, name: '体育馆人脸主入口', channelType: 'dual', statusKey: 'online', statusLabel: '在线', code: 'S004-MAIN-01', location: '体育馆正门', groupId: 'all', group: '全部设备', checked: false, subInfo: [{ group: '学生组', timezone: '课程及自由时间' }] },
])

const filteredTableData = computed(() => {
  let items = rawTableData.value
  if (selectedNode.value !== 'all') {
    items = items.filter(r => r.groupId === selectedNode.value)
  }
  if (filterForm.value.vendor) {
    // vendor filter is a demo; in real scenario match against device vendor field
  }
  if (filterForm.value.deviceName) {
    items = items.filter(r => r.name.includes(filterForm.value.deviceName))
  }
  if (filterForm.value.location) {
    items = items.filter(r => r.location.includes(filterForm.value.location))
  }
  return items
})

const getStatusType = (statusKey: string) => statusKey === 'online' ? 'success' : statusKey === 'offline' ? 'danger' : 'warning'
const selectAll = ref(false)
const handleSelectAll = () => { filteredTableData.value.forEach(r => r.checked = selectAll.value) }
function toggleRow(row: TableRow) { if (row.subInfo && row.subInfo.length) row.expanded = !row.expanded }

function handleBatchAction(name: string) {
  const active = filteredTableData.value.filter(r => r.checked)
  if (!active.length) return ElMessage.warning('请至少选择一条数据')
  ElMessage.success(`${name} 操作成功 ${active.length} 条数据`)
}

const handleOperationLog = () => ElMessage.info('触发操作日志')
const handleExport = () => ElMessage.success('开始导出')
const handleAdd = () => ElMessage.success('新增权限')
const handleTiaozu = (row: TableRow) => ElMessage.info('调租: ' + row.name)
const handleRemove = (row: TableRow) => ElMessage.error('移除: ' + row.name)
const handlePermission = (row: TableRow) => ElMessage.info('分配权限: ' + row.name)
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
