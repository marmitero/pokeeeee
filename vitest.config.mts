import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    // Unit tests rodam sem banco. Os de integração têm sufixo próprio e
    // entram em outro script, porque exigem Postgres de teste.
    include: ["src/**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/*.integration.test.ts"],
    globals: false,
  },
});
