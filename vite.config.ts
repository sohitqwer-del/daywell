import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  optimizeDeps: { entries: ["index.html"] },
  server: {
    watch: {
      ignored: ["**/android/**", "**/artifacts/**", "**/test-results/**"],
    },
  },
  build: { target: "es2020" },
});
