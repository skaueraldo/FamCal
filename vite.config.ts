import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

function buildIdPlugin(): Plugin {
  let id = "dev";
  return {
    name: "famcal-build-id",
    config(_config, env) {
      id =
        env.command === "build"
          ? String(process.env.VERCEL_GIT_COMMIT_SHA || process.env.VERCEL_DEPLOYMENT_ID || Date.now().toString(36)).slice(0, 16)
          : "dev";
      return {
        define: {
          "import.meta.env.VITE_BUILD_ID": JSON.stringify(id),
        },
      };
    },
    configureServer(server) {
      server.middlewares.use("/version.json", (_req, res) => {
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Cache-Control", "no-store");
        res.end(JSON.stringify({ id: "dev" }));
      });
    },
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "version.json",
        source: JSON.stringify({ id }),
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), buildIdPlugin()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      "/api": "http://127.0.0.1:3847",
      "/ws": {
        target: "ws://127.0.0.1:3847",
        ws: true,
      },
    },
  },
});
