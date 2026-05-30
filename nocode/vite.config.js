import { fileURLToPath, URL } from 'url';
import { defineConfig } from 'vite';
import { resolve } from 'path';
import { tmpdir } from 'os';
import { devLogger } from '@meituan-nocode/vite-plugin-dev-logger';
import {
  devHtmlTransformer,
  prodHtmlTransformer,
} from '@meituan-nocode/vite-plugin-nocode-html-transformer';
import react from '@vitejs/plugin-react';

const CHAT_VARIABLE = process.env.CHAT_VARIABLE || '';
const PUBLIC_PATH = process.env.PUBLIC_PATH || '';
const GITHUB_PAGES = process.env.GITHUB_PAGES === 'true';

const isProdEnv = process.env.NODE_ENV === 'production';
const publicPath = GITHUB_PAGES
  ? '/nocode-rec-sys/'
  : (isProdEnv && CHAT_VARIABLE)
    ? PUBLIC_PATH + '/' + CHAT_VARIABLE
    : PUBLIC_PATH + '/';
const outDir = GITHUB_PAGES
  ? 'dist'
  : (isProdEnv && CHAT_VARIABLE) ? 'build/' + CHAT_VARIABLE : 'build';

async function loadPlugins() {
  const plugins = [react()];
  
  if (!GITHUB_PAGES) {
    try {
      if (isProdEnv && CHAT_VARIABLE) {
        plugins.push(prodHtmlTransformer(CHAT_VARIABLE));
      } else if (!isProdEnv) {
        plugins.unshift(devLogger({
          dirname: resolve(tmpdir(), '.nocode-dev-logs'),
          maxFiles: '3d',
        }));
        plugins.push(devHtmlTransformer(CHAT_VARIABLE));
      }
    } catch (e) {
      // nocode plugins not available (e.g. GitHub Actions)
    }
  }

  if (process.env.NOCODE_COMPILER_PATH) {
    const { componentCompiler } = await import(process.env.NOCODE_COMPILER_PATH);
    plugins.push(componentCompiler());
  }
  return plugins;
}

// https://vitejs.dev/config/
export default defineConfig(async () => {
  const plugins = await loadPlugins();
  
  return {
    server: {
      host: '::',
      port: '5666',
      hmr: {
        overlay: false,
      },
    },
    plugins,
    base: publicPath,
    build: {
      outDir,
    },
    resolve: {
      alias: [
        {
          find: '@',
          replacement: fileURLToPath(new URL('./src', import.meta.url)),
        },
        {
          find: 'lib',
          replacement: resolve(__dirname, 'lib'),
        },
      ],
    },
  };
});
