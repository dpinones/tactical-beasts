import { BeastType, CatalogBeast } from "../domain/types";
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

export function getBeastImagePath(beastId: number): string {
  const species = getSpeciesNameById(beastId);
  return `/beasts/${species.toLowerCase()}.png`;
}
