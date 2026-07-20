# 项目协作规范

本文件适用于整个仓库。项目是 Vue 3 + TypeScript 多租户教育 SaaS 前端，生产数据默认由 Supabase Auth、Postgres 和 RLS 管理。

## 开始前

- 先阅读 `README.md`，再以当前代码和测试为事实源。
- 保留与任务无关的工作区修改；禁止用破坏性 Git 命令覆盖用户文件。
- 优先复用现有配置、Store、repository、组件和设计变量，不在视图中复制领域规则。

## 架构边界

- `src/config/page-registry.ts` 是页面资源和动态路由的唯一代码级事实源。菜单只保存 `pageKey`，不得保存组件路径。
- 菜单模板只用于首次初始化和恢复默认，不得静默覆盖租户现有配置。菜单最多四级，层级规则由领域校验统一维护。
- 工作台是租户 Shell 配置，不是菜单节点；固定组件清单以 `src/features/workbench/workbench-templates.ts` 为准，个人布局不得真正新增或删除系统组件。
- `src/features/persistence/operation-platform-persistence.ts` 是应用持久化契约，`runtime-operation-platform-persistence.ts` 是唯一装配入口。页面和 Store 不得直接依赖 Adapter、远端 DTO 或数据源类型。
- 菜单、工作台入口和角色必须通过 `src/features/tenant-config/` 聚合原子保存；Supabase 写入保留 revision 并发控制。
- 组织、成员、工作台和权限分别通过对应 `src/features/` repository 维护。Repository 返回防御性副本、显式抛错；损坏数据只有在备份成功后才能恢复。
- 当前机构只保存在按用户隔离的登录会话中，退出登录时清除；激活角色、主题和个人布局统一经过持久化契约。

## 权限与数据安全

- RBAC 默认拒绝。导航、默认入口、工作台和路由守卫必须使用同一当前租户与激活角色语义。
- 当前用户角色来自启用的组织成员记录；禁用成员或角色不参与权限计算。不得删除、禁用或移除最后一个启用管理员。
- 管理员拥有当前租户全部可见叶子菜单；普通角色只授权叶子节点，父级按获权子节点保留。
- 浏览器只能使用 Supabase publishable key。数据库密码、Secret Key、迁移账号和模型密钥不得进入 `VITE_*`。
- 所有浏览器可访问表必须启用 RLS，并遵循用户身份、租户归属和最小权限。前端权限不是生产安全边界。

## 导航与界面

- `AppLayout.vue` 是持续挂载的应用 Shell；Vue Router 是页面与导航高亮的事实源，导航前不要清空状态。
- 内部导航使用 Router API；只有外部链接使用 `<a>` 或 `window.open`，并遵循配置的打开方式。
- 使用 `src/styles` 设计变量和现有 Element Plus 组件，避免可复用颜色、间距和尺寸魔法值。
- 不增加无需求依据的路由动画；可见交互应保持键盘、焦点和响应式行为。

## 区域教育数字孪生

- `src/features/regional-education-overview/` 是独立业务边界，主题和 `charts--*` 变量只作用于 `.regional-digital-twin`，不得污染 SaaS Shell。
- 行政区位于 `XY` 平面，`Z` 表示厚度和高度；相机及 OrbitControls 必须使用 `Z-up`。
- 保持左键受限旋转、滚轮缩放、关闭平移、阻尼和俯仰限制。重置视角必须平滑过渡。
- 区县与镇街下钻复用同一 Scene 和投影，通过相机与图层状态过渡；不得销毁重建场景模拟下钻。过渡前清理残余阻尼，并保持 HUD 构图偏移稳定。
- 手动操作暂停自动平面旋转，10 秒无操作后从当前视角连续恢复。镇街巡航、学校轮播和锥峰轮播是独立机制，不能相互等待或破坏自动旋转。
- Three.js Geometry、Material、Texture 和 CSS2D 标签必须有明确所有权与销毁路径。隐藏页面不得继续渲染；高频更新应合并到动画帧并遵守空闲/交互帧率策略。
- 图表通过通用 Dashboard 面板和 `EChartCanvas` 扩展；保持模块化注册、ResizeObserver 合帧和卸载销毁。

## 菜单配置

- 行内编辑使用 `Enter` 保存、`Escape` 取消；抽屉入口继续保留。
- 筛选时禁用拖拽；拖拽、编辑和保存后不得自动展开节点。
- 页面选项来自页面注册表。图标使用现有 Lucide 动态加载，不整体导入图标库。

## 验证与交付

```bash
npm run check
npm run test:e2e
npm audit --offline
```

- 提交前至少运行 `npm run check`。
- 修改路由、菜单、权限或 repository 时补充单元测试；修改可见交互时运行相关 Playwright 用例。
- 不把单元测试描述为端到端验证，不把局部检查描述为完整门禁。
- 提交按单一职责拆分，不混入无关格式化；合并主分支前保持工作区干净。
- 架构边界、命令、入口或存储约定变化时同步更新 `README.md`；协作约束变化时更新本文件。
