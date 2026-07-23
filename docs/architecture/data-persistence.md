# 数据持久化架构

## 目标

当前生产型开发环境继续使用 Supabase，但页面、Store 和领域规则不依赖 Supabase SDK、表名、RPC 或字段格式。未来若更换为其他 BaaS 或 HTTP API，只替换持久化 Adapter。

## 当前决策

```text
Vue 页面
  → Pinia Store / 业务动作
  → OperationPlatformPersistence
  → 运行时装配入口
      ├─ Supabase Adapter（默认）
      └─ localStorage Adapter（测试和本地回退）
```

- `operation-platform-persistence.ts` 是应用层稳定契约。
- `runtime-operation-platform-persistence.ts` 是唯一数据源装配入口。
- `supabase-operation-platform-persistence.ts` 管理 Supabase 启动快照、版本和本地运行时缓存。
- `supabase-operation-platform-repository.ts` 只负责 Supabase DTO、查询和 RPC 调用。
- `local-storage-operation-platform-persistence.ts` 适配现有本地 Repository，保留损坏数据备份和回滚语义。
- 默认租户配置、默认角色和成员工厂属于领域规则，不能放在某个持久化实现中。
- `memberAccountKind` 表达成员账号输入能力，而不是暴露具体数据源名称：Supabase 模式要求输入 Auth 登录邮箱，由数据库在原子事务中精确解析并保存稳定的 `auth_user_id`；本地回退模式继续接受演示账号标识。

租户配置与成员以同一个 `OperationPlatformTenantState` 权威快照加载。`loadTenantState` 负责按租户请求、请求去重、缓存填充和缺失错误；`peekTenantState` 只读取已经加载的缓存，供计算属性和路由权限同步求值。缓存未命中与远端记录缺失是两种不同状态，业务 Store 不得自行生成默认配置掩盖未加载状态。所有写入统一返回 `Promise`，并在持久化层保证写入前已有对应租户的 revision。

## 为什么暂时不继续拆分

组织创建需要同时写入组织、初始管理员和租户配置，菜单、角色与工作台入口也共享同一个带 revision 的租户配置聚合。当前规模下，一个应用级 Persistence Port 能表达这些原子边界；立即拆成大量细粒度 Repository 会增加事务协调和装配成本，但没有对应业务收益。

当某个领域出现独立生命周期、独立团队或明显不同的服务边界时，再从应用级 Port 中提取单独 Repository。

## 当前不做

- 不为尚未出现的第二数据源建设 BFF 或自建后台。
- 不建立包含所有 URL、表名和变量的巨型接口映射文件。
- 不引入依赖注入框架、通用查询 DSL 或微服务拆分。
- 不让 Store 根据 `supabase`、`localStorage` 等数据源类型分支。
- 不让浏览器直接连接未来的自建数据库。

## 更换数据源

1. 实现 `OperationPlatformPersistence`。
2. 在 Adapter 内完成远端 DTO 与领域模型转换、鉴权、错误归一化和必要缓存。
3. 在 `runtime-operation-platform-persistence.ts` 中装配新实现。
4. 复用现有 Store 单元测试，并为新 Adapter 增加集成 E2E。

页面和 Store 不应因此修改。`VITE_AUTH_PROVIDER` 与 `VITE_DATA_BACKEND` 独立装配；未来可以只替换业务数据源并继续使用 Supabase Auth。
