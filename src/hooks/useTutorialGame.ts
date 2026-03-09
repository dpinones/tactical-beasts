import { useState, useMemo, useCallback } from "react";
import { DEFAULT_BEASTS, getSubclass } from "../data/beasts";
import {
  CatalogBeast,
  BeastStateModel,
  GameAction,
  ActionType,
  HexCoord,
  BattleBeast,
} from "../domain/types";
import {
  ENEMY_BEASTS,
  TUTORIAL_OBSTACLES,
  TUTORIAL_P1_SPAWNS,
  TUTORIAL_P2_SPAWNS,
  createInitialBeastStates,
} from "../domain/tutorialData";
import {
  getValidMoveTargets,
  getCellsInRange,
  hexDistance,
} from "../domain/hexGrid";
import { getMoveRange, getAttackRange, calculateDamage } from "../domain/combat";
import { useTutorialStore } from "../stores/tutorialStore";

export type TutorialPhase = "team-select" | "battle" | "complete";

function toBattleBeast(b: BeastStateModel): BattleBeast {
  return {
    beastIndex: b.beast_index,
    beastId: b.beast_id,
    name: "",
    type: b.beast_type,
    typeName: "",
    tier: b.tier,
    level: b.level,
    hp: b.hp,
    hpMax: b.hp_max,
    extraLives: 0,
    position: { row: b.position_row, col: b.position_col },
    alive: b.alive,
    powerBase: b.level * (6 - b.tier),
  };
}

export function useTutorialGame() {
  const completeStep = useTutorialStore((s) => s.completeStep);
  const currentStep = useTutorialStore((s) => s.currentStep);

  // Phase
  const [phase, setPhase] = useState<TutorialPhase>("team-select");

  // Team select state
  const catalog = DEFAULT_BEASTS;
  const [selectedBeasts, setSelectedBeasts] = useState<number[]>([]);

  const toggleBeast = useCallback((tokenId: number) => {
    setSelectedBeasts((prev) => {
      if (prev.includes(tokenId)) return prev.filter((id) => id !== tokenId);
      if (prev.length >= 3) return prev;
      return [...prev, tokenId];
    });
  }, []);

  // Battle state
  const [myBeasts, setMyBeasts] = useState<BeastStateModel[]>([]);
  const [enemyBeasts, setEnemyBeasts] = useState<BeastStateModel[]>([]);
  const [actions, setActions] = useState<Map<number, GameAction>>(new Map());
  const [actionHistory, setActionHistory] = useState<number[]>([]);
  const [selectedBeastIndex, setSelectedBeastIndex] = useState<number | null>(null);
  const [round, setRound] = useState(1);
  const obstacles = TUTORIAL_OBSTACLES;

  // Confirm team → transition to battle
  const confirmTeam = useCallback(() => {
    const team = selectedBeasts.map((id) => catalog.find((b) => b.tokenId === id)!);
    const my = createInitialBeastStates(team, 1, TUTORIAL_P1_SPAWNS);
    const enemy = createInitialBeastStates(ENEMY_BEASTS, 2, TUTORIAL_P2_SPAWNS);
    setMyBeasts(my);
    setEnemyBeasts(enemy);
    setPhase("battle");
    completeStep("confirm-team");
  }, [selectedBeasts, catalog, completeStep]);

  // Occupied cells (with planned moves applied)
  const occupiedCells = useMemo((): HexCoord[] => {
    const all = [...myBeasts, ...enemyBeasts];
    return all
      .filter((b) => b.alive)
      .map((b) => {
        if (b.player_index === 1) {
          const action = actions.get(b.beast_index);
          if (action && action.actionType === ActionType.MOVE) {
            return { row: action.targetRow, col: action.targetCol };
          }
        }
        return { row: b.position_row, col: b.position_col };
      });
  }, [myBeasts, enemyBeasts, actions]);

  // Selected beast model
  const selectedBeast = useMemo(() => {
    if (selectedBeastIndex === null) return null;
    return myBeasts.find((b) => b.beast_index === selectedBeastIndex) || null;
  }, [selectedBeastIndex, myBeasts]);

  // Move and attack cells for selected beast
  const moveCells = useMemo((): HexCoord[] => {
    if (!selectedBeast || !selectedBeast.alive) return [];
    const bb = toBattleBeast(selectedBeast);
    const moveRange = getMoveRange(bb);
    return getValidMoveTargets(
      { row: selectedBeast.position_row, col: selectedBeast.position_col },
      moveRange,
      occupiedCells,
      obstacles,
    );
  }, [selectedBeast, occupiedCells, obstacles]);

  const attackCells = useMemo((): HexCoord[] => {
    if (!selectedBeast || !selectedBeast.alive) return [];
    const pos = { row: selectedBeast.position_row, col: selectedBeast.position_col };
    const bb = toBattleBeast(selectedBeast);
    const atkRange = getAttackRange(bb);
    return enemyBeasts
      .filter((b) => b.alive)
      .map((b) => ({ row: b.position_row, col: b.position_col }))
      .filter((ep) => hexDistance(pos, ep) <= atkRange);
  }, [selectedBeast, enemyBeasts]);

  // Auto-advance to next beast without action
  const autoAdvance = useCallback(
    (updatedActions: Map<number, GameAction>) => {
      const alive = myBeasts.filter((b) => b.alive);
      const next = alive.find((b) => !updatedActions.has(b.beast_index));
      setSelectedBeastIndex(next ? next.beast_index : null);
    },
    [myBeasts],
  );

  // Apply a single attack action directly (for attack-demo auto-confirm)
  const applyAttackAndEnd = useCallback(
    (attackerIdx: number, targetIdx: number) => {
      const updatedMy = myBeasts.map((b) => ({ ...b }));
      const updatedEnemy = enemyBeasts.map((b) => ({ ...b }));

      const attacker = updatedMy.find((b) => b.beast_index === attackerIdx);
      const target = updatedEnemy.find((b) => b.beast_index === targetIdx);
      if (attacker && target && target.alive) {
        const attBB = toBattleBeast(attacker);
        const defBB = toBattleBeast(target);
        const { damage } = calculateDamage(attBB, defBB, false);
        target.hp = Math.max(0, target.hp - damage);
        if (target.hp <= 0) target.alive = false;
      }

      setMyBeasts(updatedMy);
      setEnemyBeasts(updatedEnemy);
      setActions(new Map());
      setActionHistory([]);
      setSelectedBeastIndex(null);

      // Complete the tutorial step, then show complete screen after a short delay
      completeStep("attack-demo");
      setTimeout(() => setPhase("complete"), 1200);
    },
    [myBeasts, enemyBeasts, completeStep],
  );

  // Cell click handler (move or attack)
  const handleCellClick = useCallback(
    (row: number, col: number) => {
      if (selectedBeastIndex === null) return;

      const isMove = moveCells.some((c) => c.row === row && c.col === col);
      if (isMove) {
        const action: GameAction = {
          beastIndex: selectedBeastIndex,
          actionType: ActionType.MOVE,
          targetIndex: 0,
          targetRow: row,
          targetCol: col,
        };
        const updated = new Map(actions).set(selectedBeastIndex, action);
        setActions(updated);
        setActionHistory((prev) => [...prev.filter((i) => i !== selectedBeastIndex), selectedBeastIndex]);
        autoAdvance(updated);

        // Check if all alive beasts now have move actions → complete move-beast step
        const aliveCount = myBeasts.filter((b) => b.alive).length;
        if (updated.size >= aliveCount) {
          completeStep("move-beast");
        }
        return;
      }

      const isAttack = attackCells.some((c) => c.row === row && c.col === col);
      if (isAttack) {
        const enemyBeast = enemyBeasts.find(
          (b) => b.alive && b.position_row === row && b.position_col === col,
        );
        if (enemyBeast) {
          // During attack-demo: apply attack immediately and end tutorial
          if (currentStep === "attack-demo") {
            applyAttackAndEnd(selectedBeastIndex, enemyBeast.beast_index);
            return;
          }

          const action: GameAction = {
            beastIndex: selectedBeastIndex,
            actionType: ActionType.ATTACK,
            targetIndex: enemyBeast.beast_index,
            targetRow: 0,
            targetCol: 0,
          };
          const updated = new Map(actions).set(selectedBeastIndex, action);
          setActions(updated);
          setActionHistory((prev) => [...prev.filter((i) => i !== selectedBeastIndex), selectedBeastIndex]);
          autoAdvance(updated);
          return;
        }
      }

      setSelectedBeastIndex(null);
    },
    [selectedBeastIndex, moveCells, attackCells, enemyBeasts, autoAdvance, actions, myBeasts, completeStep, currentStep, applyAttackAndEnd],
  );

  // Beast click handler
  const handleBeastClick = useCallback(
    (playerIndex: number, beastIndex: number) => {
      // Enemy click while beast selected → attack if in range
      if (playerIndex !== 1 && selectedBeastIndex !== null) {
        const enemyBeast = enemyBeasts.find((b) => b.beast_index === beastIndex);
        if (!enemyBeast) return;
        const isInRange = attackCells.some(
          (c) => c.row === enemyBeast.position_row && c.col === enemyBeast.position_col,
        );
        if (isInRange) {
          // During attack-demo: apply attack immediately and end tutorial
          if (currentStep === "attack-demo") {
            applyAttackAndEnd(selectedBeastIndex, beastIndex);
            return;
          }

          const action: GameAction = {
            beastIndex: selectedBeastIndex,
            actionType: ActionType.ATTACK,
            targetIndex: beastIndex,
            targetRow: 0,
            targetCol: 0,
          };
          const updated = new Map(actions).set(selectedBeastIndex, action);
          setActions(updated);
          setActionHistory((prev) => [...prev.filter((i) => i !== selectedBeastIndex), selectedBeastIndex]);
          autoAdvance(updated);
          return;
        }
      }

      // Own beast click → select/deselect
      if (playerIndex === 1) {
        if (selectedBeastIndex === beastIndex) {
          setSelectedBeastIndex(null);
        } else {
          setSelectedBeastIndex(beastIndex);
          completeStep("select-beast");
        }
      }
    },
    [selectedBeastIndex, enemyBeasts, attackCells, autoAdvance, actions, completeStep, currentStep, applyAttackAndEnd],
  );

  const handleUndoLast = useCallback(() => {
    if (actionHistory.length === 0) return;
    const lastIdx = actionHistory[actionHistory.length - 1];
    setActions((prev) => {
      const next = new Map(prev);
      next.delete(lastIdx);
      return next;
    });
    setActionHistory((prev) => prev.slice(0, -1));
    setSelectedBeastIndex(lastIdx);
  }, [actionHistory]);

  const handleClearAll = useCallback(() => {
    setActions(new Map());
    setActionHistory([]);
    setSelectedBeastIndex(null);
  }, []);

  // Confirm actions: apply player actions locally, then run enemy AI
  const confirmActions = useCallback(() => {
    let updatedMy = myBeasts.map((b) => ({ ...b }));
    let updatedEnemy = enemyBeasts.map((b) => ({ ...b }));

    // Apply player actions in order
    for (const idx of actionHistory) {
      const action = actions.get(idx);
      if (!action) continue;
      const beast = updatedMy.find((b) => b.beast_index === idx);
      if (!beast || !beast.alive) continue;

      if (action.actionType === ActionType.MOVE) {
        beast.position_row = action.targetRow;
        beast.position_col = action.targetCol;
        beast.last_moved = true;
      } else if (action.actionType === ActionType.ATTACK) {
        const target = updatedEnemy.find((b) => b.beast_index === action.targetIndex);
        if (target && target.alive) {
          const attBB = toBattleBeast(beast);
          const defBB = toBattleBeast(target);
          const { damage } = calculateDamage(attBB, defBB, false);
          target.hp = Math.max(0, target.hp - damage);
          if (target.hp <= 0) target.alive = false;
          beast.last_moved = false;
        }
      }
    }

    // Enemy AI turn — simple deterministic
    for (const enemy of updatedEnemy) {
      if (!enemy.alive) continue;

      const aliveAllies = updatedMy.filter((b) => b.alive);
      if (aliveAllies.length === 0) break;

      // Find closest ally
      const ePos: HexCoord = { row: enemy.position_row, col: enemy.position_col };
      let closestAlly = aliveAllies[0];
      let closestDist = hexDistance(ePos, { row: closestAlly.position_row, col: closestAlly.position_col });
      for (const ally of aliveAllies) {
        const d = hexDistance(ePos, { row: ally.position_row, col: ally.position_col });
        if (d < closestDist) {
          closestDist = d;
          closestAlly = ally;
        }
      }

      const eBB = toBattleBeast(enemy);
      const atkRange = getAttackRange(eBB);
      const moveRange = getMoveRange(eBB);

      // If in attack range → attack
      if (closestDist <= atkRange) {
        const defBB = toBattleBeast(closestAlly);
        const { damage } = calculateDamage(eBB, defBB, false);
        closestAlly.hp = Math.max(0, closestAlly.hp - damage);
        if (closestAlly.hp <= 0) closestAlly.alive = false;
        enemy.last_moved = false;
      } else {
        // Move closer
        const allOccupied: HexCoord[] = [
          ...updatedMy.filter((b) => b.alive).map((b) => ({ row: b.position_row, col: b.position_col })),
          ...updatedEnemy.filter((b) => b.alive).map((b) => ({ row: b.position_row, col: b.position_col })),
        ];
        const targets = getValidMoveTargets(ePos, moveRange, allOccupied, obstacles);
        const targetPos = { row: closestAlly.position_row, col: closestAlly.position_col };

        let bestCell = ePos;
        let bestDist = closestDist;
        for (const cell of targets) {
          const d = hexDistance(cell, targetPos);
          if (d < bestDist) {
            bestDist = d;
            bestCell = cell;
          }
        }
        if (bestCell !== ePos) {
          enemy.position_row = bestCell.row;
          enemy.position_col = bestCell.col;
          enemy.last_moved = true;
        }
      }
    }

    setMyBeasts(updatedMy);
    setEnemyBeasts(updatedEnemy);
    setActions(new Map());
    setActionHistory([]);
    setSelectedBeastIndex(null);

    // Check if battle is over
    const allEnemyDead = updatedEnemy.every((b) => !b.alive);
    const allMyDead = updatedMy.every((b) => !b.alive);
    if (allEnemyDead || allMyDead) {
      setPhase("complete");
    } else {
      setRound((r) => r + 1);
      // After first confirm (moves), advance to enemy-approach step
      completeStep("confirm-actions");
    }
  }, [actions, actionHistory, myBeasts, enemyBeasts, obstacles, completeStep]);

  return {
    phase,
    catalog,
    selectedBeasts,
    toggleBeast,
    confirmTeam,
    myBeasts,
    enemyBeasts,
    actions,
    actionHistory,
    selectedBeastIndex,
    setSelectedBeastIndex,
    moveCells,
    attackCells,
    round,
    isMyTurn: true,
    obstacles,
    handleCellClick,
    handleBeastClick,
    handleUndoLast,
    handleClearAll,
    confirmActions,
  };
}
