import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@personal-accounting/shared": path.resolve(__dirname, "../../packages/shared/src"),
      "@personal-accounting/business-logic": path.resolve(__dirname, "../../packages/business-logic/src"),
    },
  },
  server: {
    host: '0.0.0.0',
    allowedHosts: true
  },
  optimizeDeps: {
    include: ['dayjs', 'dayjs/locale/zh-cn']
  }
})
