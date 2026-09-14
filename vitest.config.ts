import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts", "app/**/*.test.ts", "app/**/__tests__/**/*.test.ts"],
    env: {
      // Aíslan los tests de la base real: desactivan Turso/.env.local y usan
      // una SQLite temporal. SESSION_SECRET fija para los tests de sesión.
      TURSO_DATABASE_URLL: "",
      TURSO_AUTH_TOKENN: "",
      SESSION_SECRET: "test-secret-para-tests-0123456789abcdef",
      LOCAL_DB_FILE: ":memory:",
    },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
});