// Greedy AI strategy: score targets, pick actions
import { BeastStateModel, BeastType, Subclass, ActionType, GameAction, HexCoord } from "../types.js";
import { hexDistance, getValidMoveTargets, getCellsInRange } from "./hexGrid.js";

// Subclass ID sets (from src/data/beasts.ts)
const WARLOCK_IDS = new Set([6, 8, 10, 11, 13, 15, 17, 18]);
const ENCHANTER_IDS = new Set([7, 9, 12, 14, 16, 19, 20]);
const STALKER_IDS = new Set([34, 35, 36, 39, 42, 43, 45]);
const RANGER_IDS = new Set([31, 32, 33, 37, 38, 40, 41, 44]);
const JUGGERNAUT_IDS = new Set([56, 58, 60, 62, 64, 65, 69, 70]);
const BERSERKER_IDS = new Set([57, 59, 61, 63, 66, 67, 68]);

function getSubclass(beastId: number): Subclass {
  if (WARLOCK_IDS.has(beastId)) return Subclass.Warlock;
  if (ENCHANTER_IDS.has(beastId)) return Subclass.Enchanter;
  if (STALKER_IDS.has(beastId)) return Subclass.Stalker;
  if (RANGER_IDS.has(beastId)) return Subclass.Ranger;
  if (JUGGERNAUT_IDS.has(beastId)) return Subclass.Juggernaut;
  if (BERSERKER_IDS.has(beastId)) return Subclass.Berserker;
  if (beastId <= 25) return Subclass.Enchanter;
  if (beastId <= 50) return Subclass.Ranger;
  return Subclass.Juggernaut;
}

function getTypeFromId(beastId: number): BeastType {
  if (beastId >= 1 && beastId <= 25) return BeastType.Magical;
  if (beastId >= 26 && beastId <= 50) return BeastType.Hunter;
  return BeastType.Brute;
}

function getMoveRange(beastId: number): number {
  return getSubclass(beastId) === Subclass.Stalker ? 3 : 2;
}

function getAttackRange(beastId: number): number {
  const sub = getSubclass(beastId);
  if (sub === Subclass.Ranger) return 4;
  if (sub === Subclass.Warlock) return 3;
  if (sub === Subclass.Enchanter) return 2;
  return 1;
}

function getTypeAdvantage(attackerType: BeastType, defenderType: BeastType): number {
  if (attackerType === defenderType) return 0;
  if (
    (attackerType === BeastType.Brute && defenderType === BeastType.Hunter) ||
    (attackerType === BeastType.Hunter && defenderType === BeastType.Magical) ||
    (attackerType === BeastType.Magical && defenderType === BeastType.Brute)
  ) {
    return 1;
  }
  return -1;
}

function beastPos(b: BeastStateModel): HexCoord {
  return { row: Number(b.position_row), col: Number(b.position_col) };
}

interface ScoredTarget {
  enemy: BeastStateModel;
  score: number;
  distance: number;
}

function scoreTarget(bot: BeastStateModel, enemy: BeastStateModel): ScoredTarget {
  const botType = getTypeFromId(Number(bot.beast_id));
  const enemyType = getTypeFromId(Number(enemy.beast_id));
  const dist = hexDistance(beastPos(bot), beastPos(enemy));

  let score = 0;
  const adv = getTypeAdvantage(botType, enemyType);
  if (adv === 1) score += 50;
  if (adv === -1) score -= 30;

  // Prefer low HP targets
  const hpPct = Number(enemy.hp) / Number(enemy.hp_max);
  if (hpPct < 0.3) score += 40;
  else if (hpPct < 0.5) score += 20;

  // Penalize distance
  score -= dist * 10;

  return { enemy, score, distance: dist };
}

export function computeActions(
  botBeasts: BeastStateModel[],
  enemyBeasts: BeastStateModel[],
  obstacles: HexCoord[]
): GameAction[] {
  const actions: GameAction[] = [];
  const aliveBot = botBeasts.filter((b) => b.alive);
  const aliveEnemy = enemyBeasts.filter((b) => b.alive);

  if (aliveEnemy.length === 0) return actions;

  // Track planned positions to avoid collisions
  const plannedPositions = new Map<number, HexCoord>(); // beastIndex -> planned pos

  for (const bot of aliveBot) {
    const beastId = Number(bot.beast_id);
    const beastIndex = Number(bot.beast_index);
    const botPosition = beastPos(bot);
    const moveRange = getMoveRange(beastId);
    const attackRange = getAttackRange(beastId);

    // Score all alive enemies
    const scored = aliveEnemy.map((e) => scoreTarget(bot, e)).sort((a, b) => b.score - a.score);
    const bestTarget = scored[0];
    if (!bestTarget) continue;

    const targetPos = beastPos(bestTarget.enemy);
    const distToTarget = hexDistance(botPosition, targetPos);

    // Can attack from current position?
    if (distToTarget <= attackRange) {
      actions.push({
        beastIndex,
        actionType: ActionType.ATTACK,
        targetIndex: Number(bestTarget.enemy.beast_index),
        targetRow: 0,
        targetCol: 0,
      });
      plannedPositions.set(beastIndex, botPosition);
      continue;
    }

    // Need to move closer — find best move cell
    const allOccupied: HexCoord[] = [
      ...botBeasts.filter((b) => b.alive).map((b) => {
        const planned = plannedPositions.get(Number(b.beast_index));
        return planned || beastPos(b);
      }),
      ...aliveEnemy.map((b) => beastPos(b)),
    ];
    // Remove bot's own position from occupied
    const occupiedWithout = allOccupied.filter(
      (c) => !(c.row === botPosition.row && c.col === botPosition.col)
    );

    const moveTargets = getValidMoveTargets(botPosition, moveRange, occupiedWithout, obstacles);

    if (moveTargets.length === 0) {
      // Can't move — skip or just stay
      plannedPositions.set(beastIndex, botPosition);
      continue;
    }

    // Pick move cell that minimizes distance to target
    let bestMove = moveTargets[0];
    let bestDist = hexDistance(bestMove, targetPos);
    for (const cell of moveTargets) {
      const d = hexDistance(cell, targetPos);
      if (d < bestDist) {
        bestDist = d;
        bestMove = cell;
      }
    }

    actions.push({
      beastIndex,
      actionType: ActionType.MOVE,
      targetIndex: 0,
      targetRow: bestMove.row,
      targetCol: bestMove.col,
    });
    plannedPositions.set(beastIndex, bestMove);

    // After moving, check if we can attack from new position
    if (bestDist <= attackRange) {
      actions.push({
        beastIndex,
        actionType: ActionType.ATTACK,
        targetIndex: Number(bestTarget.enemy.beast_index),
        targetRow: 0,
        targetCol: 0,
      });
    }
  }

  return actions;
}
