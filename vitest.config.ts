import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["**/*.{test,spec}.{ts,tsx}"],
    // e2e/ is Playwright (MIYO-0686), run with `pnpm test:e2e`.
    exclude: ["**/node_modules/**", "**/.next/**", "**/dist/**", "e2e/**", ".claude/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["lib/**/*.ts", "server/**/*.ts"],
      exclude: ["**/*.d.ts", "**/*.test.ts", "**/index.ts"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      "server-only": path.resolve(__dirname, "test/server-only-stub.ts"),
    },
  },
});
