import { useState, useEffect, useCallback, useRef } from "react";
import { getViewCalls } from "../services/viewCalls";
import graphQLClient from "../graphQLClient";
import { GET_LEADERBOARD } from "../queries/gameQueries";
import type {
  GameModel,
  BeastStateModel,
  PlayerStateModel,
  PlayerProfileModel,
  GameSettingsModel,
  MapStateModel,
  HexCoord,
} from "../domain/types";

import { DOJO_NAMESPACE_LOWER as NS } from "../config/namespace";

export function useGameQuery(gameId: number | null, pollInterval = 2000) {
  const [game, setGame] = useState<GameModel | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchGame = useCallback(async () => {
    if (gameId === null) return;
    try {
      const result = await getViewCalls().getGame(gameId);
      setGame(result);
    } catch (e) {
      console.error("Failed to fetch game:", e);
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

  return { game, loading, refetch: fetchGame };
}

export function useOpenGames(pollInterval = 5000) {
  const [games, setGames] = useState<GameModel[]>([]);

  const fetchGames = useCallback(async () => {
    try {
      const result = await getViewCalls().getOpenGames(20);
      setGames(result);
    } catch (e) {
      console.error("Failed to fetch open games:", e);
    }
  }, []);

  useEffect(() => {
    fetchGames();
    const interval = setInterval(fetchGames, pollInterval);
    return () => clearInterval(interval);
  }, [fetchGames, pollInterval]);

  return { games, refetch: fetchGames };
}

export function useBeastStates(gameId: number | null, pollInterval = 2000) {
  const [beasts, setBeasts] = useState<BeastStateModel[]>([]);
  const [rawBeasts, setRawBeasts] = useState<BeastStateModel[]>([]);
  const prevRawByKeyRef = useRef<Map<string, BeastStateModel>>(new Map());
  const forcedDeadRef = useRef<Set<string>>(new Set());

  const fetchBeasts = useCallback(async () => {
    if (gameId === null) return;
    try {
      const parsed = await getViewCalls().getAllBeastStates(gameId);
      const nextForcedDead = new Set(forcedDeadRef.current);

      for (const beast of parsed) {
        const beastKey = `${beast.player_index}-${beast.beast_index}`;
        const prev = prevRawByKeyRef.current.get(beastKey);

        if (!beast.alive || beast.hp <= 0) {
          nextForcedDead.add(beastKey);
        }

        if (prev && beast.extra_lives < prev.extra_lives) {
          nextForcedDead.add(beastKey);
        }
      }

      forcedDeadRef.current = nextForcedDead;
      setRawBeasts(parsed);
      setBeasts(
        parsed.map((beast) => {
          const beastKey = `${beast.player_index}-${beast.beast_index}`;
          if (!nextForcedDead.has(beastKey)) return beast;
          return {
            ...beast,
            hp: 0,
            alive: false,
            extra_lives: 0,
          };
        })
      );
      prevRawByKeyRef.current = new Map(
        parsed.map((beast) => [`${beast.player_index}-${beast.beast_index}`, beast] as const)
      );
    } catch (e) {
      console.error("Failed to fetch beast states:", e);
    }
  }, [gameId]);

  useEffect(() => {
    if (gameId === null) {
      setBeasts([]);
      setRawBeasts([]);
      prevRawByKeyRef.current = new Map();
      forcedDeadRef.current = new Set();
      return;
    }
    fetchBeasts();
    const interval = setInterval(fetchBeasts, pollInterval);
    return () => clearInterval(interval);
  }, [gameId, fetchBeasts, pollInterval]);

  return { beasts, rawBeasts, refetch: fetchBeasts };
}

export function usePlayerState(
  gameId: number | null,
  player: string | null,
  pollInterval = 3000
) {
  const [playerState, setPlayerState] = useState<PlayerStateModel | null>(null);

  const fetchState = useCallback(async () => {
    if (gameId === null || !player) return;
    try {
      const result = await getViewCalls().getPlayerState(gameId, player);
      setPlayerState(result);
    } catch (e) {
      console.error("Failed to fetch player state:", e);
    }
  }, [gameId, player]);

  useEffect(() => {
    if (gameId === null || !player) {
      setPlayerState(null);
      return;
    }
    fetchState();
    const interval = setInterval(fetchState, pollInterval);
    return () => clearInterval(interval);
  }, [gameId, player, fetchState, pollInterval]);

  return { playerState, refetch: fetchState };
}

export function useGameSettings() {
  const [settings, setSettings] = useState<GameSettingsModel[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSettings = useCallback(async () => {
    try {
      const result = await getViewCalls().getAllSettings();
      setSettings(result);
    } catch (e) {
      console.error("Failed to fetch game settings:", e);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchSettings().finally(() => setLoading(false));
  }, [fetchSettings]);

  return { settings, loading, refetch: fetchSettings };
}

function parseProfileNode(node: any): PlayerProfileModel {
  return {
    player: node.player,
    games_played: Number(node.games_played),
    wins: Number(node.wins),
    losses: Number(node.losses),
    total_kills: Number(node.total_kills),
    total_deaths: Number(node.total_deaths),
    abandons: Number(node.abandons),
  };
}

export function useLeaderboard(pollInterval = 10000) {
  const [players, setPlayers] = useState<PlayerProfileModel[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLeaderboard = useCallback(async () => {
    try {
      const result: any = await graphQLClient.request(GET_LEADERBOARD);
      const key = `${NS}PlayerProfileModels`;
      const edges = result?.[key]?.edges;
      if (edges) {
        setPlayers(edges.map((e: any) => parseProfileNode(e.node)));
      }
    } catch (e) {
      console.error("Failed to fetch leaderboard:", e);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchLeaderboard().finally(() => setLoading(false));
    const interval = setInterval(fetchLeaderboard, pollInterval);
    return () => clearInterval(interval);
  }, [fetchLeaderboard, pollInterval]);

  return { players, loading, refetch: fetchLeaderboard };
}

export function usePlayerProfile(player: string | null) {
  const [profile, setProfile] = useState<PlayerProfileModel | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchProfile = useCallback(async () => {
    if (!player) return;
    try {
      const result = await getViewCalls().getPlayerProfile(player);
      setProfile(result);
    } catch (e) {
      console.error("Failed to fetch player profile:", e);
    }
  }, [player]);

  useEffect(() => {
    if (!player) {
      setProfile(null);
      return;
    }
    setLoading(true);
    fetchProfile().finally(() => setLoading(false));
  }, [player, fetchProfile]);

  return { profile, loading, refetch: fetchProfile };
}

export function mapStateToObstacles(mapState: MapStateModel): HexCoord[] {
  return [
    { row: mapState.obstacle_1_row, col: mapState.obstacle_1_col },
    { row: mapState.obstacle_2_row, col: mapState.obstacle_2_col },
    { row: mapState.obstacle_3_row, col: mapState.obstacle_3_col },
    { row: mapState.obstacle_4_row, col: mapState.obstacle_4_col },
    { row: mapState.obstacle_5_row, col: mapState.obstacle_5_col },
    { row: mapState.obstacle_6_row, col: mapState.obstacle_6_col },
  ];
}

export function useMapState(gameId: number | null) {
  const [mapState, setMapState] = useState<MapStateModel | null>(null);

  const fetchMapState = useCallback(async () => {
    if (gameId === null) return;
    try {
      const result = await getViewCalls().getMapState(gameId);
      setMapState(result);
    } catch (e) {
      console.error("Failed to fetch map state:", e);
    }
  }, [gameId]);

  useEffect(() => {
    if (gameId === null) {
      setMapState(null);
      return;
    }
    fetchMapState();
  }, [gameId, fetchMapState]);

  return { mapState, refetch: fetchMapState };
}
