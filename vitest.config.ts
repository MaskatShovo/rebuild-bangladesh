import { defineConfig } from "vitest/config";
import { config } from "dotenv";
import path from "node:path";
config({ quiet: true });
const url = new URL(process.env.DATABASE_URL!);
url.pathname = "/rebuild_test";
export default defineConfig({
  resolve: { alias: { "@": path.resolve("src") } },
  test: {
    include: ["tests/**/*.test.ts"],
    fileParallelism: false,
    env: {
      DATABASE_URL: url.href,
      NODE_ENV: "test",
      PAYMENT_SIMULATOR: "true",
    },
    testTimeout: 20000,
    hookTimeout: 60000,
  },
});
