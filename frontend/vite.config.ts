import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Stellar wallet packages depend on Node.js globals in the browser
  define: {
    global: 'globalThis',
  },
})
