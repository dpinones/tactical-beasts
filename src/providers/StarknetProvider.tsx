"use client";
import { Chain, mainnet, sepolia } from "@starknet-react/chains";
import {
  Connector,
  StarknetConfig,
  jsonRpcProvider,
  cartridge,
} from "@starknet-react/core";
import React from "react";
import { num } from "starknet";
import { rpcUrl, slotInstance } from "../config/cartridgeUrls";
import { controller, getSlotChainId, isControllerAvailable } from "../dojo/controller/controller";

const CHAIN = import.meta.env.VITE_CHAIN?.trim() || "";

const provider = jsonRpcProvider({
  rpc: (chain) => {
    switch (chain) {
      case mainnet:
        return { nodeUrl: "https://api.cartridge.gg/x/starknet/mainnet" };
      case sepolia:
        return { nodeUrl: "https://api.cartridge.gg/x/starknet/sepolia" };
      default:
        return { nodeUrl: rpcUrl };
    }
  },
});

const slot: Chain = slotInstance
  ? {
      id: num.toBigInt(getSlotChainId(slotInstance)),
      name: "Dojo Slot",
      network: "dojo-slot",
      rpcUrls: {
        default: { http: [rpcUrl] },
        public: { http: [rpcUrl] },
      },
      nativeCurrency: {
        name: "Starknet",
        symbol: "STRK",
        decimals: 18,
        address:
          "0x04718f5a0Fc34cC1AF16A1cdee98fFB20C31f5cD61D6Ab07201858f4287c938D",
      },
      paymasterRpcUrls: {
        avnu: { http: ["http://localhost:5050"] },
      },
    }
  : (null as unknown as Chain);

export function StarknetProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <StarknetConfig
      defaultChainId={CHAIN === "mainnet" ? mainnet.id : sepolia.id}
      chains={slotInstance ? [slot, mainnet, sepolia] : [mainnet, sepolia]}
      provider={provider}
      connectors={isControllerAvailable && controller ? [controller as unknown as Connector] : []}
      explorer={cartridge}
      autoConnect={true}
    >
      {children}
    </StarknetConfig>
  );
}
