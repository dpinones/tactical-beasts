import { useState, useEffect, useCallback, useRef } from "react";
import graphQLClient from "../graphQLClient";
import {
  GET_GAME,
  GET_OPEN_GAMES,
  GET_ALL_BEAST_STATES,
  GET_PLAYER_STATE,
  GET_PLAYER_PROFILE,
  GET_MAP_STATE,
} from "../queries/gameQueries";
import type {
  GameModel,
  BeastStateModel,
  PlayerStateModel,
  PlayerProfileModel,
  MapStateModel,
  HexCoord,
} from "../domain/types";

import { DOJO_NAMESPACE_LOWER as NS } from "../config/namespace";

function toNumber(value: any): number {
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function toBool(value: any): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "bigint") return value !== 0n;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (
      normalized === "" ||
      normalized === "0" ||
      normalized === "0x0" ||
      normalized === "false" ||
      normalized === "no" ||
      normalized === "null"
    ) {
      return false;
    }
    return true;
  }
  return Boolean(value);
}

function parseGameNode(node: any): GameModel {
  return {
    game_id: toNumber(node.game_id),
    player1: node.player1,
    player2: node.player2,
    status: toNumber(node.status),
    current_attacker: toNumber(node.current_attacker),
    round: toNumber(node.round),
    winner: node.winner,
    p1_team_set: toBool(node.p1_team_set),
    p2_team_set: toBool(node.p2_team_set),
  };
}

function parseBeastNode(node: any): BeastStateModel {
  return {
    game_id: toNumber(node.game_id),
    player_index: toNumber(node.player_index),
    beast_index: toNumber(node.beast_index),
    beast_id: toNumber(node.beast_id),
    token_id: toNumber(node.token_id),
    beast_type: toNumber(node.beast_type),
    tier: toNumber(node.tier),
    level: toNumber(node.level),
    hp: toNumber(node.hp),
    hp_max: toNumber(node.hp_max),
    extra_lives: toNumber(node.extra_lives),
    position_row: toNumber(node.position_row),
    position_col: toNumber(node.position_col),
    alive: toBool(node.alive),
    last_moved: toBool(node.last_moved),
  };
}

function parseProfileNode(node: any): PlayerProfileModel {
  return {
    player: node.player,
    games_played: toNumber(node.games_played),
    wins: toNumber(node.wins),
    losses: toNumber(node.losses),
    total_kills: toNumber(node.total_kills),
    total_deaths: toNumber(node.total_deaths),
    abandons: toNumber(node.abandons),
  };
}

function parsePlayerNode(node: any): PlayerStateModel {
  return {
    game_id: toNumber(node.game_id),
    player: node.player,
    player_index: toNumber(node.player_index),
    beast_1: toNumber(node.beast_1),
    beast_2: toNumber(node.beast_2),
    beast_3: toNumber(node.beast_3),
    potion_used: toBool(node.potion_used),
  };
}

export function useGameQuery(gameId: number | null, pollInterval = 2000) {
  const [game, setGame] = useState<GameModel | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchGame = useCallback(async () => {
    if (gameId === null) return;
    try {
      const result: any = await graphQLClient.request(GET_GAME, { gameId });
      const key = `${NS}GameModels`;
      const edges = result?.[key]?.edges;
      if (edges && edges.length > 0) {
        setGame(parseGameNode(edges[0].node));
      }
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
      const result: any = await graphQLClient.request(GET_OPEN_GAMES);
      const key = `${NS}GameModels`;
      const edges = result?.[key]?.edges;
      if (edges) {
        setGames(edges.map((e: any) => parseGameNode(e.node)));
      }
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
      const result: any = await graphQLClient.request(GET_ALL_BEAST_STATES, {
        gameId,
      });
      const key = `${NS}BeastStateModels`;
      const edges = result?.[key]?.edges;
      if (edges) {
        const parsed: BeastStateModel[] = edges.map((e: any) => parseBeastNode(e.node));
        const nextForcedDead = new Set(forcedDeadRef.current);

        for (const beast of parsed) {
          const beastKey = `${beast.player_index}-${beast.beast_index}`;
          const prev = prevRawByKeyRef.current.get(beastKey);

          // Standard death snapshot from backend.
          if (!beast.alive || beast.hp <= 0) {
            nextForcedDead.add(beastKey);
          }

          // Front-only rule: if a revive happened (extra life decreased), keep beast dead.
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
      }
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
      const result: any = await graphQLClient.request(GET_PLAYER_STATE, {
        gameId,
        player,
      });
      const key = `${NS}PlayerStateModels`;
      const edges = result?.[key]?.edges;
      if (edges && edges.length > 0) {
        setPlayerState(parsePlayerNode(edges[0].node));
      }
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

export function usePlayerProfile(player: string | null) {
  const [profile, setProfile] = useState<PlayerProfileModel | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchProfile = useCallback(async () => {
    if (!player) return;
    try {
      const result: any = await graphQLClient.request(GET_PLAYER_PROFILE, { player });
      const key = `${NS}PlayerProfileModels`;
      const edges = result?.[key]?.edges;
      if (edges && edges.length > 0) {
        setProfile(parseProfileNode(edges[0].node));
      }
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

function parseMapStateNode(node: any): MapStateModel {
  return {
    game_id: toNumber(node.game_id),
    obstacle_1_row: toNumber(node.obstacle_1_row),
    obstacle_1_col: toNumber(node.obstacle_1_col),
    obstacle_2_row: toNumber(node.obstacle_2_row),
    obstacle_2_col: toNumber(node.obstacle_2_col),
    obstacle_3_row: toNumber(node.obstacle_3_row),
    obstacle_3_col: toNumber(node.obstacle_3_col),
    obstacle_4_row: toNumber(node.obstacle_4_row),
    obstacle_4_col: toNumber(node.obstacle_4_col),
    obstacle_5_row: toNumber(node.obstacle_5_row),
    obstacle_5_col: toNumber(node.obstacle_5_col),
    obstacle_6_row: toNumber(node.obstacle_6_row),
    obstacle_6_col: toNumber(node.obstacle_6_col),
  };
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
      const result: any = await graphQLClient.request(GET_MAP_STATE, { gameId });
      const key = `${NS}MapStateModels`;
      const edges = result?.[key]?.edges;
      if (edges && edges.length > 0) {
        setMapState(parseMapStateNode(edges[0].node));
      }
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
