import { beforeEach, describe, expect, it } from "vitest";
import {
  createLocalStorageExportSnapshot,
  LOCAL_STORAGE_EXPORT_FORMAT,
} from "@/features/data-migration/local-storage-export";

describe("local storage export", () => {
  beforeEach(() => localStorage.clear());

  it("exports operation platform records without unrelated browser data", () => {
    localStorage.setItem("unrelated", "private");
    localStorage.setItem("operation-platform:tenants:v1", '[{"id":"school-a"}]');
    localStorage.setItem("operation-platform:tenant-members:v1:school-a", "[]");

    const snapshot = createLocalStorageExportSnapshot(localStorage, {
      origin: "http://localhost:5173",
      exportedAt: "2026-07-17T00:00:00.000Z",
    });

    expect(snapshot).toEqual({
      format: LOCAL_STORAGE_EXPORT_FORMAT,
      version: 1,
      origin: "http://localhost:5173",
      exportedAt: "2026-07-17T00:00:00.000Z",
      entries: {
        "operation-platform:tenant-members:v1:school-a": "[]",
        "operation-platform:tenants:v1": '[{"id":"school-a"}]',
      },
    });
  });
});
