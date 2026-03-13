import { useCallback } from "react";
import { useDojo } from "../dojo/DojoContext";
import { useContractActions } from "./useContractActions";
import { GameAction } from "../domain/types";
import { waitForTx } from "../utils/waitForTx";
import { getViewCalls } from "../services/viewCalls";
import { toastError } from "../utils/toastError";
import { toast } from "sonner";

const SET_TEAM_MAX_RETRIES = 3;
const SET_TEAM_RETRY_DELAY = 2000;
const ZERO_ADDR = "0x" + "0".repeat(64);

/** Poll until the game has both players set (P2 != 0x0), or give up after maxWait ms. */
async function waitForPlayer2(gameId: number, maxWait = 6000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < maxWait) {
    try {
      const game = await getViewCalls().getGame(gameId);
      const p2 = game.player2?.replace("0x", "").padStart(64, "0");
      if (p2 && `0x${p2}` !== ZERO_ADDR) return true;
    } catch { /* ignore RPC hiccups */ }
    await new Promise((r) => setTimeout(r, SET_TEAM_RETRY_DELAY));
  }
  return false;
}

/** Wait for tx and return receipt, logging errors without throwing. */
async function confirmTx(account: any, txHash: string, label: string): Promise<any> {
  try {
    const receipt = await waitForTx(account, txHash);
    if (receipt && (receipt as any).execution_status === "REVERTED") {
      const reason = (receipt as any).revert_reason || "Transaction reverted";
      toastError(`${label} failed: ${reason}`);
      return null;
    }
    return receipt;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    toastError(`${label} failed: ${msg}`);
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
      await confirmTx(account, txHash, "createGame");
      const config = await getViewCalls().getGameConfig();
      const gameId = config.game_count;
      console.log("[TB] createGame gameId:", gameId);
      return gameId > 0 ? gameId : null;
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
      await confirmTx(account, txHash, "createFriendlyGame");
      const config = await getViewCalls().getGameConfig();
      const gameId = config.game_count;
      console.log("[TB] createFriendlyGame gameId:", gameId);
      return gameId > 0 ? gameId : null;
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
      // Pre-validate: wait until game has both players before sending tx
      const ready = await waitForPlayer2(gameId);
      if (!ready) {
        toastError("Game not ready: opponent hasn't joined yet");
        return null;
      }

      for (let attempt = 0; attempt < SET_TEAM_MAX_RETRIES; attempt++) {
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
          return response;
        }
        if (attempt < SET_TEAM_MAX_RETRIES - 1) {
          toast.info(`Retrying setTeam (${attempt + 2}/${SET_TEAM_MAX_RETRIES})...`);
          await new Promise((r) => setTimeout(r, SET_TEAM_RETRY_DELAY));
        }
      }
      return null;
    },
    [client, account, execute]
  );

  const setTeamDynamic = useCallback(
    async (gameId: number, beasts: number[]) => {
      const ready = await waitForPlayer2(gameId);
      if (!ready) {
        toastError("Game not ready: opponent hasn't joined yet");
        return null;
      }

      for (let attempt = 0; attempt < SET_TEAM_MAX_RETRIES; attempt++) {
        const response = await execute(client.game_system.setTeamDynamic, [
          account,
          gameId,
          beasts,
        ]);
        if (response) {
          const txHash = (response as any)?.transaction_hash;
          if (txHash) await confirmTx(account, txHash, "setTeamDynamic");
          return response;
        }
        if (attempt < SET_TEAM_MAX_RETRIES - 1) {
          toast.info(`Retrying setTeam (${attempt + 2}/${SET_TEAM_MAX_RETRIES})...`);
          await new Promise((r) => setTimeout(r, SET_TEAM_RETRY_DELAY));
        }
      }
      return null;
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
    // Check queue before tx — if someone is waiting, we'll join their game
    const queueBefore = await getViewCalls().getMatchmakingQueue();
    const joinGameId = queueBefore.waiting_game_id > 0 ? queueBefore.waiting_game_id : null;

    const response = await execute(client.game_system.findMatch, [account]);
    if (!response) return null;

    const txHash = (response as any)?.transaction_hash;
    if (txHash) {
      await confirmTx(account, txHash, "findMatch");

      if (joinGameId) {
        // We joined an existing game from the queue
        console.log("[TB] findMatch joined existing game:", joinGameId);
        return joinGameId;
      }

      // We created a new game — read queue to get our waiting_game_id
      const queueAfter = await getViewCalls().getMatchmakingQueue();
      if (queueAfter.waiting_game_id > 0) {
        console.log("[TB] findMatch created new game:", queueAfter.waiting_game_id);
        return queueAfter.waiting_game_id;
      }

      // Fallback: use game_count
      const config = await getViewCalls().getGameConfig();
      console.log("[TB] findMatch fallback gameId:", config.game_count);
      return config.game_count > 0 ? config.game_count : null;
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
