import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In development the browser talks to http://localhost:5173/api/... and Vite forwards it to Spring Boot,
// so no CORS setup is needed while developing. Change VITE_PROXY_TARGET if your backend runs elsewhere.
const backend = process.env.VITE_PROXY_TARGET || 'http://localhost:8080';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: backend, changeOrigin: true },
    },
  },
});
