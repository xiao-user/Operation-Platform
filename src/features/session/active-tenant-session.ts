const ACTIVE_TENANT_SESSION_PREFIX = "operation-platform:active-tenant-session:v1";

export function activeTenantSessionKey(userId: string) {
  return `${ACTIVE_TENANT_SESSION_PREFIX}:${userId}`;
}

export function loadActiveTenantFromSession(userId: string) {
  if (!userId) return null;
  return window.sessionStorage.getItem(activeTenantSessionKey(userId));
}

export function saveActiveTenantToSession(userId: string, tenantId: string) {
  window.sessionStorage.setItem(activeTenantSessionKey(userId), tenantId);
}

export function clearActiveTenantSession(userId: string) {
  if (!userId) return;
  window.sessionStorage.removeItem(activeTenantSessionKey(userId));
}
