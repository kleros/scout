import { defineConfig } from "vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import svgr from "vite-plugin-svgr";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  root: "src",
  define: {
    global: 'globalThis',
  },
  server: {
    proxy: {
      '/api/dapplooker/public': {
        target: 'https://analytics.dapplooker.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/dapplooker\/public/, ''),
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      },
      '/api/dapplooker': {
        target: 'https://api.dapplooker.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/dapplooker/, ''),
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      },
      '/api/thegraph': {
        target: 'https://api.studio.thegraph.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/thegraph/, ''),
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      },
    },
  },
  build: {
    outDir: "../dist",
    rollupOptions: {
      onwarn: (warning, warn) => {
        if (warning.code === "MODULE_LEVEL_DIRECTIVE") {
          return;
        }
        warn(warning);
      },
    },
  },
  envPrefix: ["REACT_APP", "ALCHEMY", "WALLETCONNECT_PROJECT_ID"],
  plugins: [
    svgr({
      include: ["**/*.svg", "tsx:**/*.svg"],
      exclude: ["../node_modules/**/*"],
    }),
    tsconfigPaths({
      ignoreConfigErrors: true,
    }),
    nodePolyfills({
      include: ["fs", "stream", "process"],
      globals: {
        process: true,
        Buffer: true,
      },
    }),
  ],
});