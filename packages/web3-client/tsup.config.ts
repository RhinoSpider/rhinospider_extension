import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  external: ['react'],
  env: {
    VITE_II_URL: process.env.VITE_II_URL || '',
    VITE_STORAGE_CANISTER_ID: process.env.VITE_STORAGE_CANISTER_ID || '',
    VITE_ADMIN_CANISTER_ID: process.env.VITE_ADMIN_CANISTER_ID || '',
    VITE_AUTH_CANISTER_ID: process.env.VITE_AUTH_CANISTER_ID || '',
  },
  define: {
    'import.meta.env': 'process.env',
  },
});
