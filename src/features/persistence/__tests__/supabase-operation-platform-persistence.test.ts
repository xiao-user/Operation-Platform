import { afterEach, describe, expect, it, vi } from "vitest";
import { SupabaseOperationPlatformPersistence } from "@/features/persistence/supabase-operation-platform-persistence";
import {
  supabaseOperationPlatformRepository,
  type OperationPlatformBootstrap,
} from "@/features/persistence/supabase-operation-platform-repository";
import { createDefaultWorkbenchLayout } from "@/features/workbench/workbench-layout";
import { getWorkbenchTemplate } from "@/features/workbench/workbench-templates";
import type { WorkbenchLayoutContext } from "@/features/workbench/types";

describe("Supabase operation platform persistence", () => {
  afterEach(() => vi.restoreAllMocks());

  it("rejects an invalid workbench layout before writing remotely", async () => {
    const persistence = new SupabaseOperationPlatformPersistence();
    const context: WorkbenchLayoutContext = {
      tenant: {
        id: "school-validation",
        name: "布局校验学校",
        shortName: "校验学校",
        type: "school",
        enabled: true,
      },
      userId: "user-validation",
      profile: "admin",
    };
    const template = getWorkbenchTemplate("school", "admin");
    const layout = createDefaultWorkbenchLayout(context, template);
    layout.items[0]!.widgetKey = "unknown-widget";

    await expect(
      persistence.saveWorkbenchLayout(context, template, layout),
    ).rejects.toThrow("工作台布局不完整，无法保存");
  });

  it("does not let a stale bootstrap refill caches after reset", async () => {
    const persistence = new SupabaseOperationPlatformPersistence();
    const pending = deferred<OperationPlatformBootstrap>();
    vi.spyOn(supabaseOperationPlatformRepository, "bootstrap").mockReturnValue(pending.promise);

    const initialization = persistence.initialize({ id: "user-stale" });
    persistence.reset();
    pending.resolve(bootstrapFixture("user-stale", "school-stale"));
    await initialization;

    expect(persistence.listTenants()).toEqual([]);
  });

  it("does not apply a tenant request that completes after reset", async () => {
    const persistence = new SupabaseOperationPlatformPersistence();
    const tenant = {
      id: "school-stale",
      name: "过期学校",
      shortName: "过期",
      type: "school" as const,
      enabled: true,
    };
    const pending = deferred<Awaited<ReturnType<typeof supabaseOperationPlatformRepository.loadTenantState>>>();
    vi.spyOn(supabaseOperationPlatformRepository, "loadTenantState").mockReturnValue(pending.promise);

    const loading = persistence.ensureTenantLoaded(tenant);
    persistence.reset();
    pending.resolve({ configuration: null, members: [] });
    await loading;

    expect(persistence.loadConfiguration(tenant)).toBeNull();
    expect(persistence.loadMembers(tenant).members).toEqual([]);
  });
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve;
  });
  return { promise, resolve };
}

function bootstrapFixture(userId: string, tenantId: string): OperationPlatformBootstrap {
  return {
    profile: {
      id: userId,
      display_name: "测试用户",
      initials: "测试",
      platform_admin: false,
    },
    tenants: [{
      id: tenantId,
      name: "测试学校",
      shortName: "测试",
      type: "school",
      enabled: true,
    }],
    configurations: new Map(),
    members: new Map(),
    activeRoles: new Map(),
    visualizationThemes: new Map(),
    workbenchLayouts: new Map(),
  };
}
