import { useCallback } from "react";
import { useDojo } from "../dojo/DojoContext";
import { useContractActions } from "./useContractActions";

export function useDenshokanActions() {
  const {
    setup: { client },
    account: { account },
  } = useDojo();
  const { execute, isLoading, error } = useContractActions();

  const createSettings = useCallback(
    async (
      name: string,
      description: string,
      minTier: number,
      maxTier: number,
      maxT2PerTeam: number,
      maxT3PerTeam: number,
      beastsPerPlayer: number
    ) => {
      const response = await execute(client.game_system.createSettings, [
        account,
        name,
        description,
        minTier,
        maxTier,
        maxT2PerTeam,
        maxT3PerTeam,
        beastsPerPlayer,
      ]);
      if (response) {
        const txHash = (response as any)?.transaction_hash;
        if (txHash) {
          try {
            await account.waitForTransaction(txHash, { retryInterval: 100 });
          } catch (e) {
            console.error("Failed to confirm createSettings:", e);
          }
        }
      }
      return response;
    },
    [client, account, execute]
  );

  const createGameWithSettings = useCallback(
    async (settingsId: number) => {
      const response = await execute(client.game_system.createGameWithSettings, [
        account,
        settingsId,
      ]);
      if (response) {
        const txHash = (response as any)?.transaction_hash;
        if (txHash) {
          try {
            await account.waitForTransaction(txHash, { retryInterval: 100 });
          } catch (e) {
            console.error("Failed to confirm createGameWithSettings:", e);
          }
        }
      }
      return response;
    },
    [client, account, execute]
  );

  return {
    createSettings,
    createGameWithSettings,
    isLoading,
    error,
  };
}
