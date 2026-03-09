import { DojoProvider } from "@dojoengine/core";
import { DOJO_NAMESPACE } from "../config/namespace";
import type {
  GameModel,
  BeastStateModel,
  PlayerStateModel,
  MapStateModel,
  PlayerProfileModel,
  GameSettingsModel,
} from "../domain/types";

// --- Converters from ABI-parsed results (bigint fields) to our model types ---

function toNumber(v: any): number {
  if (typeof v === "bigint") return Number(v);
  if (typeof v === "number") return v;
  if (typeof v === "string") return Number(v);
  return 0;
}

function toBool(v: any): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "bigint") return v !== 0n;
  if (typeof v === "number") return v !== 0;
  return Boolean(v);
}

function toAddr(v: any): string {
  if (typeof v === "bigint") return "0x" + v.toString(16);
  return String(v);
}

function parseGame(r: any): GameModel {
  return {
    game_id: toNumber(r.game_id),
    player1: toAddr(r.player1),
    player2: toAddr(r.player2),
    status: toNumber(r.status),
    current_attacker: toNumber(r.current_attacker),
    round: toNumber(r.round),
    winner: toAddr(r.winner),
    p1_team_set: toBool(r.p1_team_set),
    p2_team_set: toBool(r.p2_team_set),
    is_friendly: toBool(r.is_friendly),
    settings_id: toNumber(r.settings_id),
  };
}

function parseBeastState(r: any): BeastStateModel {
  return {
    game_id: toNumber(r.game_id),
    player_index: toNumber(r.player_index),
    beast_index: toNumber(r.beast_index),
    beast_id: toNumber(r.beast_id),
    token_id: toNumber(r.token_id),
    beast_type: toNumber(r.beast_type),
    tier: toNumber(r.tier),
    level: toNumber(r.level),
    hp: toNumber(r.hp),
    hp_max: toNumber(r.hp_max),
    extra_lives: toNumber(r.extra_lives),
    position_row: toNumber(r.position_row),
    position_col: toNumber(r.position_col),
    alive: toBool(r.alive),
    last_moved: toBool(r.last_moved),
  };
}

function parsePlayerState(r: any): PlayerStateModel {
  return {
    game_id: toNumber(r.game_id),
    player: toAddr(r.player),
    player_index: toNumber(r.player_index),
    beast_1: toNumber(r.beast_1),
    beast_2: toNumber(r.beast_2),
    beast_3: toNumber(r.beast_3),
    beast_4: toNumber(r.beast_4),
    potion_used: toBool(r.potion_used),
  };
}

function parseMapState(r: any): MapStateModel {
  return {
    game_id: toNumber(r.game_id),
    obstacle_1_row: toNumber(r.obstacle_1_row),
    obstacle_1_col: toNumber(r.obstacle_1_col),
    obstacle_2_row: toNumber(r.obstacle_2_row),
    obstacle_2_col: toNumber(r.obstacle_2_col),
    obstacle_3_row: toNumber(r.obstacle_3_row),
    obstacle_3_col: toNumber(r.obstacle_3_col),
    obstacle_4_row: toNumber(r.obstacle_4_row),
    obstacle_4_col: toNumber(r.obstacle_4_col),
    obstacle_5_row: toNumber(r.obstacle_5_row),
    obstacle_5_col: toNumber(r.obstacle_5_col),
    obstacle_6_row: toNumber(r.obstacle_6_row),
    obstacle_6_col: toNumber(r.obstacle_6_col),
  };
}

function parsePlayerProfile(r: any): PlayerProfileModel {
  return {
    player: toAddr(r.player),
    games_played: toNumber(r.games_played),
    wins: toNumber(r.wins),
    losses: toNumber(r.losses),
    total_kills: toNumber(r.total_kills),
    total_deaths: toNumber(r.total_deaths),
    abandons: toNumber(r.abandons),
  };
}

function parseGameSettings(r: any): GameSettingsModel {
  return {
    settings_id: toNumber(r.settings_id),
    min_tier: toNumber(r.min_tier),
    max_tier: toNumber(r.max_tier),
    max_t2_per_team: toNumber(r.max_t2_per_team),
    max_t3_per_team: toNumber(r.max_t3_per_team),
    beasts_per_player: toNumber(r.beasts_per_player),
  };
}

// --- Service factory ---

export function createViewCallService(provider: DojoProvider) {
  const call = async (entrypoint: string, calldata: any[] = []): Promise<any> =>
    provider.call(DOJO_NAMESPACE, {
      contractName: "game_system",
      entrypoint,
      calldata,
    });

  return {
    async getGame(gameId: number): Promise<GameModel> {
      const result = await call("get_game", [gameId]);
      return parseGame(result);
    },

    async getGameConfig() {
      const result = await call("get_game_config");
      return {
        id: result.id,
        game_count: toNumber(result.game_count),
        token_count: toNumber(result.token_count),
        settings_count: toNumber(result.settings_count),
      };
    },

    async getBeastState(gameId: number, playerIndex: number, beastIndex: number): Promise<BeastStateModel> {
      const result = await call("get_beast_state", [gameId, playerIndex, beastIndex]);
      return parseBeastState(result);
    },

    async getAllBeastStates(gameId: number): Promise<BeastStateModel[]> {
      const result = await call("get_all_beast_states", [gameId]);
      const arr = Array.isArray(result) ? result : (result as any)[0] ?? [];
      return arr.map(parseBeastState);
    },

    async getPlayerState(gameId: number, player: string): Promise<PlayerStateModel> {
      const result = await call("get_player_state", [gameId, player]);
      return parsePlayerState(result);
    },

    async getMapState(gameId: number): Promise<MapStateModel> {
      const result = await call("get_map_state", [gameId]);
      return parseMapState(result);
    },

    async getPlayerProfile(player: string): Promise<PlayerProfileModel> {
      const result = await call("get_player_profile", [player]);
      return parsePlayerProfile(result);
    },

    async getMatchmakingQueue() {
      const result = await call("get_matchmaking_queue");
      return {
        id: result.id,
        waiting_player: toAddr(result.waiting_player),
        waiting_game_id: toNumber(result.waiting_game_id),
      };
    },

    async getOpenGames(max: number = 20): Promise<GameModel[]> {
      const result = await call("get_open_games", [max]);
      const arr = Array.isArray(result) ? result : (result as any)[0] ?? [];
      return arr.map(parseGame);
    },

    async getAllSettings(): Promise<GameSettingsModel[]> {
      const result = await call("get_all_settings");
      const arr = Array.isArray(result) ? result : (result as any)[0] ?? [];
      return arr.map(parseGameSettings);
    },
  };
}

export type ViewCallService = ReturnType<typeof createViewCallService>;

// Module-level singleton, initialized from setup.ts
let _viewCalls: ViewCallService | null = null;

export function initViewCalls(provider: DojoProvider) {
  _viewCalls = createViewCallService(provider);
  return _viewCalls;
}

export function getViewCalls(): ViewCallService {
  if (!_viewCalls) throw new Error("ViewCallService not initialized. Call initViewCalls first.");
  return _viewCalls;
}
