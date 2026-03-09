export const config = {
  port: parseInt(process.env.PORT || "3001"),
  starknetRpcUrl: process.env.STARKNET_RPC_URL || "https://api.cartridge.gg/x/starknet/sepolia",
  toriiGraphqlUrl: process.env.TORII_GRAPHQL_URL || "https://api.cartridge.gg/x/tb-sepolia/torii/graphql",
  worldAddress: process.env.WORLD_ADDRESS || "0x34d794cf516c97e2db7d9e13600e2636a59489bdb8ebb4fb3d962bd55126e6",
  dojoNamespace: process.env.DOJO_NAMESPACE || "TB5",
  actionDelayMs: parseInt(process.env.ACTION_DELAY_MS || "3000"),
  pollIntervalMs: parseInt(process.env.POLL_INTERVAL_MS || "2000"),
  botWallets: JSON.parse(process.env.BOT_WALLETS || "[]") as Array<{ address: string; privateKey: string }>,
};
