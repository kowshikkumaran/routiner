import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import electron from "vite-plugin-electron";

const removePlatformOptionPlugin = {
  name: 'remove-platform-option',
  config(config: any) {
    if (config.build?.rollupOptions) {
      delete config.build.rollupOptions.platform;
    }
  }
};

export default defineConfig({
  plugins: [
    react(),
    electron([
      {
        entry: "electron/main.ts",
        vite: {
          plugins: [removePlatformOptionPlugin],
          build: {
            rollupOptions: {
              external: ["better-sqlite3"],
            },
          },
        },
      },
      {
        entry: "electron/preload.ts",
        onstart(options) {
          options.reload();
        },
        vite: {
          plugins: [removePlatformOptionPlugin],
        },
      },
    ]),
  ],
  clearScreen: false,
});
