import { readdirSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

const root = import.meta.dirname;
const projectInputs = Object.fromEntries(
  readdirSync(resolve(root, "projects"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => [
      `projects/${entry.name}`,
      resolve(root, "projects", entry.name, "index.html"),
    ]),
);

export default defineConfig({
  base: "/",
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      input: {
        index: resolve(root, "index.html"),
        ...projectInputs,
      },
    },
  },
  server: {
    host: "127.0.0.1",
    port: 5173,
  },
  preview: {
    host: "127.0.0.1",
    port: 4173,
  },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts"],
  },
});
