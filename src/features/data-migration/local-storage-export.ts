const OPERATION_PLATFORM_STORAGE_PREFIX = "operation-platform:";

export const LOCAL_STORAGE_EXPORT_FORMAT = "operation-platform-local-storage-export";
export const LOCAL_STORAGE_EXPORT_VERSION = 1;

export interface LocalStorageExportSnapshot {
  format: typeof LOCAL_STORAGE_EXPORT_FORMAT;
  version: typeof LOCAL_STORAGE_EXPORT_VERSION;
  origin: string;
  exportedAt: string;
  entries: Record<string, string>;
}

export function createLocalStorageExportSnapshot(
  storage: Storage,
  options: { origin?: string; exportedAt?: string } = {},
): LocalStorageExportSnapshot {
  const keys: string[] = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (key?.startsWith(OPERATION_PLATFORM_STORAGE_PREFIX)) keys.push(key);
  }

  const entries = Object.fromEntries(
    keys.sort().flatMap((key) => {
      const value = storage.getItem(key);
      return value === null ? [] : [[key, value]];
    }),
  );

  return {
    format: LOCAL_STORAGE_EXPORT_FORMAT,
    version: LOCAL_STORAGE_EXPORT_VERSION,
    origin: options.origin ?? window.location.origin,
    exportedAt: options.exportedAt ?? new Date().toISOString(),
    entries,
  };
}

export function downloadLocalStorageExportSnapshot(
  snapshot: LocalStorageExportSnapshot,
  filename = `operation-platform-local-data-${snapshot.exportedAt.slice(0, 10)}.json`,
) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
