import path from 'path';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
    plugins: [react(), tailwindcss()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    server: {
        port: 3000,
        host: true,
        proxy: {
            '/api': { target: 'http://localhost:5000', changeOrigin: true },
        },
    },
    test: {
        environment: 'jsdom',
        setupFiles: './src/__tests__/setup.ts',
        globals: true,
    },
});
