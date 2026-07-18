import { createApp, watch } from "vue";
import { createPinia } from "pinia";
import "element-plus/es/components/message/style/css";
import "element-plus/es/components/message-box/style/css";
import App from "./App.vue";
import router from "./router";
import { useAuthStore } from "@/stores/auth";
import { useUserStore } from "@/stores/user";
import "./assets/main.css";

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
const authStore = useAuthStore(pinia);
const userStore = useUserStore(pinia);

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
