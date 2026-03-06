import { useCallback } from "react";
import { useDojo } from "../dojo/DojoContext";
import { useContractActions } from "./useContractActions";
import { GameAction } from "../domain/types";

const EVENT_EMITTED = "0x1c93f6e4703ae90f75338f29bffbe9c1662200cee981f49afeec26e892debcd";

export function useGameActions() {
  const {
    setup: { client },
    account: { account },
  } = useDojo();
  const { execute, isLoading, error } = useContractActions();

  const createGame = useCallback(async (): Promise<number | null> => {
    const response = await execute(client.game_system.createGame, [account]);
    if (!response) return null;

    const txHash = (response as any)?.transaction_hash;
    if (txHash) {
      try {
        const receipt: any = await account.waitForTransaction(txHash, {
          retryInterval: 100,
        });
        const events = receipt?.events || [];
        for (const event of events) {
          if (event.keys?.[0] === EVENT_EMITTED && event.data && event.data.length >= 2) {
            const gameId = parseInt(event.data[1], 16);
            console.log("[TB] parsed gameId:", gameId);
            if (gameId > 0 && gameId < 100000) {
              return gameId;
            }
          }
        }
        console.warn("[TB] no gameId found in events");
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

  const setTeam = useCallback(
    async (gameId: number, beast1: number, beast2: number, beast3: number) => {
      const response = await execute(client.game_system.setTeam, [
        account,
        gameId,
        beast1,
        beast2,
        beast3,
      ]);
      if (response) {
        const txHash = (response as any)?.transaction_hash;
        if (txHash) {
          try {
            await account.waitForTransaction(txHash, { retryInterval: 100 });
          } catch (e) {
            console.error("Failed to confirm set_team:", e);
          }
        }
      }
      return response;
    },
    [client, account, execute]
  );

  const executeTurn = useCallback(
    async (gameId: number, actions: GameAction[]) => {
      const contractActions = actions.map((a) => ({
        beast_index: a.beastIndex,
        action_type: a.actionType,
        target_index: a.targetIndex,
        target_row: a.targetRow,
        target_col: a.targetCol,
      }));
      const response = await execute(client.game_system.executeTurn, [
        account,
        gameId,
        contractActions,
      ]);
      if (response) {
        const txHash = (response as any)?.transaction_hash;
        if (txHash) {
          try {
            await account.waitForTransaction(txHash, { retryInterval: 100 });
          } catch (e) {
            console.error("Failed to confirm execute_turn:", e);
          }
        }
      }
      return response;
    },
    [client, account, execute]
  );

  const findMatch = useCallback(async (): Promise<number | null> => {
    const response = await execute(client.game_system.findMatch, [account]);
    if (!response) return null;

    const txHash = (response as any)?.transaction_hash;
    if (txHash) {
      try {
        const receipt: any = await account.waitForTransaction(txHash, {
          retryInterval: 100,
        });
        const events = receipt?.events || [];
        for (const event of events) {
          if (event.keys?.[0] === EVENT_EMITTED && event.data && event.data.length >= 2) {
            const gameId = parseInt(event.data[1], 16);
            console.log("[TB] findMatch parsed gameId:", gameId);
            if (gameId > 0 && gameId < 100000) {
              return gameId;
            }
          }
        }
        console.warn("[TB] findMatch: no gameId found in events");
      } catch (e) {
        console.error("Failed to get findMatch receipt:", e);
      }
    }
    return null;
  }, [client, account, execute]);

  const cancelMatchmaking = useCallback(async () => {
    const response = await execute(client.game_system.cancelMatchmaking, [account]);
    if (response) {
      const txHash = (response as any)?.transaction_hash;
      if (txHash) {
        try {
          await account.waitForTransaction(txHash, { retryInterval: 100 });
        } catch (e) {
          console.error("Failed to confirm cancelMatchmaking:", e);
        }
      }
    }
    return response;
  }, [client, account, execute]);

  const abandonGame = useCallback(
    async (gameId: number) => {
      const response = await execute(client.game_system.abandonGame, [
        account,
        gameId,
      ]);
      if (response) {
        const txHash = (response as any)?.transaction_hash;
        if (txHash) {
          try {
            await account.waitForTransaction(txHash, { retryInterval: 100 });
          } catch (e) {
            console.error("Failed to confirm abandonGame:", e);
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
    setTeam,
    executeTurn,
    findMatch,
    cancelMatchmaking,
    abandonGame,
    isLoading,
    error,
  };
}
