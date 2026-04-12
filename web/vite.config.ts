import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [react()],
  root: 'examples',
  resolve: {
    alias: {
      '@kailash/prism-web': resolve(__dirname, 'src/index.ts'),
    },
  },
});
