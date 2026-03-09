import { useState, useEffect, useCallback } from "react";
import graphQLClient from "../graphQLClient";
import {
  GET_GAME,
  GET_OPEN_GAMES,
  GET_ALL_BEAST_STATES,
  GET_PLAYER_STATE,
  GET_PLAYER_PROFILE,
  GET_LEADERBOARD,
  GET_ALL_SETTINGS,
  GET_MAP_STATE,
} from "../queries/gameQueries";
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

function parseGameNode(node: any): GameModel {
  return {
    game_id: Number(node.game_id),
    player1: node.player1,
    player2: node.player2,
    status: Number(node.status),
    current_attacker: Number(node.current_attacker),
    round: Number(node.round),
    winner: node.winner,
    p1_team_set: Boolean(node.p1_team_set),
    p2_team_set: Boolean(node.p2_team_set),
    is_friendly: Boolean(node.is_friendly),
    settings_id: Number(node.settings_id ?? 1),
  };
}

function parseBeastNode(node: any): BeastStateModel {
  return {
    game_id: Number(node.game_id),
    player_index: Number(node.player_index),
    beast_index: Number(node.beast_index),
    beast_id: Number(node.beast_id),
    token_id: Number(node.token_id),
    beast_type: Number(node.beast_type),
    tier: Number(node.tier),
    level: Number(node.level),
    hp: Number(node.hp),
    hp_max: Number(node.hp_max),
    extra_lives: Number(node.extra_lives),
    position_row: Number(node.position_row),
    position_col: Number(node.position_col),
    alive: Boolean(node.alive),
    last_moved: Boolean(node.last_moved),
  };
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

function parsePlayerNode(node: any): PlayerStateModel {
  return {
    game_id: Number(node.game_id),
    player: node.player,
    player_index: Number(node.player_index),
    beast_1: Number(node.beast_1),
    beast_2: Number(node.beast_2),
    beast_3: Number(node.beast_3),
    potion_used: Boolean(node.potion_used),
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

  const fetchBeasts = useCallback(async () => {
    if (gameId === null) return;
    try {
      const result: any = await graphQLClient.request(GET_ALL_BEAST_STATES, {
        gameId,
      });
      const key = `${NS}BeastStateModels`;
      const edges = result?.[key]?.edges;
      if (edges) {
        setBeasts(edges.map((e: any) => parseBeastNode(e.node)));
      }
    } catch (e) {
      console.error("Failed to fetch beast states:", e);
    }
  }, [gameId]);

  useEffect(() => {
    if (gameId === null) {
      setBeasts([]);
      return;
    }
    fetchBeasts();
    const interval = setInterval(fetchBeasts, pollInterval);
    return () => clearInterval(interval);
  }, [gameId, fetchBeasts, pollInterval]);

  return { beasts, refetch: fetchBeasts };
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

function parseSettingsNode(node: any): GameSettingsModel {
  return {
    settings_id: Number(node.settings_id),
    min_tier: Number(node.min_tier),
    max_tier: Number(node.max_tier),
    max_t2_per_team: Number(node.max_t2_per_team),
    max_t3_per_team: Number(node.max_t3_per_team),
    beasts_per_player: Number(node.beasts_per_player),
  };
}

export function useGameSettings() {
  const [settings, setSettings] = useState<GameSettingsModel[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSettings = useCallback(async () => {
    try {
      const result: any = await graphQLClient.request(GET_ALL_SETTINGS);
      const key = `${NS}GameSettingsModels`;
      const edges = result?.[key]?.edges;
      if (edges) {
        setSettings(edges.map((e: any) => parseSettingsNode(e.node)));
      }
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
    game_id: Number(node.game_id),
    obstacle_1_row: Number(node.obstacle_1_row),
    obstacle_1_col: Number(node.obstacle_1_col),
    obstacle_2_row: Number(node.obstacle_2_row),
    obstacle_2_col: Number(node.obstacle_2_col),
    obstacle_3_row: Number(node.obstacle_3_row),
    obstacle_3_col: Number(node.obstacle_3_col),
    obstacle_4_row: Number(node.obstacle_4_row),
    obstacle_4_col: Number(node.obstacle_4_col),
    obstacle_5_row: Number(node.obstacle_5_row),
    obstacle_5_col: Number(node.obstacle_5_col),
    obstacle_6_row: Number(node.obstacle_6_row),
    obstacle_6_col: Number(node.obstacle_6_col),
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
