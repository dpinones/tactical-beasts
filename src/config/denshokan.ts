import type { DenshokanClientConfig } from "@provable-games/denshokan-sdk";
import { getManifest } from "../dojo/getManifest";
import { DOJO_NAMESPACE } from "./namespace";

const CHAIN = import.meta.env.VITE_CHAIN?.trim() || "";

export const DENSHOKAN_ADDRESSES = {
  sepolia: {
    denshokanAddress: "0x0142712722e62a38f9c40fcc904610e1a14c70125876ecaaf25d803556734467",
    registryAddress: "0x040f1ed9880611bb7273bf51fd67123ebbba04c282036e2f81314061f6f9b1a1",
    viewerAddress: "0x025d92f18c6c1ed2114774adf68249a95fc468d9381ab33fa4b9ccfff7cf5f9f",
  },
  mainnet: {
    denshokanAddress: "",
    registryAddress: "",
    viewerAddress: "",
  },
} as const;

type SupportedChain = "sepolia" | "mainnet";

function getChain(): SupportedChain {
  if (CHAIN === "mainnet" || CHAIN === "sepolia") return CHAIN;
  return "sepolia"; // default to sepolia for local/slot dev
}

/** Extract game_system contract address from the active manifest */
function getGameAddress(): string {
  const manifest = getManifest();
  const tag = `${DOJO_NAMESPACE}-game_system`;
  const contract = manifest?.contracts?.find((c: any) => c.tag === tag);
  return contract?.address || "";
}

const chain = getChain();
const addresses = DENSHOKAN_ADDRESSES[chain];

export const denshokanConfig: DenshokanClientConfig = {
  chain,
  denshokanAddress: addresses.denshokanAddress,
  registryAddress: addresses.registryAddress,
  viewerAddress: addresses.viewerAddress,
};

/** The game_system contract address for Tactical Beasts, resolved from manifest */
export const gameAddress = getGameAddress();
