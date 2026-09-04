import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "wxt";

export default defineConfig({
  vite: () => ({ plugins: [tailwindcss()] }),
  manifest: {
    name: "Tamanduá QA",
    description: "Revisión manual asistida por Tamanduá",
    permissions: ["sidePanel", "activeTab", "tabs", "storage", "downloads"],
    host_permissions: ["http://127.0.0.1:4317/*"],
    action: {},
    browser_specific_settings: {
      gecko: {
        id: "tamandua@local",
        data_collection_permissions: { required: ["none"] },
      },
    },
  },
});
