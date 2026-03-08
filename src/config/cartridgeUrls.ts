const DEFAULT_RPC_URL = "http://127.0.0.1:5050";
const DEFAULT_TORII_URL = "http://127.0.0.1:8080";
const DEFAULT_GRAPHQL_URL = "http://127.0.0.1:8080/graphql";

const CHAIN = import.meta.env.VITE_CHAIN?.trim() || "";

const CHAIN_RPC_URLS: Record<string, string> = {
  sepolia: "https://api.cartridge.gg/x/starknet/sepolia",
  mainnet: "https://api.cartridge.gg/x/starknet/mainnet",
};

const configuredSlotInstance =
  import.meta.env.VITE_SLOT_INSTANCE?.trim() || undefined;

const getBaseUrl = (slot: string | undefined) =>
  slot ? `https://api.cartridge.gg/x/${slot}` : undefined;

const getRpcUrl = (slot: string | undefined) => {
  const baseUrl = getBaseUrl(slot);
  if (baseUrl) return `${baseUrl}/katana`;
  if (CHAIN_RPC_URLS[CHAIN]) return CHAIN_RPC_URLS[CHAIN];
  return DEFAULT_RPC_URL;
};

const getToriiUrl = (slot: string | undefined) => {
  const envTorii = import.meta.env.VITE_TORII_URL?.trim();
  if (envTorii) return envTorii;
  const baseUrl = getBaseUrl(slot);
  return baseUrl ? `${baseUrl}/torii` : DEFAULT_TORII_URL;
};

const getGraphqlUrl = (slot: string | undefined) => {
  const envTorii = import.meta.env.VITE_TORII_URL?.trim();
  if (envTorii) return `${envTorii}/graphql`;
  const baseUrl = getBaseUrl(slot);
  return baseUrl ? `${baseUrl}/torii/graphql` : DEFAULT_GRAPHQL_URL;
};

export const slotInstance = configuredSlotInstance;
export const rpcUrl = getRpcUrl(slotInstance);
export const toriiUrl = getToriiUrl(slotInstance);
export const graphqlUrl = getGraphqlUrl(slotInstance);

console.info("[CONFIG] Endpoint configuration", {
  slotInstance: slotInstance ?? "local",
  rpcUrl,
  toriiUrl,
  graphqlUrl,
});
