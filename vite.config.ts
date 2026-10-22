import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // relative asset paths so dist/ can be hosted from any folder
  build: { target: 'es2022' },
});
