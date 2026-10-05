import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";
import { readFileSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";

const RENDERER_ROOT_DIR = fileURLToPath(new URL("./", import.meta.url));

const ROOT_SRC_DIR = fileURLToPath(
  new URL("../../src", import.meta.url)
);

const packageJson = JSON.parse(
  readFileSync(new URL("../../package.json", import.meta.url), "utf8")
) as { version?: string };

export default defineConfig({
  root: RENDERER_ROOT_DIR,
  base: "./",
  define: {
    __POMODOROZ_APP_VERSION__: JSON.stringify(
      packageJson.version ?? ""
    ),
  },
  plugins: [
    react(),
    svgr({
      include: "**/*.svg",
      svgrOptions: {
        exportType: "named",
        namedExport: "ReactComponent",
      },
    }),
  ],
  server: {
    host: "localhost",
    port: 3000,
    strictPort: true,
  },
  resolve: {
    alias: {
      assets: `${ROOT_SRC_DIR}/assets`,
      components: `${ROOT_SRC_DIR}/components`,
      config: `${ROOT_SRC_DIR}/config.ts`,
      contexts: `${ROOT_SRC_DIR}/contexts`,
      hooks: `${ROOT_SRC_DIR}/hooks`,
      i18n: `${ROOT_SRC_DIR}/i18n`,
      ipc: `${ROOT_SRC_DIR}/ipc`,
      routes: `${ROOT_SRC_DIR}/routes`,
      services: `${ROOT_SRC_DIR}/services`,
      store: `${ROOT_SRC_DIR}/store`,
      styles: `${ROOT_SRC_DIR}/styles`,
      utils: `${ROOT_SRC_DIR}/utils`,
    },
  },
  build: {
    outDir: "build",
    emptyOutDir: true,
    rolldownOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            return;
          }

          if (id.includes("@dnd-kit")) {
            return "vendor-dnd";
          }

          if (id.includes("i18next") || id.includes("react-i18next")) {
            return "vendor-i18n";
          }

          if (
            id.includes("@reduxjs") ||
            id.includes("react-redux") ||
            id.includes("/redux")
          ) {
            return "vendor-state";
          }

          if (id.includes("react-router")) {
            return "vendor-router";
          }

          if (id.includes("styled-components")) {
            return "vendor-styled";
          }

          if (id.includes("react-markdown")) {
            return "vendor-markdown";
          }

          if (id.includes("react-dom") || id.includes("/react/")) {
            return "vendor-react";
          }

          return "vendor";
        },
      },
    },
  },
});
