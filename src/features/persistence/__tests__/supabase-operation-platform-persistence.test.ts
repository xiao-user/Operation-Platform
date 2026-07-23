import { afterEach, describe, expect, it, vi } from "vitest";
import { SupabaseOperationPlatformPersistence } from "@/features/persistence/supabase-operation-platform-persistence";
import {
  supabaseOperationPlatformRepository,
  type OperationPlatformBootstrap,
} from "@/features/persistence/supabase-operation-platform-repository";
import { createDefaultTenantConfiguration } from "@/features/tenant-config/default-tenant-configuration";
import { createDefaultWorkbenchLayout } from "@/features/workbench/workbench-layout";
import { getWorkbenchTemplate } from "@/features/workbench/workbench-templates";
import type { TenantConfiguration } from "@/features/tenant-config/types";
import type { WorkbenchLayoutContext } from "@/features/workbench/types";
import type { TenantInfo } from "@/types/user";

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

    const loading = persistence.loadTenantState(tenant);
    persistence.reset();
    pending.resolve({ configuration: null, members: [] });
    await expect(loading).rejects.toThrow("数据尚未加载");

    expect(persistence.peekTenantState(tenant)).toBeNull();
  });

  it("skips a remote configuration write when the content did not change", async () => {
    const persistence = new SupabaseOperationPlatformPersistence();
    const tenant = tenantFixture("school-unchanged");
    const configuration = configurationFixture(tenant, "工作台");
    vi.spyOn(supabaseOperationPlatformRepository, "bootstrap").mockResolvedValue(
      bootstrapFixture("user-unchanged", tenant.id, configuration),
    );
    const save = vi.spyOn(supabaseOperationPlatformRepository, "saveConfiguration");

    await persistence.initialize({ id: "user-unchanged" });
    await expect(persistence.saveConfiguration(tenant, configuration)).resolves.toEqual(configuration);

    expect(save).not.toHaveBeenCalled();
  });

  it("serializes configuration writes per tenant and coalesces queued changes", async () => {
    const persistence = new SupabaseOperationPlatformPersistence();
    const tenant = tenantFixture("school-coalesced");
    const initial = configurationFixture(tenant, "工作台");
    const first = configurationFixture(tenant, "第一版");
    const second = configurationFixture(tenant, "第二版");
    const latest = configurationFixture(tenant, "最终版");
    const firstWrite = deferred<number>();
    const latestWrite = deferred<number>();
    vi.spyOn(supabaseOperationPlatformRepository, "bootstrap").mockResolvedValue(
      bootstrapFixture("user-coalesced", tenant.id, initial),
    );
    const save = vi.spyOn(supabaseOperationPlatformRepository, "saveConfiguration")
      .mockReturnValueOnce(firstWrite.promise)
      .mockReturnValueOnce(latestWrite.promise);
    await persistence.initialize({ id: "user-coalesced" });

    const firstResult = persistence.saveConfiguration(tenant, first);
    await vi.waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    const secondResult = persistence.saveConfiguration(tenant, second);
    const latestResult = persistence.saveConfiguration(tenant, latest);
    expect(save).toHaveBeenCalledTimes(1);

    firstWrite.resolve(8);
    await vi.waitFor(() => expect(save).toHaveBeenCalledTimes(2));
    expect(save).toHaveBeenLastCalledWith(tenant.id, 8, latest);
    latestWrite.resolve(9);

    await expect(firstResult).resolves.toEqual(first);
    await expect(secondResult).resolves.toEqual(latest);
    await expect(latestResult).resolves.toEqual(latest);
    expect(persistence.peekTenantState(tenant)?.configuration.configuration).toEqual(latest);
  });

  it("rejects queued configuration writes after a failed write instead of retrying", async () => {
    const persistence = new SupabaseOperationPlatformPersistence();
    const tenant = tenantFixture("school-failed");
    const initial = configurationFixture(tenant, "工作台");
    const first = configurationFixture(tenant, "第一版");
    const queued = configurationFixture(tenant, "排队版本");
    const firstWrite = deferred<number>();
    vi.spyOn(supabaseOperationPlatformRepository, "bootstrap").mockResolvedValue(
      bootstrapFixture("user-failed", tenant.id, initial),
    );
    const save = vi.spyOn(supabaseOperationPlatformRepository, "saveConfiguration")
      .mockReturnValue(firstWrite.promise);
    await persistence.initialize({ id: "user-failed" });

    const firstResult = persistence.saveConfiguration(tenant, first);
    await vi.waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    const queuedResult = persistence.saveConfiguration(tenant, queued);
    const results = Promise.allSettled([firstResult, queuedResult]);
    firstWrite.reject(new Error("PGRST003"));

    await expect(results).resolves.toEqual([
      expect.objectContaining({ status: "rejected", reason: expect.objectContaining({ message: "PGRST003" }) }),
      expect.objectContaining({ status: "rejected", reason: expect.objectContaining({ message: "PGRST003" }) }),
    ]);
    expect(save).toHaveBeenCalledTimes(1);
    expect(persistence.peekTenantState(tenant)?.configuration.configuration).toEqual(initial);
  });
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });
  return { promise, resolve, reject };
}

function tenantFixture(id: string): TenantInfo {
  return {
    id,
    name: "测试学校",
    shortName: "测试",
    type: "school",
    enabled: true,
  };
}

function configurationFixture(tenant: TenantInfo, workbenchLabel: string) {
  const configuration = createDefaultTenantConfiguration(tenant);
  configuration.shellConfig.workbench.label = workbenchLabel;
  return configuration;
}

function bootstrapFixture(
  userId: string,
  tenantId: string,
  configuration?: TenantConfiguration,
): OperationPlatformBootstrap {
  return {
    profile: {
      id: userId,
      display_name: "测试用户",
      initials: "测试",
      platform_admin: false,
    },
    tenants: [tenantFixture(tenantId)],
    configurations: configuration
      ? new Map([[tenantId, { configuration, revision: 7 }]])
      : new Map(),
    members: new Map(),
    activeRoles: new Map(),
    visualizationThemes: new Map(),
    workbenchLayouts: new Map(),
  };
}
