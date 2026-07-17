import { dataBackend } from "@/config/runtime-providers";
import { LocalStorageOperationPlatformPersistence } from "@/features/persistence/local-storage-operation-platform-persistence";
import { SupabaseOperationPlatformPersistence } from "@/features/persistence/supabase-operation-platform-persistence";

export const operationPlatformPersistence = dataBackend === "supabase"
  ? new SupabaseOperationPlatformPersistence()
  : new LocalStorageOperationPlatformPersistence();

export const operationPlatformPersistenceCapabilities = operationPlatformPersistence.capabilities;
