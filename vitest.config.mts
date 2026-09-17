import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// .mts is an ES module: no __dirname, so derive the project root from import.meta.url.
const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  // Mirror tsconfig "paths" so tests can import modules that use the "@/…" alias (e.g. src/lib/ai/adapter.ts).
  resolve: { alias: { "@": path.resolve(root, "src") } },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
