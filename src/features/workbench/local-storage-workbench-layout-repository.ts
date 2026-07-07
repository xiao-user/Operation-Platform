import {
  cloneWorkbenchLayout,
  createDefaultWorkbenchLayout,
  reconcileStoredWorkbenchLayout,
  validateWorkbenchLayout,
} from "@/features/workbench/workbench-layout";
import type {
  UserWorkbenchLayout,
  WorkbenchLayoutContext,
  WorkbenchLayoutLoadResult,
  WorkbenchTemplate,
} from "@/features/workbench/types";

const STORAGE_PREFIX = "operation-platform:workbench-layout:v1:";

export class WorkbenchLayoutPersistenceError extends Error {
  readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "WorkbenchLayoutPersistenceError";
    this.cause = cause;
  }
}

export function workbenchLayoutStorageKey(context: WorkbenchLayoutContext) {
  return `${STORAGE_PREFIX}${context.tenant.id}:${context.userId}:${context.profile}`;
}

function invalidWorkbenchLayoutStorageKey(context: WorkbenchLayoutContext, timestamp: number) {
  return `operation-platform:workbench-layout:invalid:${context.tenant.id}:${context.userId}:${context.profile}:${timestamp}`;
}

export function workbenchLayoutStorageKeysForTenant(storage: Storage, tenantId: string) {
  const prefix = `${STORAGE_PREFIX}${tenantId}:`;
  const keys: string[] = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (key?.startsWith(prefix)) keys.push(key);
  }
  return keys;
}

export class LocalStorageWorkbenchLayoutRepository {
  constructor(
    private readonly storage: Storage,
    private readonly now: () => number = Date.now,
  ) {}

  list(
    context: WorkbenchLayoutContext,
    template: WorkbenchTemplate,
  ): WorkbenchLayoutLoadResult {
    const key = workbenchLayoutStorageKey(context);
    const raw = this.storage.getItem(key);
    if (raw === null) {
      return {
        layout: createDefaultWorkbenchLayout(context, template),
        hasOverride: false,
        recoveryNotice: null,
      };
    }

    try {
      const parsed = JSON.parse(raw) as unknown;
      const reconciled = reconcileStoredWorkbenchLayout(parsed, context, template);
      if (!reconciled) return this.recoverInvalidLayout(context, template, raw);
      return {
        layout: cloneWorkbenchLayout(reconciled),
        hasOverride: true,
        recoveryNotice: null,
      };
    } catch (error) {
      if (error instanceof WorkbenchLayoutPersistenceError) throw error;
      return this.recoverInvalidLayout(context, template, raw);
    }
  }

  replace(
    context: WorkbenchLayoutContext,
    template: WorkbenchTemplate,
    layout: UserWorkbenchLayout,
  ) {
    if (!validateWorkbenchLayout(layout, context, template)) {
      throw new WorkbenchLayoutPersistenceError("工作台布局不完整，无法保存");
    }
    const cloned = cloneWorkbenchLayout(layout);
    try {
      this.storage.setItem(workbenchLayoutStorageKey(context), JSON.stringify(cloned));
    } catch (error) {
      throw new WorkbenchLayoutPersistenceError("工作台布局保存失败，请检查浏览器存储空间", error);
    }
    return cloneWorkbenchLayout(cloned);
  }

  reset(context: WorkbenchLayoutContext, template: WorkbenchTemplate) {
    try {
      this.storage.removeItem(workbenchLayoutStorageKey(context));
    } catch (error) {
      throw new WorkbenchLayoutPersistenceError("恢复默认工作台失败", error);
    }
    return createDefaultWorkbenchLayout(context, template);
  }

  removeTenant(tenantId: string) {
    let keys: string[];
    let previousValues: Map<string, string | null>;
    try {
      keys = workbenchLayoutStorageKeysForTenant(this.storage, tenantId);
      previousValues = new Map(keys.map((key) => [key, this.storage.getItem(key)]));
    } catch (error) {
      throw new WorkbenchLayoutPersistenceError("工作台布局清理失败，无法读取清理前状态", error);
    }
    try {
      for (const key of keys) this.storage.removeItem(key);
    } catch (error) {
      try {
        for (const [key, value] of previousValues) {
          if (value !== null) this.storage.setItem(key, value);
        }
      } catch (rollbackError) {
        throw new WorkbenchLayoutPersistenceError(
          "工作台布局清理失败，且无法恢复清理前状态",
          rollbackError,
        );
      }
      throw new WorkbenchLayoutPersistenceError("工作台布局清理失败，已恢复清理前状态", error);
    }
  }

  private recoverInvalidLayout(
    context: WorkbenchLayoutContext,
    template: WorkbenchTemplate,
    raw: string,
  ): WorkbenchLayoutLoadResult {
    const currentKey = workbenchLayoutStorageKey(context);
    try {
      this.storage.setItem(invalidWorkbenchLayoutStorageKey(context, this.now()), raw);
    } catch (error) {
      throw new WorkbenchLayoutPersistenceError("工作台布局备份失败，无法恢复默认布局", error);
    }
    try {
      this.storage.removeItem(currentKey);
    } catch (error) {
      throw new WorkbenchLayoutPersistenceError("工作台布局已备份，但恢复默认布局失败", error);
    }
    return {
      layout: createDefaultWorkbenchLayout(context, template),
      hasOverride: false,
      recoveryNotice: "检测到无效工作台布局，已恢复当前角色的默认布局",
    };
  }
}

export const workbenchLayoutRepository = new LocalStorageWorkbenchLayoutRepository(
  window.localStorage,
);
