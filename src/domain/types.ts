// Game status constants matching Cairo contracts
export enum GameStatus {
  WAITING = 0,
  PLAYING = 1,
  FINISHED = 2,
}

// Action types matching Cairo Action struct
export enum ActionType {
  MOVE = 1,
  ATTACK = 2,
  CONSUMABLE_ATTACK_POTION = 3,
}

// Beast types
export enum BeastType {
  Magical = 0,
  Hunter = 1,
  Brute = 2,
}

// Subclasses (2 per type)
export enum Subclass {
  Warlock = 0, // Magic: low HP, high dmg, range 3
  Enchanter = 1, // Magic: med HP, med dmg, range 2
  Stalker = 2, // Hunter: mov 2, low HP, high dmg, melee
  Ranger = 3, // Hunter: med HP, med dmg, range 4
  Juggernaut = 4, // Brute: very high HP, low dmg, melee
  Berserker = 5, // Brute: high HP, high dmg, melee
}

// Valid tiers for tactical combat
export const VALID_TIERS = [2, 3, 4] as const;
export const MIN_TIER = 2;
export const MAX_TIER = 4;

export interface HexCoord {
  row: number;
  col: number;
}

// Runtime beast during battle
export interface BattleBeast {
  beastIndex: number;
  beastId: number;
  name: string;
  type: BeastType;
  typeName: string;
  tier: number;
  level: number;
  hp: number;
  hpMax: number;
  extraLives: number;
  position: HexCoord;
  alive: boolean;
  powerBase: number;
}

// Beast from the catalog (beasts-all.json)
export interface CatalogBeast {
  tokenId: number;
  name: string;
  beastId: number;
  beast: string;
  type: BeastType;
  typeName: string;
  tier: number;
  level: number;
  health: number;
  power: number;
  prefix: string;
  suffix: string;
  adventurersKilled: number;
  shiny: boolean;
  animated: boolean;
}

export interface GameAction {
  beastIndex: number;
  actionType: ActionType;
  targetIndex: number;
  targetRow: number;
  targetCol: number;
}

export interface BattleEvent {
  type: "attack" | "counterattack" | "move" | "ko" | "extra_life" | "crit" | "potion" | "passive";
  attackerIndex?: number;
  defenderIndex?: number;
  damage?: number;
  isCrit?: boolean;
  attackerPlayer?: number;
  defenderPlayer?: number;
  message: string;
}

// Onchain game model
export interface GameModel {
  game_id: number;
  player1: string;
  player2: string;
  status: number;
  current_attacker: number;
  round: number;
  winner: string;
  p1_team_set: boolean;
  p2_team_set: boolean;
  is_friendly: boolean;
  settings_id: number;
}

// Onchain beast state model
export interface BeastStateModel {
  game_id: number;
  player_index: number;
  beast_index: number;
  beast_id: number;
  token_id: number;
  beast_type: number;
  tier: number;
  level: number;
  hp: number;
  hp_max: number;
  extra_lives: number;
  position_row: number;
  position_col: number;
  alive: boolean;
  last_moved: boolean;
}

export interface PlayerStateModel {
  game_id: number;
  player: string;
  player_index: number;
  beast_1: number;
  beast_2: number;
  beast_3: number;
  potion_used: boolean;
}

export interface MapStateModel {
  game_id: number;
  obstacle_1_row: number;
  obstacle_1_col: number;
  obstacle_2_row: number;
  obstacle_2_col: number;
  obstacle_3_row: number;
  obstacle_3_col: number;
  obstacle_4_row: number;
  obstacle_4_col: number;
  obstacle_5_row: number;
  obstacle_5_col: number;
  obstacle_6_row: number;
  obstacle_6_col: number;
}

export interface PlayerProfileModel {
  player: string;
  games_played: number;
  wins: number;
  losses: number;
  total_kills: number;
  total_deaths: number;
  abandons: number;
}

export interface GameSettingsModel {
  settings_id: number;
  min_tier: number;
  max_tier: number;
  max_t2_per_team: number;
  max_t3_per_team: number;
  beasts_per_player: number;
}

export const ZERO_ADDR =
  "0x0000000000000000000000000000000000000000000000000000000000000000";
