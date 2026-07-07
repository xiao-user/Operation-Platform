import { beforeEach, describe, expect, it } from "vitest";
import {
  LocalStorageWorkbenchLayoutRepository,
  WorkbenchLayoutPersistenceError,
  workbenchLayoutStorageKey,
} from "@/features/workbench/local-storage-workbench-layout-repository";
import {
  createDefaultWorkbenchLayout,
  validateWorkbenchLayout,
} from "@/features/workbench/workbench-layout";
import { getWorkbenchTemplate } from "@/features/workbench/workbench-templates";
import type { WorkbenchLayoutContext } from "@/features/workbench/types";
import type { TenantInfo } from "@/types/user";

const school: TenantInfo = {
  id: "school-layout",
  name: "布局测试学校",
  shortName: "测试学校",
  type: "school",
  enabled: true,
};
const template = getWorkbenchTemplate("school", "admin");

function context(
  tenantId = school.id,
  userId = "user-a",
): WorkbenchLayoutContext {
  return {
    tenant: { ...school, id: tenantId },
    userId,
    profile: "admin",
  };
}

describe("workbench layout repository", () => {
  beforeEach(() => localStorage.clear());

  it("returns the complete fixed template without creating an override", () => {
    const repository = new LocalStorageWorkbenchLayoutRepository(localStorage);
    const result = repository.list(context(), template);

    expect(result.hasOverride).toBe(false);
    expect(result.layout.items).toHaveLength(template.widgets.length);
    expect(result.layout.items.every((item) => item.visible)).toBe(true);
    expect(localStorage.getItem(workbenchLayoutStorageKey(context()))).toBeNull();
  });

  it("persists hidden widgets without deleting them and isolates tenant and user keys", () => {
    const repository = new LocalStorageWorkbenchLayoutRepository(localStorage);
    const firstContext = context();
    const layout = createDefaultWorkbenchLayout(firstContext, template);
    layout.items[0]!.visible = false;
    repository.replace(firstContext, template, layout);

    const loaded = repository.list(firstContext, template);
    expect(loaded.hasOverride).toBe(true);
    expect(loaded.layout.items).toHaveLength(template.widgets.length);
    expect(loaded.layout.items[0]!.visible).toBe(false);
    expect(repository.list(context(school.id, "user-b"), template).hasOverride).toBe(false);
    expect(repository.list(context("school-other"), template).hasOverride).toBe(false);

    loaded.layout.items[0]!.visible = true;
    expect(repository.list(firstContext, template).layout.items[0]!.visible).toBe(false);
  });

  it("adds a newly introduced template widget as visible at the bottom", () => {
    const repository = new LocalStorageWorkbenchLayoutRepository(localStorage);
    const activeContext = context();
    const oldLayout = createDefaultWorkbenchLayout(activeContext, template);
    const missing = oldLayout.items.pop()!;
    oldLayout.templateRevision = 0;
    localStorage.setItem(workbenchLayoutStorageKey(activeContext), JSON.stringify(oldLayout));

    const result = repository.list(activeContext, template);
    const appended = result.layout.items.find((item) => item.widgetKey === missing.widgetKey)!;
    const previousBottom = Math.max(...oldLayout.items.map((item) => item.y + item.h));

    expect(appended.visible).toBe(true);
    expect(appended.y).toBeGreaterThanOrEqual(previousBottom);
    expect(result.layout.templateRevision).toBe(template.revision);
    expect(validateWorkbenchLayout(result.layout, activeContext, template)).toBe(true);
  });

  it("backs up damaged data before returning the current default", () => {
    const activeContext = context();
    const repository = new LocalStorageWorkbenchLayoutRepository(localStorage, () => 1234);
    const key = workbenchLayoutStorageKey(activeContext);
    localStorage.setItem(key, "{damaged");

    const result = repository.list(activeContext, template);

    expect(result.recoveryNotice).toContain("已恢复");
    expect(result.hasOverride).toBe(false);
    expect(
      localStorage.getItem(
        `operation-platform:workbench-layout:invalid:${school.id}:user-a:admin:1234`,
      ),
    ).toBe("{damaged");
    expect(localStorage.getItem(key)).toBeNull();
  });

  it("does not recover when the damaged value cannot be backed up", () => {
    const activeContext = context();
    localStorage.setItem(workbenchLayoutStorageKey(activeContext), "{damaged");
    const storage = new Proxy(localStorage, {
      get(target, property) {
        if (property === "setItem") {
          return (key: string, value: string) => {
            if (key.includes(":invalid:")) throw new DOMException("backup failed");
            target.setItem(key, value);
          };
        }
        const value = Reflect.get(target, property);
        return typeof value === "function" ? value.bind(target) : value;
      },
    });
    const repository = new LocalStorageWorkbenchLayoutRepository(storage);

    expect(() => repository.list(activeContext, template)).toThrow(
      WorkbenchLayoutPersistenceError,
    );
    expect(localStorage.getItem(workbenchLayoutStorageKey(activeContext))).toBe("{damaged");
  });

  it("resets one override and removes every layout belonging to a deleted tenant", () => {
    const repository = new LocalStorageWorkbenchLayoutRepository(localStorage);
    const first = context();
    const second = context(school.id, "user-b");
    const other = context("school-other");
    repository.replace(first, template, createDefaultWorkbenchLayout(first, template));
    repository.replace(second, template, createDefaultWorkbenchLayout(second, template));
    repository.replace(other, template, createDefaultWorkbenchLayout(other, template));

    repository.reset(first, template);
    expect(localStorage.getItem(workbenchLayoutStorageKey(first))).toBeNull();

    repository.removeTenant(school.id);
    expect(localStorage.getItem(workbenchLayoutStorageKey(second))).toBeNull();
    expect(localStorage.getItem(workbenchLayoutStorageKey(other))).not.toBeNull();
  });

  it("rolls back all personal layouts when tenant cleanup fails", () => {
    const first = context();
    const second = context(school.id, "user-b");
    const setupRepository = new LocalStorageWorkbenchLayoutRepository(localStorage);
    setupRepository.replace(first, template, createDefaultWorkbenchLayout(first, template));
    setupRepository.replace(second, template, createDefaultWorkbenchLayout(second, template));
    const firstKey = workbenchLayoutStorageKey(first);
    const secondKey = workbenchLayoutStorageKey(second);
    const previous = new Map([
      [firstKey, localStorage.getItem(firstKey)],
      [secondKey, localStorage.getItem(secondKey)],
    ]);
    let failed = false;
    const storage = new Proxy(localStorage, {
      get(target, property) {
        if (property === "removeItem") {
          return (key: string) => {
            if (!failed && key === secondKey) {
              failed = true;
              throw new DOMException("remove failed");
            }
            target.removeItem(key);
          };
        }
        const value = Reflect.get(target, property);
        return typeof value === "function" ? value.bind(target) : value;
      },
    });
    const repository = new LocalStorageWorkbenchLayoutRepository(storage);

    expect(() => repository.removeTenant(school.id)).toThrow(
      WorkbenchLayoutPersistenceError,
    );
    for (const [key, value] of previous) {
      expect(localStorage.getItem(key)).toBe(value);
    }
  });
});
