import { fileURLToPath, URL } from "node:url";

import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import AutoImport from "unplugin-auto-import/vite";
import Components from "unplugin-vue-components/vite";
import { ElementPlusResolver } from "unplugin-vue-components/resolvers";

const eagerlyLoadedLucideIcons = new Set([
  "activity.mjs",
  "bell.mjs",
  "book-open.mjs",
  "briefcase-business.mjs",
  "building-2.mjs",
  "calendar.mjs",
  "chart-column.mjs",
  "chart-no-axes-combined.mjs",
  "circle-dollar-sign.mjs",
  "clipboard-list.mjs",
  "coins.mjs",
  "contact.mjs",
  "database.mjs",
  "file-text.mjs",
  "folder.mjs",
  "graduation-cap.mjs",
  "house.mjs",
  "images.mjs",
  "landmark.mjs",
  "layout-grid.mjs",
  "list.mjs",
  "lock.mjs",
  "menu.mjs",
  "message-square-text.mjs",
  "notebook-tabs.mjs",
  "school.mjs",
  "settings.mjs",
  "shield.mjs",
  "user.mjs",
  "users.mjs",
  "vote.mjs",
]);

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    AutoImport({
      dts: false,
      resolvers: [ElementPlusResolver()],
    }),
    Components({
      dts: false,
      resolvers: [ElementPlusResolver()],
    }),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          const marker = "/node_modules/@lucide/vue/dist/esm/icons/";
          if (!id.includes(marker)) return;
          const filename = id.slice(id.lastIndexOf("/") + 1);
          if (eagerlyLoadedLucideIcons.has(filename)) return;
          const group = /^[a-z]/i.exec(filename)?.[0].toLowerCase() ?? "other";
          return `lucide-icons-${group}`;
        },
      },
    },
  },
});
