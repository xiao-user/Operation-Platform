interface ActiveRoleContext {
  tenantId: string;
  userId: string;
}

const STORAGE_PREFIX = "operation-platform:active-role:v1:";

export class ActiveRolePersistenceError extends Error {
  readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "ActiveRolePersistenceError";
    this.cause = cause;
  }
}

export function activeRoleStorageKey(context: ActiveRoleContext) {
  return `${STORAGE_PREFIX}${context.tenantId}:${context.userId}`;
}

export function activeRoleStorageKeysForTenant(storage: Storage, tenantId: string) {
  const prefix = `${STORAGE_PREFIX}${tenantId}:`;
  const keys: string[] = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (key?.startsWith(prefix)) keys.push(key);
  }
  return keys;
}

export class LocalStorageActiveRoleRepository {
  constructor(private readonly storage: Storage) {}

  get(context: ActiveRoleContext) {
    const value = this.storage.getItem(activeRoleStorageKey(context));
    return value?.trim() || null;
  }

  set(context: ActiveRoleContext, roleId: string) {
    const normalized = roleId.trim();
    if (!normalized) {
      throw new ActiveRolePersistenceError("当前角色不能为空");
    }
    try {
      this.storage.setItem(activeRoleStorageKey(context), normalized);
    } catch (error) {
      throw new ActiveRolePersistenceError("当前角色保存失败，请检查浏览器存储空间", error);
    }
  }

  remove(context: ActiveRoleContext) {
    try {
      this.storage.removeItem(activeRoleStorageKey(context));
    } catch (error) {
      throw new ActiveRolePersistenceError("当前角色清理失败", error);
    }
  }
}

export const activeRoleRepository = new LocalStorageActiveRoleRepository(window.localStorage);
