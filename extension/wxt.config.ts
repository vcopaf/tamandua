import { defineConfig } from "wxt";

export default defineConfig({
  manifest: {
    name: "Tamanduá QA",
    description: "Revisión manual asistida por Tamanduá",
    permissions: ["sidePanel", "activeTab", "tabs", "storage"],
    host_permissions: ["http://127.0.0.1:4317/*"],
    action: {},
  },
});
