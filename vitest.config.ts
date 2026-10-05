import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      assets: path.resolve(__dirname, "src/assets"),
      components: path.resolve(__dirname, "src/components"),
      config: path.resolve(__dirname, "src/config.ts"),
      contexts: path.resolve(__dirname, "src/contexts"),
      hooks: path.resolve(__dirname, "src/hooks"),
      i18n: path.resolve(__dirname, "src/i18n"),
      ipc: path.resolve(__dirname, "src/ipc"),
      routes: path.resolve(__dirname, "src/routes"),
      services: path.resolve(__dirname, "src/services"),
      store: path.resolve(__dirname, "src/store"),
      styles: path.resolve(__dirname, "src/styles"),
      utils: path.resolve(__dirname, "src/utils"),
    },
  },
  test: {
    environment: "node",
  },
});
