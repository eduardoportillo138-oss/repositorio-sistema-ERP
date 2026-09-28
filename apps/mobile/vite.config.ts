import { defineConfig } from 'vite';
import path from 'node:path';
export default defineConfig({
  optimizeDeps: { exclude: ['react-native-safe-area-context'] },
  resolve: {
    alias: [{ find: /^react-native$/, replacement: 'react-native-web' }],
    extensions: [
      '.web.mjs',
      '.mjs',
      '.web.js',
      '.js',
      '.web.ts',
      '.ts',
      '.web.tsx',
      '.tsx',
      '.json',
    ],
    dedupe: ['react', 'react-dom', 'react-native-web'],
  },
  server: {
    fs: { allow: [path.resolve(__dirname, '../..')] },
    proxy: { '/api': process.env.ERP_API_TARGET || 'http://127.0.0.1:3000' },
  },
  build: { outDir: 'dist' },
});
