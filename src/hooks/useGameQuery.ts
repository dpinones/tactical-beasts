import { useState, useEffect, useCallback } from "react";
import graphQLClient from "../graphQLClient";
import { GET_GAME, GET_OPEN_GAMES, GET_PLAYER_COMMIT } from "../queries/gameQueries";
import type { Game, PlayerCommit } from "../dojo/typescript/models.gen";

const DOJO_NAMESPACE = (import.meta.env.VITE_DOJO_NAMESPACE || "RPS").toLowerCase();

function parseGameNode(node: any): Game {
  return {
    game_id: Number(node.game_id),
    player1: node.player1,
    player2: node.player2,
    status: Number(node.status),
    winner: node.winner,
    player1_move: Number(node.player1_move),
    player2_move: Number(node.player2_move),
    committed_at: Number(node.committed_at),
  };
}

export function useGameQuery(gameId: number | null, pollInterval = 3000) {
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchGame = useCallback(async () => {
    if (gameId === null) return;
    try {
      const result: any = await graphQLClient.request(GET_GAME, {
        gameId,
      });
      const key = `${DOJO_NAMESPACE}GameModels`;
      const edges = result?.[key]?.edges;
      if (edges && edges.length > 0) {
        setGame(parseGameNode(edges[0].node));
        setError(null);
      } else {
        setGame(null);
      }
    } catch (e: any) {
      setError(e.message);
    }
  }, [gameId]);

  useEffect(() => {
    if (gameId === null) {
      setGame(null);
      return;
    }
    setLoading(true);
    fetchGame().finally(() => setLoading(false));
    const interval = setInterval(fetchGame, pollInterval);
    return () => clearInterval(interval);
  }, [gameId, fetchGame, pollInterval]);

  return { game, loading, error, refetch: fetchGame };
}

export function useOpenGames(pollInterval = 5000) {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchGames = useCallback(async () => {
    try {
      const result: any = await graphQLClient.request(GET_OPEN_GAMES);
      const key = `${DOJO_NAMESPACE}GameModels`;
      const edges = result?.[key]?.edges;
      if (edges) {
        setGames(edges.map((e: any) => parseGameNode(e.node)));
      }
    } catch (e) {
      console.error("Failed to fetch open games:", e);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchGames().finally(() => setLoading(false));
    const interval = setInterval(fetchGames, pollInterval);
    return () => clearInterval(interval);
  }, [fetchGames, pollInterval]);

  return { games, loading, refetch: fetchGames };
}

export function usePlayerCommit(
  gameId: number | null,
  player: string | null,
  pollInterval = 3000
) {
  const [commit, setCommit] = useState<PlayerCommit | null>(null);

  const fetchCommit = useCallback(async () => {
    if (gameId === null || !player) return;
    try {
      const result: any = await graphQLClient.request(GET_PLAYER_COMMIT, {
        gameId,
        player,
      });
      const key = `${DOJO_NAMESPACE}PlayerCommitModels`;
      const edges = result?.[key]?.edges;
      if (edges && edges.length > 0) {
        const node = edges[0].node;
        setCommit({
          game_id: Number(node.game_id),
          player: node.player,
          commitment: node.commitment,
          revealed: node.revealed,
        });
      } else {
        setCommit(null);
      }
    } catch (e) {
      console.error("Failed to fetch player commit:", e);
    }
  }, [gameId, player]);

  useEffect(() => {
    if (gameId === null || !player) {
      setCommit(null);
      return;
    }
    fetchCommit();
    const interval = setInterval(fetchCommit, pollInterval);
    return () => clearInterval(interval);
  }, [gameId, player, fetchCommit, pollInterval]);

  return { commit, refetch: fetchCommit };
}
