import { useCallback } from "react";
import { useDojo } from "../dojo/DojoContext";
import { useContractActions } from "./useContractActions";
import { GameAction } from "../domain/types";
import { waitForTx } from "../utils/waitForTx";

const EVENT_EMITTED = "0x1c93f6e4703ae90f75338f29bffbe9c1662200cee981f49afeec26e892debcd";

/** Extract gameId from tx receipt events. */
function parseGameIdFromReceipt(receipt: any): number | null {
  const events = receipt?.events || [];
  for (const event of events) {
    if (event.keys?.[0] === EVENT_EMITTED && event.data && event.data.length >= 2) {
      const gameId = parseInt(event.data[1], 16);
      if (gameId > 0 && gameId < 100000) {
        return gameId;
      }
    }
  }
  return null;
}

/** Wait for tx and return receipt, logging errors without throwing. */
async function confirmTx(account: any, txHash: string, label: string): Promise<any> {
  try {
    return await waitForTx(account, txHash);
  } catch (e) {
    console.error(`Failed to confirm ${label}:`, e);
    return null;
  }
}

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
      const receipt = await confirmTx(account, txHash, "createGame");
      if (receipt) {
        const gameId = parseGameIdFromReceipt(receipt);
        console.log("[TB] parsed gameId:", gameId);
        if (!gameId) console.warn("[TB] no gameId found in events");
        return gameId;
      }
    }
    return null;
  }, [client, account, execute]);

  const createFriendlyGame = useCallback(async (settingsId?: number): Promise<number | null> => {
    const useSettings = settingsId && settingsId > 0;
    const response = useSettings
      ? await execute(client.game_system.createFriendlyGameWithSettings, [account, settingsId])
      : await execute(client.game_system.createFriendlyGame, [account]);
    if (!response) return null;

    const txHash = (response as any)?.transaction_hash;
    if (txHash) {
      const receipt = await confirmTx(account, txHash, "createFriendlyGame");
      if (receipt) {
        const gameId = parseGameIdFromReceipt(receipt);
        console.log("[TB] parsed friendly gameId:", gameId);
        if (!gameId) console.warn("[TB] no gameId found in events (friendly)");
        return gameId;
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
        if (txHash) await confirmTx(account, txHash, "joinGame");
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
        if (txHash) await confirmTx(account, txHash, "setTeam");
      }
      return response;
    },
    [client, account, execute]
  );

  const setTeamDynamic = useCallback(
    async (gameId: number, beasts: number[]) => {
      const response = await execute(client.game_system.setTeamDynamic, [
        account,
        gameId,
        beasts,
      ]);
      if (response) {
        const txHash = (response as any)?.transaction_hash;
        if (txHash) await confirmTx(account, txHash, "setTeamDynamic");
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
        if (txHash) await confirmTx(account, txHash, "executeTurn");
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
      const receipt = await confirmTx(account, txHash, "findMatch");
      if (receipt) {
        const gameId = parseGameIdFromReceipt(receipt);
        console.log("[TB] findMatch parsed gameId:", gameId);
        if (!gameId) console.warn("[TB] findMatch: no gameId found in events");
        return gameId;
      }
    }
    return null;
  }, [client, account, execute]);

  const cancelMatchmaking = useCallback(async () => {
    const response = await execute(client.game_system.cancelMatchmaking, [account]);
    if (response) {
      const txHash = (response as any)?.transaction_hash;
      if (txHash) await confirmTx(account, txHash, "cancelMatchmaking");
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
        if (txHash) await confirmTx(account, txHash, "abandonGame");
      }
      return response;
    },
    [client, account, execute]
  );

  return {
    createGame,
    createFriendlyGame,
    joinGame,
    setTeam,
    setTeamDynamic,
    executeTurn,
    findMatch,
    cancelMatchmaking,
    abandonGame,
    isLoading,
    error,
  };
}
