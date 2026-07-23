# 智慧校园运营管理平台

基于 Vue 3 的多租户教育 SaaS 前端，面向学校、教育局、教育机构和平台运营人员。项目已具备可运行的租户 Shell、权限配置、个性化工作台、业务页面和教育数字孪生能力。

## 当前能力

- 四类租户切换；当前机构按用户保存在浏览器登录会话中，刷新恢复，退出登录后清除。
- 四级菜单、页面注册表、动态路由、租户级 RBAC、成员多角色和管理员保护。
- 经典 Bento 工作台与新版流式/双列工作台；布局按租户、用户和角色隔离保存。
- 组织、成员、角色、菜单、机构审核、校园门禁、日程等管理页面。
- 全局 AI 运营助手，支持页面上下文、Markdown/KaTeX 和流式回复。
- 组织管理支持为学校、教育局和其他机构配置省、市或区县行政区；行政区编码、层级和完整路径随组织真实保存。两套数据大屏都以当前组织配置为地图根范围，不能返回或切换到根范围之外。
- 教育局“区域教育总览”独立页：与智慧体育共用同一租户地图装配器、行政区状态机、主题变量和动效；地图渲染链路统一使用 GCJ-02，DataV 边界直接使用，OSM 点位和遗留边界只在数据源入口转换一次。`bureau-74b5bcaf-69af-4cf2-8c63-11f9270d4676` 使用内置的榕城区现行 16 街镇 GCJ-02 边界与学校网络，其他组织通过公共边界 Provider 按可用数据下钻。
- 教育局“智慧体育数据驾驶舱”独立页：完整复用区域教育总览页面与同一地图引擎；选择广东省时使用内置 21 地市首屏优化，其他省、市或区县按当前分支懒加载并缓存。行政区导航由通用可变深度状态机驱动：根范围内支持父子下钻、同级切换和外部轮廓回切，智慧体育默认在区县终止；榕城区教育局复用内置 16 镇街 GCJ-02 边界并可继续聚焦到镇街。两套驾驶舱的下钻、同级切换、返回、面包屑和自动巡航共用同一导航事务，用户操作可立即抢占未完成的请求、预构建和相机过渡。智慧体育固定显示地图主画面，不展示区域教育的“区域教育总览 / 学业质量监测”分区菜单；体育 HUD 以 JSON 模拟数据驱动，提供全局数据类型、地市/学段、指标和趋势切换，并使用共享主题变量与 ECharts 图表。区县及以下按可用数据启用学校网格，学校搜索始终保留，省、市、区县和镇街名称统一默认隐藏并在移入对应区域时显示，能量锥峰仅按业务切换指标数据源。稳定活动层直接复用；同一几何带聚焦子级时保留父级锥峰、学校点位和连接网络，返回时直接恢复，避免同步重建阻塞首帧。数据请求、相机预览和图层预构建并行，厚度、颜色和轮廓连续过渡。边界请求支持抢占取消、8 秒超时且只缓存成功结果。智慧体育能量锥峰使用覆盖人数原型数据，下级以千人为单位稳定分配且父级等于下级合计，并通过分层倍率适配省、市、区县尺度。
- 可视化页内已接入“学业质量监测”驾驶舱基础结构、通用图表面板和 ECharts 学业趋势图。
- 教育局“学生成长画像”SaaS 页面：区域总览、学校差异、趋势跟进及五育、学业、运动、荣誉等专题；当前使用结构化模拟数据，心理健康仅展示安全接入规划。

项目默认使用 Supabase Auth、Postgres 和 RLS。`localStorage` 只用于显式本地演示、E2E 与旧数据迁移，不是生产数据源。

## 技术栈

- Vue 3、TypeScript、Vite、Vue Router、Pinia
- Element Plus、Lucide Vue
- Supabase Auth / Postgres / RLS / Edge Functions
- Three.js、GSAP、ECharts
- Vitest、Vue Test Utils、Playwright

Node.js 要求：`^20.19.0` 或 `>=22.12.0`。

## 本地运行

```bash
npm install
cp .env.example .env.local
npm run dev
```

Supabase 模式至少配置：

```env
VITE_DATA_BACKEND=supabase
VITE_AUTH_PROVIDER=supabase
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
```

数据库密码、Secret Key、迁移账号和模型密钥不得使用 `VITE_` 前缀或提交到 Git。DeepSeek 密钥只配置在 Supabase Edge Function 环境中。

显式本地演示模式使用：

```env
VITE_DATA_BACKEND=local
VITE_AUTH_PROVIDER=local
```

常用入口：

```text
/workbench
/system/organization
/system/roles
/system/menu-config
/bureau/education-governance/student-growth-portrait
/bureau/visualization/regional-education-overview?tenantId=bureau-001
/bureau/ai-precision-teaching/smart-sports/cockpit?tenantId=bureau-001
```

区域教育总览和智慧体育数据驾驶舱均为 `standalone` 页面，通过新标签打开，不挂载 `AppLayout`。

## 核心边界

| 位置 | 职责 |
| --- | --- |
| `src/main.ts` | 应用启动、认证和持久化初始化 |
| `src/layouts/AppLayout.vue` | 持续挂载的 SaaS Shell |
| `src/config/page-registry.ts` | 页面资源、路径、租户范围和打开方式的事实源 |
| `src/features/persistence/` | 应用持久化契约及 Supabase/localStorage Adapter |
| `src/features/tenant-config/` | 菜单、工作台入口和角色的租户聚合配置 |
| `src/features/workbench/workbench-templates.ts` | 固定工作台组件清单与默认布局 |
| `src/features/student-growth-portrait/` | 区域学生成长画像的数据契约、模拟数据、图表和专题组件 |
| `src/features/regional-education-overview/` | 数字孪生、图表面板、主题和 Three.js 渲染边界 |
| `src/styles/` | SaaS 与独立可视化页面的设计变量 |

菜单模板只用于首次初始化和恢复默认，不参与运行时导航。菜单保存稳定 `pageKey`，不保存 Vue 组件路径；删除菜单不会删除页面资源。

菜单、角色与 Shell 入口共用租户配置原子保存链路。Supabase 模式按租户串行写入，保存期间的多次修改只提交最新配置，相同内容不产生远端写入；任一写入失败后停止该租户的排队写入，由界面保留修改并提示用户确认，不自动重放状态未知的写请求。数据库 RPC 继续使用 revision 乐观并发控制，并设置锁等待与语句执行上限。

## 数据边界

Supabase 主要表：

| 数据 | 表 |
| --- | --- |
| 用户、组织、成员 | `profiles`、`tenants`、`tenant_members` |
| 租户菜单、入口和角色 | `tenant_configurations` |
| 激活角色与可视化主题 | `user_tenant_preferences` |
| 个人工作台 | `workbench_layouts` |
| 日程 | `calendar_events` |
| AI 会话与消息 | `ai_conversations`、`ai_messages` |
| 机构审核 | `org_review_applications` |
| 门禁设备 | `gate_device_groups`、`gate_devices` |

所有浏览器可访问表必须启用 RLS。当前未启用 Realtime，另一个已打开页面需要刷新后读取普通业务数据变更。

学生成长画像目前通过 `student-growth-portrait/mock-data.ts` 提供可替换的结构化模拟数据。后续接入外部后端时应保持页面只依赖领域类型与聚合结果；心理健康数据需单独授权、脱敏和审计，不参与综合评分或公开排名。

## 新增页面

1. 在 `src/views` 实现页面组件。
2. 在 `src/config/page-registry.ts` 注册唯一 `pageKey`、路径、租户范围和权限。
3. 在菜单配置中创建内部页面入口并关联该资源。

尚未开发的菜单统一使用 `developing-placeholder`。

## 验证

```bash
npm run check            # lint、类型检查、Vitest、生产构建
npm run test:e2e         # Chromium E2E
npm run test:e2e:supabase
npm audit --offline
```

修改可见交互时应运行相关 Playwright 用例；修改路由、权限、菜单或 repository 时必须补充单元测试。GitHub Actions 会在 push 和 pull request 时执行质量门禁、Chromium E2E 和生产依赖审计。

## 已知边界

- 榕城区学校点位来自公开数据，原始 WGS84 坐标在地图数据入口统一转换为 GCJ-02，正式上线前需以教育局权威台账校准；现行 16 街镇边界来自广东省自然资源厅监制《榕城区地图（政区版二）》，数据截止 2025-06-30，经 PDF 矢量提取和 GCJ-02 配准，仅用于可视化而非法定勘界。
- 页面注册表仍包含部分占位业务资源，是否已真实开发以其绑定组件为准。
- 前端菜单与路由守卫只负责体验层权限，真实业务 API 仍需服务端鉴权。

协作与实现约束见 [AGENTS.md](AGENTS.md)。
