import { defineConfig } from 'vite';
import { nodulaPlugin } from 'nodula-framework/vite';

export default defineConfig({
  plugins: [nodulaPlugin()],
});