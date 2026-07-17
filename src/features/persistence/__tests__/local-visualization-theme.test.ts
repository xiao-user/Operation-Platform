import { beforeEach, describe, expect, it } from "vitest";
import { LocalStorageOperationPlatformPersistence } from "@/features/persistence/local-storage-operation-platform-persistence";

describe("local visualization theme preference", () => {
  beforeEach(() => window.localStorage.clear());

  it("isolates the selected theme by tenant and user", async () => {
    const persistence = new LocalStorageOperationPlatformPersistence();
    await persistence.setVisualizationTheme("bureau-001", "user-a", "royal");
    await persistence.setVisualizationTheme("bureau-001", "user-b", "lime");

    expect(persistence.getVisualizationTheme("bureau-001", "user-a")).toBe("royal");
    expect(persistence.getVisualizationTheme("bureau-001", "user-b")).toBe("lime");
    expect(persistence.getVisualizationTheme("bureau-002", "user-a")).toBeNull();
  });

  it("migrates the previous page-global theme key on first read", () => {
    window.localStorage.setItem(
      "operation-platform:regional-education-overview:theme:v1",
      "amber",
    );
    const persistence = new LocalStorageOperationPlatformPersistence();

    expect(persistence.getVisualizationTheme("bureau-001", "user-a")).toBe("amber");
    expect(window.localStorage.getItem(
      "operation-platform:visualization-theme:v1:bureau-001:user-a",
    )).toBe("amber");
  });
});
