# 智慧校园运营管理平台

基于 Vue 3 的多租户教育 SaaS 前端，面向学校、教育局、教育机构和平台运营人员。项目已具备可运行的租户 Shell、权限配置、个性化工作台、业务页面和教育数字孪生能力。

## 当前能力

- 四类租户切换；当前机构按用户保存在浏览器登录会话中，刷新恢复，退出登录后清除。
- 四级菜单、页面注册表、动态路由、租户级 RBAC、成员多角色和管理员保护。
- 经典 Bento 工作台与新版流式/双列工作台；布局按租户、用户和角色隔离保存。
- 组织、成员、角色、菜单、机构审核、校园门禁、日程等管理页面。
- 全局 AI 运营助手，支持页面上下文、Markdown/KaTeX 和流式回复。
- 教育局“区域教育总览”独立页：Three.js 榕城区地图、镇街下钻、学校网络、能量锥峰、五套主题、自动巡航和地图调试。
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
```

区域教育总览为 `standalone` 页面，通过新标签打开，不挂载 `AppLayout`。

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

- 榕城区学校与镇街边界来自公开数据，当前是可视化原型，正式上线前需以教育局权威台账校准。
- 页面注册表仍包含部分占位业务资源，是否已真实开发以其绑定组件为准。
- 前端菜单与路由守卫只负责体验层权限，真实业务 API 仍需服务端鉴权。

协作与实现约束见 [AGENTS.md](AGENTS.md)。
