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
});
