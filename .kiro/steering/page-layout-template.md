# 标准内容页布局模板

## 概述

项目中所有列表/管理类页面遵循统一的三段式布局结构：
**筛选栏（FilterBar）→ 主体区（Body：工具栏 + 表格 + 分页）**

---

## 布局结构

```
page-wrapper                    ← 全高 flex 列，背景 color-bg
├── PageFilterBar               ← 通用筛选栏组件（白底，底部分割线）
│   ├── slot（筛选控件）         ← flex-wrap，每项 form-item 固定宽度 280px
│   └── slot#actions（按钮）    ← 默认：搜索按钮（可选重置）
└── page-body                   ← flex:1，overflow:hidden，白底，padding:24px，flex 列，gap:16px
    ├── .toolbar                ← 无内边距，左标题 + 右按钮组
    ├── .table-wrapper          ← flex:1，overflow:hidden，圆角，border
    │   └── el-table            ← stripe + height="100%"，操作列 fixed="right"
    └── .pagination-bar         ← 右对齐，el-pagination
```

---

## 关键 CSS 规则

```css
/* 外层容器 */
.page-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--color-bg);
}

/* 主体区：白底，24px 内边距，撑满剩余高度 */
.page-body {
  flex: 1;
  overflow: hidden;
  padding: var(--spacing-24);
  background: var(--color-white);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-16);
}

/* 工具栏：无内边距，按钮间距由 el-button 自带 margin-left 处理 */
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

/* 表格容器 */
.table-wrapper {
  flex: 1;
  overflow: hidden;
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border-strong);
}

/* 分页栏：无背景无内边距，直接右对齐 */
.pagination-bar {
  display: flex;
  justify-content: flex-end;
  flex-shrink: 0;
}
```

---

## PageFilterBar 组件

**路径：** `src/components/PageFilterBar.vue`

**筛选栏布局方案：flex-wrap**

- 每个 `form-item` 设置固定宽度（推荐 `width: 280px`）
- 超出容器宽度自动换行，适配任意数量的筛选项
- 比 grid 更灵活，不需要预设列数

**用法：**

```vue
<PageFilterBar :show-reset="true" @search="handleSearch" @reset="handleReset">
  <!-- 每个 form-item 宽度固定，flex-wrap 自动换行 -->
  <div class="form-item">
    <span class="form-label">状态：</span>
    <el-select v-model="form.status" />
  </div>
  <div class="form-item">
    <span class="form-label">名称：</span>
    <el-input v-model="form.name" />
  </div>

  <!-- 自定义按钮区（可选） -->
  <template #actions>
    <el-button type="primary" @click="handleSearch">搜索</el-button>
  </template>
</PageFilterBar>
```

**form-item 样式（在页面 scoped style 中定义）：**

```css
.form-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-8);
  height: 32px;
  width: 280px; /* 固定宽度，配合 flex-wrap 换行 */
}

.form-label {
  font-size: var(--font-size-md);
  color: var(--color-title);
  white-space: nowrap;
  flex-shrink: 0;
}

.form-item :deep(.el-select),
.form-item :deep(.el-input) {
  flex: 1;
  --el-input-height: 32px;
}
```

**Props：**
| Prop | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| showReset | boolean | false | 是否显示默认重置按钮 |

**Emits：**
| 事件 | 说明 |
|------|------|
| search | 点击搜索按钮 |
| reset | 点击重置按钮 |

---

## 表格规范（el-table）

- 使用 `el-table`，开启 `stripe`（斑马线）和 `height="100%"`
- **不开启** `border` prop，通过 CSS 只保留右边框
- 操作列使用 `fixed="right"`，`min-width` 由内容撑开，不设固定 `width`
- 文字溢出列使用 `show-overflow-tooltip`

```vue
<el-table :data="tableData" stripe height="100%" :border="false">
  <el-table-column prop="name" label="名称" min-width="200" show-overflow-tooltip />
  <!-- 操作列固定右侧，内容撑开宽度 -->
  <el-table-column label="操作" fixed="right" min-width="120">
    <template #default="{ row }">
      <span class="action-link" @click="handleView(row)">查看</span>
    </template>
  </el-table-column>
</el-table>
```

**表格 CSS 覆盖（只保留右边框）：**

```css
/* 只保留右边框 */
.your-table :deep(.el-table__cell) {
  border-right: 1px solid var(--color-border) !important;
  border-bottom: 1px solid var(--color-border) !important;
}

.your-table :deep(th.el-table__cell:last-child),
.your-table :deep(td.el-table__cell:last-child) {
  border-right: none !important;
}

/* 表头背景 */
.your-table :deep(.el-table__header-wrapper th) {
  background: var(--color-bg-subtle) !important;
  font-weight: var(--font-weight-semibold);
}
```

---

## 按钮间距规范

**重要：** Element Plus 的 `el-button + el-button` 自带 `margin-left: 12px`（通过组件库内部 CSS 实现）。

- `toolbar-right` 中的按钮组**不需要**额外设置 `gap`
- 操作列中的 `span` 链接使用 `.action-link + .action-link { margin-left: var(--spacing-12) }` 模拟相同间距

---

## 虚拟数据规范

- 所有 mock 数据定义为 `MOCK_XXX` 常量，放在 `<script setup>` 顶部
- 对接接口时只需替换数据来源，不改模板和样式
- 分页 total 使用接口返回值，mock 阶段写固定数字

---

## 交互规范（重要）

**所有页面必须做真实的联动交互：**

1. **筛选 → 表格联动**：点击搜索按钮后，表格数据必须根据筛选条件真实过滤，分页重置到第 1 页
2. **分页联动**：切换页码、每页条数时，表格数据必须真实变化
3. **total 真实**：分页的 total 必须是筛选后的真实数量，不能写死
4. **mock 数据量**：至少 20-30 条，确保分页翻页有真实效果
5. **loading 状态**：数据加载时显示 loading，加载完成后隐藏
6. **操作反馈**：按钮操作后要有真实的状态变化（如审核通过后该行状态变更）

**mock 函数规范：**

- 模拟网络延迟（50-200ms），让 loading 状态可见
- 筛选逻辑要真实实现（模糊搜索、精确匹配等）
- 分页用 slice 真实截取
- total 返回筛选后的真实总数
