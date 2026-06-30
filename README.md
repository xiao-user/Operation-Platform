# 智慧校园运营管理平台

基于 Vue 3、TypeScript、Vite、Element Plus 和 Pinia 的多租户运营管理前端。目前支持学校、教育局和机构三类租户，并提供租户级菜单配置能力。

## 环境要求

- Node.js `^20.19.0` 或 `>=22.12.0`
- npm

## 本地开发

```bash
npm install
npm run dev
```

## 工程检查

```bash
npm test
npm run type-check
npm run lint
npm run build
```

## 菜单配置

管理员可以从右上角用户菜单进入“菜单配置”，或直接访问：

```text
/system/menu-config
```

菜单配置具有以下行为：

- 顶部模块和侧边菜单按具体 `tenantId` 独立保存。
- 新租户首次使用时复制对应学校、教育局或机构类型的默认模板。
- 内部页面从代码页面注册表中选择，不允许填写组件路径。
- 支持目录、内部页面、外部链接、排序和显隐。
- 修改当前租户后，运行时导航立即刷新。

第一阶段使用浏览器 `localStorage` 持久化，键格式为：

```text
operation-platform:tenant-menu:v1:<tenantId>
```

删除某个租户对应的键后，该租户会在下次加载时重新复制类型默认模板。

## 主要目录

```text
src/config/page-registry.ts              页面注册表
src/config/menu-templates.ts              租户类型默认菜单
src/features/menu-config/                 菜单领域模型与持久化
src/stores/navigation.ts                  运行时导航状态
src/stores/menu-config.ts                 配置中心状态
src/views/system/menu-config/             菜单配置界面
```
