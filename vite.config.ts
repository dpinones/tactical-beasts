import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import topLevelAwait from "vite-plugin-top-level-await";
import wasm from "vite-plugin-wasm";
import fs from "fs";
import { resolve } from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const chain = env.VITE_CHAIN?.trim() || "";
  const isLocal = !chain || chain === "";

  // HTTPS with mkcert certs for sepolia/mainnet (WebAuthn requires trusted HTTPS)
  let httpsConfig: any = false;
  if (!isLocal) {
    const keyPath = resolve(__dirname, "localhost-key.pem");
    const certPath = resolve(__dirname, "localhost.pem");
    if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
      httpsConfig = {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath),
      };
    }
  }

  return {
    base: "./",
    plugins: [react(), wasm(), topLevelAwait()],
    server: {
      https: httpsConfig,
    },
  };
});
