import { beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import router from "@/router";
import { useNavigationStore } from "@/stores/navigation";
import { useUserStore } from "@/stores/user";

describe("platform route guard", () => {
  beforeEach(async () => {
    localStorage.clear();
    setActivePinia(createPinia());
    await router.push("/");
    await router.isReady();
  });

  it("switches admins to the operation platform tenant when opening platform system pages directly", async () => {
    const userStore = useUserStore();
    const navigationStore = useNavigationStore();

    expect(userStore.currentTenant.type).not.toBe("platform");

    await router.push("/system/organization");

    expect(userStore.currentTenant.type).toBe("platform");
    expect(navigationStore.currentTenant?.type).toBe("platform");
    expect(router.currentRoute.value.path).toBe("/system/organization");
  });

  it("restores the authorized bureau context for a standalone page", async () => {
    const userStore = useUserStore();
    const navigationStore = useNavigationStore();

    await router.push({
      path: "/bureau/visualization/regional-education-overview",
      query: { tenantId: "bureau-001" },
    });

    expect(userStore.currentTenant.id).toBe("bureau-001");
    expect(navigationStore.currentTenant?.id).toBe("bureau-001");
    expect(router.currentRoute.value.name).toBe("bureau-regional-education-overview");
    expect(router.currentRoute.value.meta.pageSurface).toBe("standalone");
  });

  it("restores the bureau context for the standalone smart sports cockpit", async () => {
    const userStore = useUserStore();

    await router.push({
      path: "/bureau/ai-precision-teaching/smart-sports/cockpit",
      query: { tenantId: "bureau-001" },
    });

    expect(userStore.currentTenant.id).toBe("bureau-001");
    expect(router.currentRoute.value.name).toBe("bureau-smart-sports-cockpit");
    expect(router.currentRoute.value.meta.pageSurface).toBe("standalone");
  });

  it("rejects a standalone page without explicit tenant context", async () => {
    await router.push("/bureau/visualization/regional-education-overview");

    expect(router.currentRoute.value.name).toBe("menu-unavailable");
  });
});
