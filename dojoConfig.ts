import { createDojoConfig } from "@dojoengine/core";
import { rpcUrl, toriiUrl } from "./src/config/cartridgeUrls";
import { getManifest } from "./src/dojo/getManifest";

const masterAddress =
  import.meta.env.VITE_MASTER_ADDRESS ||
  "0x127fd5f1fe78a71f8bcd1fec63e3fe2f0486b6ecd5c86a0466c3a21fa5cfcec";
const masterPrivateKey =
  import.meta.env.VITE_MASTER_PRIVATE_KEY ||
  "0xc5b2fcab997346f3ea1c00b002ecf6f382c5f9c9659a3894eb783c5320f912";

const manifest = getManifest();
const manifestAny = manifest as {
  abis?: unknown[];
  world?: { abi?: unknown[] };
};
const manifestWithAbis = Array.isArray(manifestAny.abis)
  ? manifest
  : { ...manifest, abis: manifestAny.world?.abi ?? [] };

export const dojoConfig = createDojoConfig({
  manifest: manifestWithAbis,
  rpcUrl,
  toriiUrl,
  masterAddress,
  masterPrivateKey,
});
