# Tenant Menu Configuration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a fully interactive, tenant-isolated menu configuration center that drives the existing top navigation and sidebar from `localStorage` records linked to a code-owned page registry.

**Architecture:** A code-owned page registry defines internal pages and generates their routes. Type-specific menu templates initialize tenant-owned flat records, a repository isolates persistence, and Pinia derives runtime navigation trees. A fixed system page edits any tenant's records without becoming part of the configurable menu tree.

**Tech Stack:** Vue 3.5, TypeScript 5.9, Pinia 3, Vue Router 5, Element Plus 2, Vite 7, Vitest, Vue Test Utils, jsdom.

## Global Constraints

- Persist first-phase tenant menu data in `localStorage` only.
- Isolate menu configuration by concrete `tenantId`.
- Initialize an unconfigured tenant by copying its tenant-type template; later template changes do not auto-merge.
- Manage top modules and sidebar menus only; keep page-internal tabs static.
- Internal page menus select a `pageKey`; no configurable Vue component paths.
- Support exactly three navigation levels: module, optional directory, page or external link.
- Keep `/system/menu-config` fixed and outside configurable tenant menus.
- Reuse the current Element Plus components and project design tokens.
- Use numeric sibling sorting; do not add drag-and-drop dependencies.
- Do not refactor unrelated business page content.

---

### Task 1: Add the test harness and core menu domain

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `vitest.config.ts`
- Create: `src/features/menu-config/types.ts`
- Create: `src/features/menu-config/menu-tree.ts`
- Create: `src/features/menu-config/menu-validation.ts`
- Test: `src/features/menu-config/__tests__/menu-tree.test.ts`
- Test: `src/features/menu-config/__tests__/menu-validation.test.ts`

**Interfaces:**
- Produces: `MenuItemType`, `ExternalOpenMode`, `MenuConfigRecord`, `MenuTreeNode`, `MenuTarget`.
- Produces: `buildMenuTree(records)`, `collectDescendantIds(records, id)`, `resolveFirstTarget(node, pageRegistryByKey)`, and `validateMenuRecord(candidate, records, context)`.
- Consumes: existing `TenantType` and `MenuIconKey` types.

- [ ] **Step 1: Install the test dependencies and add scripts**

Run:

```bash
npm install --save-dev vitest @vue/test-utils jsdom
```

Add scripts:

```json
{
  "test": "vitest run",
  "test:watch": "vitest"
}
```

Create `vitest.config.ts` with Vue support, the existing `@` alias, `jsdom`, and `clearMocks: true`.

- [ ] **Step 2: Write failing tree tests**

Cover these exact behaviors:

```ts
expect(buildMenuTree(records).map((node) => node.id)).toEqual(["module-b", "module-a"])
expect(buildMenuTree(records)[0]?.children.map((node) => node.id)).toEqual(["page-2", "page-1"])
expect(collectDescendantIds(records, "module-a")).toEqual(new Set(["directory-a", "page-1"]))
expect(resolveFirstTarget(moduleNode, pageRegistryByKey)).toEqual({ kind: "internal", path: "/academic/course-list" })
```

- [ ] **Step 3: Run the tree tests and verify the red state**

Run:

```bash
npm test -- src/features/menu-config/__tests__/menu-tree.test.ts
```

Expected: FAIL because the core modules do not exist.

- [ ] **Step 4: Implement the domain types and tree utilities**

Define:

```ts
export type MenuItemType = "module" | "directory" | "page" | "external"
export type ExternalOpenMode = "current" | "new-tab"

export interface MenuConfigRecord {
  id: string
  tenantId: string
  parentId: string | null
  type: MenuItemType
  name: string
  icon: MenuIconKey | null
  pageKey: string | null
  externalUrl: string | null
  externalOpenMode: ExternalOpenMode | null
  sort: number
  visible: boolean
}

export interface MenuTreeNode extends MenuConfigRecord {
  children: MenuTreeNode[]
}
```

`buildMenuTree` must discard orphan records from runtime output, recursively sort siblings by `sort` then `name`, and return fresh objects. `resolveFirstTarget` must scan visible descendants in display order and resolve either an internal path or an external URL.

- [ ] **Step 5: Run the tree tests and verify the green state**

Run:

```bash
npm test -- src/features/menu-config/__tests__/menu-tree.test.ts
```

Expected: PASS.

- [ ] **Step 6: Write failing validation tests**

Assert exact error codes for:

```ts
expect(validateMenuRecord(duplicateName, records, context)).toContain("duplicate-sibling-name")
expect(validateMenuRecord(nestedDirectory, records, context)).toContain("directory-depth-exceeded")
expect(validateMenuRecord(duplicatePage, records, context)).toContain("duplicate-page-key")
expect(validateMenuRecord(badUrl, records, context)).toContain("invalid-external-url")
expect(validateMenuRecord(cycle, records, context)).toContain("cyclic-parent")
```

- [ ] **Step 7: Implement validation and run the focused tests**

`validateMenuRecord` returns stable string codes. Validate type-specific fields, the three-level hierarchy, sibling names, unique page keys, tenant-compatible pages, parent existence, cycles, and `http`/`https` URLs.

Run:

```bash
npm test -- src/features/menu-config/__tests__/menu-validation.test.ts
```

Expected: PASS.

- [ ] **Step 8: Commit the domain layer**

```bash
git add package.json package-lock.json vitest.config.ts src/features/menu-config
git commit -m "feat: add tenant menu domain model"
```

### Task 2: Create the page registry and tenant-type templates

**Files:**
- Create: `src/config/page-registry.ts`
- Create: `src/config/menu-templates.ts`
- Modify: `src/router/index.ts`
- Delete: `src/router/modules/security.ts`
- Delete: `src/router/modules/bureau.ts`
- Delete: `src/router/modules/org.ts`
- Modify: `src/types/navigation.ts`
- Test: `src/config/__tests__/page-registry.test.ts`
- Test: `src/config/__tests__/menu-templates.test.ts`

**Interfaces:**
- Produces: `PageRegistryItem`, `pageRegistry`, `pageRegistryByKey`, and `pageRouteRecords`.
- Produces: `tenantMenuTemplates: Record<TenantType, MenuConfigRecord[]>` and `cloneTenantTemplate(tenant)`.
- Consumes: Task 1 `MenuConfigRecord` and existing view components.

- [ ] **Step 1: Write failing registry and template integrity tests**

Tests must assert:

```ts
expect(new Set(pageRegistry.map((page) => page.key)).size).toBe(pageRegistry.length)
expect(new Set(pageRegistry.map((page) => page.path)).size).toBe(pageRegistry.length)
expect(pageRegistryByKey.get("device-list")?.path).toBe("/security/new-gate/device-list")
expect(Object.keys(tenantMenuTemplates)).toEqual(["school", "bureau", "org"])
expect(templatePageKeys.every((key) => pageRegistryByKey.has(key))).toBe(true)
expect(cloneTenantTemplate(schoolA)).not.toEqual(cloneTenantTemplate(schoolB))
expect(cloneTenantTemplate(schoolA).every((record) => record.tenantId === schoolA.id)).toBe(true)
```

- [ ] **Step 2: Run tests and verify the red state**

Run:

```bash
npm test -- src/config/__tests__/page-registry.test.ts src/config/__tests__/menu-templates.test.ts
```

Expected: FAIL because the registry and templates do not exist.

- [ ] **Step 3: Implement the page registry**

Move every current page route into `pageRegistry` using its existing route name as the stable page key. Preserve all current paths and components, including generic placeholder pages. Add `tenantTypes` to each entry and generate child route records with:

```ts
{
  path: page.path.slice(1),
  name: page.key,
  component: page.component,
  meta: { pageKey: page.key, title: page.title },
}
```

Keep root redirects, the fixed `/system/menu-config` route placeholder, and the catch-all in `router/index.ts`. Remove the three superseded route module files only after the generated registry routes cover every old route path.

- [ ] **Step 4: Implement type templates**

Translate the current `topNavTabs` and `moduleMenus` into flat records:

- School: 9 modules, including family interaction, care management, academic, schedule, dorm, office, finance, security, and sports.
- Bureau: 3 modules, including custody school, organization management, and operator management.
- Organization: 4 modules, including organization management, settlement, course/class management, and notices.

Use stable template IDs, then `cloneTenantTemplate` must generate fresh IDs with `crypto.randomUUID()` and remap every `parentId`.

- [ ] **Step 5: Run the focused tests and type-check**

Run:

```bash
npm test -- src/config/__tests__/page-registry.test.ts src/config/__tests__/menu-templates.test.ts
npm exec vue-tsc -- --noEmit -p tsconfig.app.json
```

Expected: all checks PASS.

- [ ] **Step 6: Commit the registry migration**

```bash
git add src/config src/router src/types/navigation.ts
git commit -m "refactor: register pages and tenant menu templates"
```

### Task 3: Implement versioned tenant menu persistence

**Files:**
- Create: `src/features/menu-config/menu-repository.ts`
- Create: `src/features/menu-config/local-storage-menu-repository.ts`
- Test: `src/features/menu-config/__tests__/local-storage-menu-repository.test.ts`

**Interfaces:**
- Produces: `MenuRepositoryLoadResult` and `TenantMenuRepository` with `list`, `replace`, and `reset` methods.
- Produces: `tenantMenuRepository` singleton.
- Consumes: Task 2 `cloneTenantTemplate` and Task 1 record validation utilities.

- [ ] **Step 1: Write failing persistence tests**

Use an in-memory `Storage` stub and assert:

```ts
expect(repository.list(schoolA).records).toEqual(expect.arrayContaining([expect.objectContaining({ tenantId: schoolA.id })]))
expect(repository.list(schoolA).records).not.toEqual(repository.list(schoolB).records)
expect(JSON.parse(storage.getItem(`operation-platform:tenant-menu:v1:${schoolA.id}`)!)).toMatchObject({ version: 1 })
expect(storageKeys.some((key) => key.startsWith(`operation-platform:tenant-menu:invalid:${schoolA.id}:`))).toBe(true)
```

Also cover replacement, reset, unsupported versions, invalid JSON, invalid records, and write failures.

- [ ] **Step 2: Run the repository test and verify the red state**

Run:

```bash
npm test -- src/features/menu-config/__tests__/local-storage-menu-repository.test.ts
```

Expected: FAIL because the repository does not exist.

- [ ] **Step 3: Implement the repository**

Use this public contract:

```ts
export interface MenuRepositoryLoadResult {
  records: MenuConfigRecord[]
  recoveryNotice: string | null
}

export interface TenantMenuRepository {
  list(tenant: TenantInfo): MenuRepositoryLoadResult
  replace(tenant: TenantInfo, records: MenuConfigRecord[]): MenuConfigRecord[]
  reset(tenant: TenantInfo): MenuConfigRecord[]
}
```

Return defensive copies. On invalid data, store the raw value under the timestamped invalid key, restore the type template, and set `recoveryNotice` to a Chinese recovery message. If `setItem` throws, propagate a typed `MenuPersistenceError` and leave runtime state unchanged.

- [ ] **Step 4: Run the repository and domain suites**

Run:

```bash
npm test -- src/features/menu-config/__tests__
```

Expected: PASS.

- [ ] **Step 5: Commit persistence**

```bash
git add src/features/menu-config
git commit -m "feat: persist tenant menu configuration"
```

### Task 4: Drive the header and sidebar from tenant records

**Files:**
- Modify: `src/stores/navigation.ts`
- Modify: `src/config/navigation.ts`
- Modify: `src/components/AppHeader.vue`
- Modify: `src/components/AppSidebar.vue`
- Modify: `src/components/SidebarMenuNode.vue`
- Modify: `src/layouts/AppLayout.vue`
- Modify: `src/types/navigation.ts`
- Test: `src/stores/__tests__/navigation.test.ts`

**Interfaces:**
- Produces from `useNavigationStore`: `records`, `moduleNodes`, `currentMenus`, `activeModuleId`, `activeMenuId`, `loadTenant(tenant)`, `navigateToMenu(node, router)`, `syncByRoute(route)`, and `ensureValidCurrentRoute(router)`.
- Consumes: Task 1 tree/target utilities, Task 2 page registry, Task 3 repository, and existing user store.

- [ ] **Step 1: Write failing navigation store tests**

Assert:

```ts
expect(store.moduleNodes.map((node) => node.name)).toContain("校园安全")
expect(store.currentMenus.every((node) => node.parentId === store.activeModuleId)).toBe(true)
expect(store.moduleNodes.every((node) => resolveFirstTarget(node, pageRegistryByKey))).toBe(true)
expect(store.activeMenuId).toBe(menuForCurrentRoute.id)
```

Cover two schools with divergent records, hidden modules, modules without targets, internal navigation, current-tab external navigation, new-tab external navigation, and route fallback.

- [ ] **Step 2: Run the store tests and verify the red state**

Run:

```bash
npm test -- src/stores/__tests__/navigation.test.ts
```

Expected: FAIL against the static navigation store.

- [ ] **Step 3: Refactor the navigation store**

Replace reads from `topNavTabs`, `moduleMenus`, and `moduleDefaultPaths` with repository records and computed trees. Keep `pageSubTabs` static in `src/config/navigation.ts`. Resolve internal paths through `pageRegistryByKey`. Use `window.open(url, "_blank", "noopener,noreferrer")` only for `new-tab` external targets.

- [ ] **Step 4: Update navigation components**

- `AppHeader.vue`: render `moduleNodes`, navigate through `navigateToMenu`, and call `loadTenant` after tenant switching.
- `AppSidebar.vue`: render the current module's derived child nodes.
- `SidebarMenuNode.vue`: consume `MenuTreeNode`, keep the current recursive visual behavior, and handle external leaves through the store.
- `AppLayout.vue`: initialize the current tenant menu and keep route synchronization.

- [ ] **Step 5: Run focused tests and application type-check**

Run:

```bash
npm test -- src/stores/__tests__/navigation.test.ts
npm exec vue-tsc -- --noEmit -p tsconfig.app.json
```

Expected: PASS.

- [ ] **Step 6: Commit dynamic runtime navigation**

```bash
git add src/stores src/config/navigation.ts src/components src/layouts src/types/navigation.ts
git commit -m "feat: render tenant-specific navigation"
```

### Task 5: Build the system menu configuration center

**Files:**
- Create: `src/stores/menu-config.ts`
- Create: `src/views/system/menu-config/MenuConfigView.vue`
- Create: `src/views/system/menu-config/MenuEditorDrawer.vue`
- Create: `src/views/system/menu-config/MenuTypeTag.vue`
- Modify: `src/router/index.ts`
- Modify: `src/components/AppHeader.vue`
- Test: `src/views/system/menu-config/__tests__/MenuConfigView.test.ts`
- Test: `src/views/system/menu-config/__tests__/MenuEditorDrawer.test.ts`

**Interfaces:**
- Produces from `useMenuConfigStore`: `selectedTenant`, `records`, `tree`, `load`, `create`, `update`, `removeCascade`, `reset`, and `filter`.
- `MenuEditorDrawer` consumes `tenant`, `records`, and optional `editingRecord`; emits `save(recordInput)` and `close`.
- Consumes: Tasks 1–3 domain, registry, templates, and repository.

- [ ] **Step 1: Write failing editor tests**

Cover exact conditional behavior:

```ts
expect(wrapper.find('[data-field="page-key"]').exists()).toBe(true)
expect(wrapper.find('[data-field="external-url"]').exists()).toBe(false)
expect(pageOptions.every((option) => option.tenantTypes.includes(selectedTenant.type))).toBe(true)
```

Switch to `external` and assert URL/open-mode fields appear. Assert nested directories are rejected, duplicate page keys are rejected, and valid form submission emits a normalized record input.

- [ ] **Step 2: Write failing configuration-page tests**

Cover tenant type/name filtering, required tenant selection, keyword/status filtering, add/edit, immediate persistence, cascade-delete count, reset confirmation, persistence errors, and runtime refresh when editing the current tenant.

- [ ] **Step 3: Run component tests and verify the red state**

Run:

```bash
npm test -- src/views/system/menu-config/__tests__
```

Expected: FAIL because the views and store do not exist.

- [ ] **Step 4: Implement the configuration store**

The store edits any selected tenant without changing the user's current tenant. Every successful mutation writes a complete record array through the repository. If the edited tenant equals the user store's current tenant, reload the runtime navigation store after persistence succeeds.

- [ ] **Step 5: Implement the editor drawer**

Use `el-drawer`, `el-form`, `el-select`, `el-input-number`, `el-switch`, and the existing Element Plus icon set. Map validation error codes to concise Chinese field messages. Do not expose `tenantId`, record IDs, component paths, or raw route paths as editable fields.

- [ ] **Step 6: Implement the tree-table page**

Use the existing page/filter spacing and tokens. Include tenant type, required tenant, name keyword, and visible-status filters. Render `el-table` with `row-key="id"`, `tree-props`, numeric sort, status switch, and row actions. Add the “新增顶部模块” and “恢复默认模板” actions with confirmations.

- [ ] **Step 7: Add the fixed route and admin entry**

Register `/system/menu-config` outside tenant-generated pages. Add “菜单配置” to the user dropdown only when `userStore.isAdmin`. Guard the route by the existing mock admin role and redirect non-admin users to their first available tenant page.

- [ ] **Step 8: Run component tests, type-check, and lint without fixes**

Run:

```bash
npm test -- src/views/system/menu-config/__tests__
npm exec vue-tsc -- --noEmit -p tsconfig.app.json
npm exec eslint -- .
```

Expected: PASS.

- [ ] **Step 9: Commit the configuration center**

```bash
git add src/stores/menu-config.ts src/views/system src/router/index.ts src/components/AppHeader.vue
git commit -m "feat: add tenant menu configuration center"
```

### Task 6: Add route ownership guards and resilient fallback states

**Files:**
- Create: `src/views/MenuUnavailableView.vue`
- Modify: `src/router/index.ts`
- Modify: `src/stores/navigation.ts`
- Modify: `src/views/system/menu-config/MenuConfigView.vue`
- Test: `src/router/__tests__/navigation-guard.test.ts`

**Interfaces:**
- Produces: `resolveTenantRouteAccess(to, tenant, records)` returning `allow`, `redirect`, or `empty`.
- Consumes: current tenant, page registry `pageKey` metadata, and visible runtime menu records.

- [ ] **Step 1: Write failing guard tests**

Assert that visible registered pages are allowed, hidden/deleted page keys redirect to the first target, the fixed system route is allowed for admins, non-admins are redirected, and tenants without any internal target receive the menu-unavailable view.

- [ ] **Step 2: Run the guard test and verify the red state**

Run:

```bash
npm test -- src/router/__tests__/navigation-guard.test.ts
```

Expected: FAIL because access resolution does not exist.

- [ ] **Step 3: Implement the guard and empty state**

Add a global `beforeEach` that uses `to.meta.pageKey`. Exempt public root redirects and handle the system route separately. Avoid redirect loops by comparing the resolved target path to `to.path`. Render a clear Chinese empty state when no internal route exists.

- [ ] **Step 4: Make destructive configuration changes route-safe**

After hiding, deleting, or resetting the current tenant's menu, call `ensureValidCurrentRoute`. Preserve editor data when persistence fails and show the repository error instead of updating navigation.

- [ ] **Step 5: Run all automated checks**

Run:

```bash
npm test
npm exec vue-tsc -- --noEmit -p tsconfig.app.json
npm exec tsc -- --noEmit -p tsconfig.node.json
npm exec eslint -- .
```

Expected: PASS.

- [ ] **Step 6: Commit route resilience**

```bash
git add src/router src/stores/navigation.ts src/views/MenuUnavailableView.vue src/views/system/menu-config/MenuConfigView.vue
git commit -m "feat: guard tenant-owned menu routes"
```

### Task 7: Verify the complete product flow and update project documentation

**Files:**
- Modify: `README.md`
- Modify: `docs/superpowers/specs/2026-06-30-tenant-menu-configuration-design.md` only if implementation decisions require an exact correction.

**Interfaces:**
- Consumes: all previous tasks.
- Produces: verified feature behavior and repeatable local commands.

- [ ] **Step 1: Add concise project documentation**

Replace the default Vue README content with the project purpose, Node requirement, install/dev/build/test/lint commands, the fixed `/system/menu-config` route, and the localStorage reset key pattern.

- [ ] **Step 2: Run the full verification suite**

Run:

```bash
npm test
npm run build
npm exec eslint -- .
```

Expected: Vitest reports zero failures, the production build exits 0, and ESLint exits 0.

- [ ] **Step 3: Start the local application**

Run:

```bash
npm run dev -- --host 127.0.0.1
```

Expected: Vite prints a reachable localhost URL and remains running for browser verification.

- [ ] **Step 4: Verify the product flow in the browser**

Verify these exact stories:

1. Open `/system/menu-config` as admin.
2. Give two school tenants different visible modules and confirm tenant switching changes both top and side navigation.
3. Add internal, directory, and external menu types and verify conditional fields and navigation.
4. Refresh and confirm persisted values.
5. Hide/delete the active page and confirm safe fallback.
6. Reset one tenant and confirm only that tenant returns to its type template.
7. Switch to teacher role and confirm the fixed configuration entry and route are unavailable.

- [ ] **Step 5: Inspect the final diff and commit documentation**

Run:

```bash
git diff --check
git status --short
```

Then commit:

```bash
git add README.md docs
git commit -m "docs: document tenant menu configuration"
```
