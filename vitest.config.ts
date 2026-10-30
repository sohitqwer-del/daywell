import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    pool: "threads",
    maxWorkers: 1,
    fileParallelism: false,
    include: ["tests/*.test.ts", "tests/*.test.tsx"],
    exclude: ["artifacts/**", "node_modules/**"],
  },
});
