import { createApp, watch } from "vue";
import { createPinia } from "pinia";
import "element-plus/es/components/message/style/css";
import "element-plus/es/components/message-box/style/css";
import App from "./App.vue";
import router from "./router";
import { resolveDocumentTitle } from "@/router/document-title";
import { useAuthStore } from "@/stores/auth";
import { useNavigationStore } from "@/stores/navigation";
import { useUserStore } from "@/stores/user";
import "./assets/main.css";

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
const authStore = useAuthStore(pinia);
const userStore = useUserStore(pinia);
const navigationStore = useNavigationStore(pinia);

watch(
  () => {
    const route = router.currentRoute.value;
    const routeTitle = typeof route.meta.title === "string" ? route.meta.title : "";
    const navigationTitle = route.name === "workbench"
      ? navigationStore.workbenchConfig.label
      : navigationStore.currentPath === route.path
        ? navigationStore.activeMenuNode?.name
        : "";
    return {
      authInitialized: authStore.initialized,
      authenticated: authStore.isAuthenticated,
      routeTitle,
      navigationTitle,
      tenantName: userStore.currentTenant.name,
    };
  },
  (context) => {
    document.title = resolveDocumentTitle(context);
  },
  { immediate: true },
);

function initializeSignedInUser() {
  const identity = authStore.session?.user ?? null;
  if (!identity) return;
  void userStore.initializePersistence(identity).catch(() => {
    // The user store exposes the bootstrap error for the mounted app shell.
  });
}

void authStore.initialize().then(initializeSignedInUser);
watch(
  () => authStore.authStateVersion,
  () => {
    const identity = authStore.session?.user ?? null;
    if (!identity) {
      userStore.resetPersistence();
      return;
    }
    void userStore.initializePersistence(identity, true).catch(() => {
      // The user store exposes the bootstrap error for the mounted app shell.
    });
  },
  { flush: "post" },
);
app.use(router);
app.mount("#app");
