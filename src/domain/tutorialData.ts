import { BeastType, CatalogBeast, BeastStateModel, HexCoord } from "./types";
import { OBSTACLES, P1_SPAWNS, P2_SPAWNS } from "./hexGrid";

// Fixed T4 enemy beasts for tutorial — one per type
export const ENEMY_BEASTS: CatalogBeast[] = [
  {
    tokenId: 200000,
    name: "Ogre",
    beastId: 62,
    beast: "Ogre",
    type: BeastType.Brute,
    typeName: "Brute",
    tier: 4,
    level: 36,
    health: 240,
    power: 72,
    prefix: "",
    suffix: "",
    adventurersKilled: 0,
    shiny: false,
    animated: false,
  },
  {
    tokenId: 200001,
    name: "Wolf",
    beastId: 41,
    beast: "Wolf",
    type: BeastType.Hunter,
    typeName: "Hunter",
    tier: 4,
    level: 35,
    health: 230,
    power: 70,
    prefix: "",
    suffix: "",
    adventurersKilled: 0,
    shiny: false,
    animated: false,
  },
  {
    tokenId: 200002,
    name: "Sprite",
    beastId: 14,
    beast: "Sprite",
    type: BeastType.Magical,
    typeName: "Magical",
    tier: 4,
    level: 34,
    health: 220,
    power: 68,
    prefix: "",
    suffix: "",
    adventurersKilled: 0,
    shiny: false,
    animated: false,
  },
];

export const TUTORIAL_OBSTACLES: HexCoord[] = OBSTACLES;
export const TUTORIAL_P1_SPAWNS: HexCoord[] = P1_SPAWNS;
export const TUTORIAL_P2_SPAWNS: HexCoord[] = P2_SPAWNS;

// Convert CatalogBeast[] → BeastStateModel[] at given spawn positions
export function createInitialBeastStates(
  team: CatalogBeast[],
  playerIndex: number,
  spawns: HexCoord[],
): BeastStateModel[] {
  return team.map((beast, i) => ({
    game_id: 0,
    player_index: playerIndex,
    beast_index: i,
    beast_id: beast.beastId,
    token_id: beast.tokenId,
    beast_type: beast.type,
    tier: beast.tier,
    level: beast.level,
    hp: beast.health,
    hp_max: beast.health,
    extra_lives: 0,
    position_row: spawns[i].row,
    position_col: spawns[i].col,
    alive: true,
    last_moved: false,
  }));
}
