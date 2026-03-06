import { useCallback } from "react";
import { useDojo } from "../dojo/DojoContext";
import { useContractActions } from "./useContractActions";
import { generateSalt, computeCommitment } from "../utils/commitment";
import { useGameStore } from "../stores/gameStore";

export function useGameActions() {
  const {
    setup: { client },
    account: { account },
  } = useDojo();
  const { execute, isLoading, error } = useContractActions();
  const { saveCommit, getCommit, clearCommit } = useGameStore();

  const createGame = useCallback(async (): Promise<number | null> => {
    const response = await execute(client.game_system.createGame, [account]);
    if (!response) return null;

    const txHash = (response as any)?.transaction_hash;
    if (txHash) {
      try {
        const receipt: any = await account.waitForTransaction(txHash, {
          retryInterval: 100,
        });
        // Extract game_id from GameCreated event
        const events = receipt?.events || [];
        for (const event of events) {
          // GameCreated event has game_id as first data element
          if (event.data && event.data.length >= 1) {
            const gameId = parseInt(event.data[0], 16);
            if (gameId > 0 && gameId < 100000) {
              return gameId;
            }
          }
        }
      } catch (e) {
        console.error("Failed to get receipt:", e);
      }
    }
    return null;
  }, [client, account, execute]);

  const joinGame = useCallback(
    async (gameId: number) => {
      const response = await execute(client.game_system.joinGame, [
        account,
        gameId,
      ]);
      if (response) {
        const txHash = (response as any)?.transaction_hash;
        if (txHash) {
          try {
            await account.waitForTransaction(txHash, { retryInterval: 100 });
          } catch (e) {
            console.error("Failed to confirm join:", e);
          }
        }
      }
      return response;
    },
    [client, account, execute]
  );

  const commitMove = useCallback(
    async (gameId: number, moveValue: number) => {
      const salt = generateSalt();
      const commitment = computeCommitment(moveValue, salt);

      const response = await execute(client.game_system.commitMove, [
        account,
        gameId,
        commitment,
      ]);

      if (response) {
        // Save salt to persist store (critical for reveal)
        saveCommit(gameId, account.address, moveValue, salt);

        const txHash = (response as any)?.transaction_hash;
        if (txHash) {
          try {
            await account.waitForTransaction(txHash, { retryInterval: 100 });
          } catch (e) {
            console.error("Failed to confirm commit:", e);
          }
        }
      }
      return response;
    },
    [client, account, execute, saveCommit]
  );

  const revealMove = useCallback(
    async (gameId: number) => {
      const pending = getCommit(gameId, account.address);
      if (!pending) {
        throw new Error(
          "No pending commit found. Cannot reveal without the original move and salt."
        );
      }

      const response = await execute(client.game_system.revealMove, [
        account,
        gameId,
        pending.moveValue,
        pending.salt,
      ]);

      if (response) {
        clearCommit(gameId, account.address);

        const txHash = (response as any)?.transaction_hash;
        if (txHash) {
          try {
            await account.waitForTransaction(txHash, { retryInterval: 100 });
          } catch (e) {
            console.error("Failed to confirm reveal:", e);
          }
        }
      }
      return response;
    },
    [client, account, execute, getCommit, clearCommit]
  );

  const claimTimeout = useCallback(
    async (gameId: number) => {
      const response = await execute(client.game_system.claimTimeout, [
        account,
        gameId,
      ]);
      if (response) {
        const txHash = (response as any)?.transaction_hash;
        if (txHash) {
          try {
            await account.waitForTransaction(txHash, { retryInterval: 100 });
          } catch (e) {
            console.error("Failed to confirm timeout claim:", e);
          }
        }
      }
      return response;
    },
    [client, account, execute]
  );

  return {
    createGame,
    joinGame,
    commitMove,
    revealMove,
    claimTimeout,
    isLoading,
    error,
  };
}
