import { createApp } from "vue";
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
await authStore.initialize();
await useUserStore(pinia).initializePersistence(authStore.session?.user ?? null);
app.use(router);
app.mount("#app");
