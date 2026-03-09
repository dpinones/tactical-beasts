// Mirrors src/domain/types.ts — onchain models and game enums

export enum GameStatus {
  WAITING = 0,
  PLAYING = 1,
  FINISHED = 2,
}

export enum ActionType {
  MOVE = 1,
  ATTACK = 2,
  CONSUMABLE_ATTACK_POTION = 3,
}

export enum BeastType {
  Magical = 0,
  Hunter = 1,
  Brute = 2,
}

export enum Subclass {
  Warlock = 0,
  Enchanter = 1,
  Stalker = 2,
  Ranger = 3,
  Juggernaut = 4,
  Berserker = 5,
}

export interface HexCoord {
  row: number;
  col: number;
}

export interface GameAction {
  beastIndex: number;
  actionType: ActionType;
  targetIndex: number;
  targetRow: number;
  targetCol: number;
}

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
