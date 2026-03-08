import { BeastType, BattleBeast, Subclass } from "./types";
import { getSubclass } from "../data/beasts";

// --- Range functions based on subclass (mirrors contracts/src/logic/beast.cairo) ---

export function getLuck(_beast: BattleBeast): number {
  return 10;
}

export function getMoveRange(beast: BattleBeast): number {
  const subclass = getSubclass(beast.beastId);
  if (subclass === Subclass.Stalker) return 3;
  return 2;
}

export function getAttackRange(beast: BattleBeast): number {
  const subclass = getSubclass(beast.beastId);
  if (subclass === Subclass.Ranger) return 4;
  if (subclass === Subclass.Warlock) return 3;
  if (subclass === Subclass.Enchanter) return 2;
  return 1;
}

// Counter-attack deals 20% of normal damage
export const COUNTER_ATTACK_PCT = 20;

// Team composition limits per tier
export const MAX_T2_PER_TEAM = 1;
export const MAX_T3_PER_TEAM = 2;

// --- Combat calculations ---

export function getTypeAdvantage(
  attackerType: BeastType,
  defenderType: BeastType
): number {
  if (attackerType === defenderType) return 0;
  // Brute > Hunter > Magical > Brute
  if (
    (attackerType === BeastType.Brute && defenderType === BeastType.Hunter) ||
    (attackerType === BeastType.Hunter && defenderType === BeastType.Magical) ||
    (attackerType === BeastType.Magical && defenderType === BeastType.Brute)
  ) {
    return 1; // advantage
  }
  return -1; // disadvantage
}

export function calculateDamage(
  attacker: BattleBeast,
  defender: BattleBeast,
  hasPotion: boolean = false
): { damage: number; isCrit: boolean } {
  let power = attacker.level * (6 - attacker.tier);

  const advantage = getTypeAdvantage(attacker.type, defender.type);
  if (advantage === 1) {
    power = Math.floor(power * 1.5);
  } else if (advantage === -1) {
    power = Math.floor(power * 0.5);
  }

  if (hasPotion) {
    power = Math.floor(power * 1.1);
  }

  const luck = getLuck(attacker);
  const critRoll = Math.random() * 100;
  const isCrit = critRoll < Math.min(luck, 95);

  if (isCrit) {
    power = power * 2;
  }

  const damage = Math.max(power, 2);
  return { damage, isCrit };
}

export function getTypeName(type: BeastType): string {
  switch (type) {
    case BeastType.Magical:
      return "Magical";
    case BeastType.Hunter:
      return "Hunter";
    case BeastType.Brute:
      return "Brute";
  }
}

export function getTypeFromId(beastId: number): BeastType {
  if (beastId >= 1 && beastId <= 25) return BeastType.Magical;
  if (beastId >= 26 && beastId <= 50) return BeastType.Hunter;
  return BeastType.Brute;
}

export function getTierFromId(beastId: number): number {
  const offset = ((beastId - 1) % 25);
  return Math.floor(offset / 5) + 1;
}

export function getTypeColor(type: BeastType): string {
  switch (type) {
    case BeastType.Magical:
      return "#A7D5BF";
    case BeastType.Hunter:
      return "#CDAE79";
    case BeastType.Brute:
      return "#C78989";
  }
}

export function getTypeBadgeVariant(type: BeastType): string {
  switch (type) {
    case BeastType.Magical:
      return "magical";
    case BeastType.Hunter:
      return "hunter";
    case BeastType.Brute:
      return "brute";
  }
}

export function getAdvantageLabel(
  attackerType: BeastType,
  defenderType: BeastType
): string {
  const adv = getTypeAdvantage(attackerType, defenderType);
  if (adv === 1) return "+50%";
  if (adv === -1) return "-50%";
  return "Neutral";
}
