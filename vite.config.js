import { defineConfig } from 'vite';
import { demoAppBuildConfig } from './demo_app/vite.config.js';
import { frameworkBuildConfigForMode } from './framework/vite.config.js';
import docsBuildConfig from './vitepress/vite.config.js';

export default defineConfig(({ mode }) => {
  if (mode === 'app') return demoAppBuildConfig();
  if (mode === 'docs') return docsBuildConfig;
  if (mode === 'framework' || mode === 'compiler' || mode.startsWith('addon-')) return frameworkBuildConfigForMode(mode);
  throw new Error(`Unknown Nodula root build mode: ${mode}. Use app, docs, framework, compiler, or addon-<name>.`);
});