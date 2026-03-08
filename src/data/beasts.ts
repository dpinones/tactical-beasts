import { BeastType, CatalogBeast, Subclass, MIN_TIER, MAX_TIER } from "../domain/types";
import beastsData from "../../beasts-all.json";

function parseType(type: string): BeastType {
  switch (type) {
    case "Magic":
    case "Magical":
      return BeastType.Magical;
    case "Hunter":
      return BeastType.Hunter;
    case "Brute":
      return BeastType.Brute;
    default:
      return BeastType.Magical;
  }
}

function typeToName(type: BeastType): string {
  switch (type) {
    case BeastType.Magical:
      return "Magical";
    case BeastType.Hunter:
      return "Hunter";
    case BeastType.Brute:
      return "Brute";
  }
}

// Default beasts: one per type (weakest T4) for players without owned beasts
// Token IDs 100000-100002 are fictional defaults that work both locally and on mainnet
export const DEFAULT_BEASTS: CatalogBeast[] = [
  {
    tokenId: 100000,
    name: "Goblin",
    beastId: 16,
    beast: "Goblin",
    type: BeastType.Magical,
    typeName: "Magical",
    tier: 4,
    level: 37,
    health: 249,
    power: 74,
    prefix: "",
    suffix: "",
    adventurersKilled: 0,
    shiny: false,
    animated: false,
  },
  {
    tokenId: 100001,
    name: "Jaguar",
    beastId: 43,
    beast: "Jaguar",
    type: BeastType.Hunter,
    typeName: "Hunter",
    tier: 4,
    level: 38,
    health: 239,
    power: 76,
    prefix: "",
    suffix: "",
    adventurersKilled: 0,
    shiny: false,
    animated: false,
  },
  {
    tokenId: 100002,
    name: "Yeti",
    beastId: 68,
    beast: "Yeti",
    type: BeastType.Brute,
    typeName: "Brute",
    tier: 4,
    level: 35,
    health: 234,
    power: 70,
    prefix: "",
    suffix: "",
    adventurersKilled: 0,
    shiny: false,
    animated: false,
  },
];

let catalog: CatalogBeast[] | null = null;

export function loadBeastCatalog(): CatalogBeast[] {
  if (catalog) return catalog;

  catalog = (beastsData as any[]).map((b) => {
    const bType = parseType(b.type);
    return {
      tokenId: b.tokenId,
      name: b.name,
      beastId: b.beastId,
      beast: b.beast,
      type: bType,
      typeName: typeToName(bType),
      tier: b.tier,
      level: b.level,
      health: b.health,
      power: b.power,
      prefix: b.prefix || "",
      suffix: b.suffix || "",
      adventurersKilled: b.adventurersKilled || 0,
      shiny: b.shiny || false,
      animated: b.animated || false,
    };
  });

  return catalog;
}

export function getBeastById(tokenId: number): CatalogBeast | undefined {
  return loadBeastCatalog().find((b) => b.tokenId === tokenId);
}

// Get unique beast species for display purposes
export function getUniqueBeastSpecies(): string[] {
  const beasts = loadBeastCatalog();
  return [...new Set(beasts.map((b) => b.beast))];
}

// Map beast_id (1-75) to species name from the catalog
let speciesMap: Map<number, string> | null = null;

export function getSpeciesNameById(beastId: number): string {
  if (!speciesMap) {
    speciesMap = new Map();
    for (const b of beastsData as any[]) {
      if (!speciesMap.has(b.beastId)) {
        speciesMap.set(b.beastId, b.beast);
      }
    }
  }
  return speciesMap.get(beastId) || "Unknown";
}

// Map tokenId -> species name from the catalog
let tokenSpeciesMap: Map<number, string> | null = null;

export function getSpeciesNameByTokenId(tokenId: number): string {
  if (!tokenSpeciesMap) {
    tokenSpeciesMap = new Map();
    for (const b of beastsData as any[]) {
      tokenSpeciesMap.set(b.tokenId, b.beast);
    }
  }
  return tokenSpeciesMap.get(tokenId) || getSpeciesNameById(tokenId);
}

export function getBeastImagePath(beastId: number, facing: "right" | "left" = "right"): string {
  // Try tokenId first, then fall back to species beastId
  const species = getSpeciesNameByTokenId(beastId) || getSpeciesNameById(beastId);
  const name = species.toLowerCase();
  return facing === "left" ? `/beasts/left/${name}.png` : `/beasts/${name}.png`;
}

// Subclass mapping by beast_id (species)
const WARLOCK_IDS = new Set([6, 8, 10, 11, 13, 15, 17, 18]);
const ENCHANTER_IDS = new Set([7, 9, 12, 14, 16, 19, 20]);
const STALKER_IDS = new Set([34, 35, 36, 39, 42, 43, 45]);
const RANGER_IDS = new Set([31, 32, 33, 37, 38, 40, 41, 44]);
const JUGGERNAUT_IDS = new Set([56, 58, 60, 62, 64, 65, 69, 70]);
const BERSERKER_IDS = new Set([57, 59, 61, 63, 66, 67, 68]);

export function getSubclass(beastId: number): Subclass {
  if (WARLOCK_IDS.has(beastId)) return Subclass.Warlock;
  if (ENCHANTER_IDS.has(beastId)) return Subclass.Enchanter;
  if (STALKER_IDS.has(beastId)) return Subclass.Stalker;
  if (RANGER_IDS.has(beastId)) return Subclass.Ranger;
  if (JUGGERNAUT_IDS.has(beastId)) return Subclass.Juggernaut;
  if (BERSERKER_IDS.has(beastId)) return Subclass.Berserker;
  // Fallback by type
  if (beastId <= 25) return Subclass.Enchanter;
  if (beastId <= 50) return Subclass.Ranger;
  return Subclass.Juggernaut;
}

export function getSubclassName(subclass: Subclass): string {
  switch (subclass) {
    case Subclass.Warlock: return "Warlock";
    case Subclass.Enchanter: return "Enchanter";
    case Subclass.Stalker: return "Stalker";
    case Subclass.Ranger: return "Ranger";
    case Subclass.Juggernaut: return "Juggernaut";
    case Subclass.Berserker: return "Berserker";
  }
}

export function isValidTier(tier: number): boolean {
  return tier >= MIN_TIER && tier <= MAX_TIER;
}
