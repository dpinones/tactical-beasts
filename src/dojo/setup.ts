import { DojoConfig, DojoProvider } from "@dojoengine/core";
import { initViewCalls } from "../services/viewCalls";
import { BurnerManager } from "@dojoengine/create-burner";
import * as torii from "@dojoengine/torii-client";
import { Account, ArraySignatureType, RpcProvider } from "starknet";
import { createClientComponents } from "./createClientComponents";
import { createSystemCalls } from "./createSystemCalls";
import { setupWorld } from "./typescript/contracts.gen";
import { defineContractComponents } from "./typescript/defineContractComponents";
import { world } from "./world";

import type { Message } from "@dojoengine/torii-client";

export type SetupResult = Awaited<ReturnType<typeof setup>>;

export async function setup({ ...config }: DojoConfig) {
  // torii client
  const toriiClient = await new torii.ToriiClient({
    toriiUrl: config.toriiUrl,
    worldAddress: config.manifest.world.address || "",
  });

  // create contract components
  const contractComponents = defineContractComponents(world);

  // create client components
  const clientComponents = createClientComponents({ contractComponents });

  // create dojo provider
  const dojoProvider = new DojoProvider(config.manifest, config.rpcUrl);

  // setup world
  const client = await setupWorld(dojoProvider);

  // initialize view call service
  const viewCalls = initViewCalls(dojoProvider);

  // create burner manager (only for local/slot, not for sepolia/mainnet)
  const chain = import.meta.env.VITE_CHAIN?.trim() || "";
  const useBurners = chain !== "sepolia" && chain !== "mainnet";

  let burnerManager: BurnerManager | undefined;

  if (useBurners) {
    burnerManager = new BurnerManager({
      masterAccount: new Account({
        provider: new RpcProvider({ nodeUrl: config.rpcUrl }),
        address: config.masterAddress,
        signer: config.masterPrivateKey,
      }),
      accountClassHash: import.meta.env.VITE_PUBLIC_ACCOUNT_CLASS_HASH || config.accountClassHash,
      rpcProvider: dojoProvider.provider as any,
      feeTokenAddress: import.meta.env.VITE_NETWORK_FEE_TOKEN || config.feeTokenAddress,
    });

    try {
      await burnerManager.init();
      if (burnerManager.list().length === 0) {
        try {
          await Promise.race([
            burnerManager.create(),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error("Burner creation timeout")), 10000)
            ),
          ]);
        } catch (createErr) {
          console.warn("Burner creation failed or timed out:", createErr);
        }
      }
    } catch (e) {
      console.error("Error initializing burnerManager:", e);
    }
  }

  return {
    client,
    clientComponents,
    contractComponents,
    systemCalls: createSystemCalls({ client }, clientComponents, world),
    publish: (typedData: string, signature: ArraySignatureType) => {
      const msj: Message = {
        message: typedData,
        signature,
        world_address: config.manifest.world.address || "",
      };
      toriiClient.publishMessage(msj);
    },
    config,
    dojoProvider,
    burnerManager,
    toriiClient,
    viewCalls,
  };
}
