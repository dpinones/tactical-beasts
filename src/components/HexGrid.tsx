import { Box } from "@chakra-ui/react";
import { useRef, useEffect, useState } from "react";
import {
  ARENA_ROWS,
  OBSTACLES,
  HEX_WIDTH_SCALE,
  hexToPixel,
  hexPoints,
  isObstacle,
  hexPathBFS,
} from "../domain/hexGrid";
import { BeastStateModel, ActionType, GameAction, HexCoord } from "../domain/types";
import { getBeastImagePath, getSubclass, isPassiveActive } from "../data/beasts";
import { Subclass } from "../domain/types";
import { hexDistance as domainHexDistance } from "../domain/hexGrid";

interface HexGridProps {
  hexSize?: number;
  myBeasts: BeastStateModel[];
  enemyBeasts: BeastStateModel[];
  selectedBeastIndex: number | null;
  onCellClick: (row: number, col: number) => void;
  onBeastClick: (playerIndex: number, beastIndex: number) => void;
  moveCells?: HexCoord[];
  attackCells?: HexCoord[];
  myPlayerIndex: number;
  actions?: Map<number, GameAction>;
  actionHistory?: number[];
  obstacles?: HexCoord[];
}

function terrainClass(_row: number, col: number): string {
  const hash = (_row * 7 + col * 13) % 4;
  return `hex-cell--terrain-${hash + 1}`;
}

export function HexGrid({
  hexSize = 36,
  myBeasts,
  enemyBeasts,
  selectedBeastIndex,
  onCellClick,
  onBeastClick,
  moveCells = [],
  attackCells = [],
  myPlayerIndex,
  actions = new Map(),
  actionHistory = [],
  obstacles = OBSTACLES,
}: HexGridProps) {
  // Flip board so the current player's beasts are always on the left
  // P1 spawns at row 0 (left), P2 at row 6 (right)
  // If I'm P2, flip horizontally
  const flipBoard = myPlayerIndex === 2;
  const maxWidth = Math.max(...ARENA_ROWS); // widest row (8)
  const numRows = ARENA_ROWS.length; // 7 horizontal rows
  const w = Math.sqrt(3) * hexSize * HEX_WIDTH_SCALE; // stretched hex width
  const svgWidth = maxWidth * w + w; // widest row + padding
  const svgHeight = numRows * hexSize * 1.5 + hexSize * 2; // vertical rows + padding
  const lastRow = numRows - 1;

  const allBeasts = [...myBeasts, ...enemyBeasts];

  // Build a map of effective positions: if a beast has a planned MOVE, use the target position
  function getEffectivePosition(beast: BeastStateModel): HexCoord {
    const isMine = Number(beast.player_index) === myPlayerIndex;
    if (isMine) {
      const action = actions.get(Number(beast.beast_index));
      if (action && action.actionType === ActionType.MOVE) {
        return { row: action.targetRow, col: action.targetCol };
      }
    }
    return { row: Number(beast.position_row), col: Number(beast.position_col) };
  }

  function getBeastAt(row: number, col: number): BeastStateModel | null {
    return (
      allBeasts.find((b) => {
        if (!b.alive) return false;
        const pos = getEffectivePosition(b);
        return pos.row === row && pos.col === col;
      }) || null
    );
  }

  // Collect cells that should flash (attack/potion targets)
  function getAttackTargetCells(): HexCoord[] {
    const cells: HexCoord[] = [];
    for (const [, action] of actions) {
      if (action.actionType === ActionType.ATTACK || action.actionType === ActionType.CONSUMABLE_ATTACK_POTION) {
        const target = enemyBeasts.find((b) => Number(b.beast_index) === action.targetIndex);
        if (target && target.alive) {
          cells.push({ row: Number(target.position_row), col: Number(target.position_col) });
        }
      }
    }
    return cells;
  }

  const attackTargetCells = getAttackTargetCells();

  function isAttackTarget(row: number, col: number): boolean {
    return attackTargetCells.some((c) => c.row === row && c.col === col);
  }

  function isInAttackCells(row: number, col: number): boolean {
    return attackCells.some((c) => c.row === row && c.col === col);
  }

  function isInMoveCells(row: number, col: number): boolean {
    return moveCells.some((c) => c.row === row && c.col === col);
  }

  function isSelectedBeastCell(row: number, col: number): boolean {
    if (selectedBeastIndex === null) return false;
    const selected = myBeasts.find(
      (b) => b.alive && Number(b.beast_index) === selectedBeastIndex
    );
    if (!selected) return false;
    return Number(selected.position_row) === row && Number(selected.position_col) === col;
  }

  function getCellClass(row: number, col: number): string {
    if (isObstacle(row, col, obstacles)) return "hex-cell--obstacle";
    if (isInAttackCells(row, col)) return "hex-cell--attack-range";
    if (isInMoveCells(row, col)) return "hex-cell--move-range";
    if (isSelectedBeastCell(row, col)) return "hex-cell--selected-beast";
    const beast = getBeastAt(row, col);
    if (beast) {
      const isMine = Number(beast.player_index) === myPlayerIndex;
      return isMine ? "hex-cell--zone-player" : "hex-cell--zone-enemy";
    }
    return `hex-cell ${terrainClass(row, col)}`;
  }

  function getActionBadge(beastIndex: number): string | null {
    const action = actions.get(beastIndex);
    if (!action) return null;
    switch (action.actionType) {
      case ActionType.MOVE: return "GO";
      case ActionType.ATTACK: return "ATK";
      case ActionType.CONSUMABLE_ATTACK_POTION: return "ATK+";
      default: return null;
    }
  }

  // Generate pointy-top hex clip path points (matches hexPoints, stretched)
  function hexClipPoints(cx: number, cy: number, size: number): string {
    const pts: string[] = [];
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 180) * (60 * i + 30);
      pts.push(`${cx + size * HEX_WIDTH_SCALE * Math.cos(angle)},${cy + size * Math.sin(angle)}`);
    }
    return pts.join(" ");
  }

  // Track delayed HP for drain animation + floating damage numbers
  const prevHpRef = useRef<Map<string, number>>(new Map());
  const [delayedHp, setDelayedHp] = useState<Map<string, number>>(new Map());
  const [damageNumbers, setDamageNumbers] = useState<Map<string, { amount: number; timestamp: number }>>(new Map());

  useEffect(() => {
    const allB = [...myBeasts, ...enemyBeasts];
    const newDelayed = new Map(delayedHp);
    const newDamage = new Map(damageNumbers);
    let needsUpdate = false;
    const now = Date.now();

    for (const b of allB) {
      const key = `${b.player_index}-${b.beast_index}`;
      const currentHp = Number(b.hp);
      const prev = prevHpRef.current.get(key);

      if (prev === undefined) {
        newDelayed.set(key, currentHp);
        prevHpRef.current.set(key, currentHp);
      } else if (currentHp < prev) {
        // Took damage — show floating number and keep delayed bar at old value
        const dmg = prev - currentHp;
        newDamage.set(key, { amount: dmg, timestamp: now });
        newDelayed.set(key, prev);
        prevHpRef.current.set(key, currentHp);
        needsUpdate = true;
      } else {
        newDelayed.set(key, currentHp);
        prevHpRef.current.set(key, currentHp);
      }
    }

    setDelayedHp(newDelayed);
    setDamageNumbers(newDamage);

    if (needsUpdate) {
      // Start draining the yellow bar after damage number is visible
      const drainTimer = setTimeout(() => {
        setDelayedHp((prev) => {
          const updated = new Map(prev);
          for (const b of allB) {
            const key = `${b.player_index}-${b.beast_index}`;
            updated.set(key, Number(b.hp));
          }
          return updated;
        });
      }, 2000);

      // Clear damage numbers after animation completes
      const clearTimer = setTimeout(() => {
        setDamageNumbers((prev) => {
          const updated = new Map(prev);
          for (const [key, val] of updated) {
            if (val.timestamp === now) updated.delete(key);
          }
          return updated;
        });
      }, 3000);

      return () => {
        clearTimeout(drainTimer);
        clearTimeout(clearTimer);
      };
    }
  }, [myBeasts, enemyBeasts]);

  function renderBeast(beast: BeastStateModel, cx: number, cy: number) {
    const isMine = Number(beast.player_index) === myPlayerIndex;
    const beastIdx = Number(beast.beast_index);
    const hp = Number(beast.hp);
    const hpMax = Number(beast.hp_max);
    const hpPct = hpMax > 0 ? hp / hpMax : 0;
    const actionBadge = isMine ? getActionBadge(beastIdx) : null;
    const subclass = getSubclass(Number(beast.beast_id));
    const opponents = isMine ? enemyBeasts : myBeasts;
    const hasAdjacentEnemy = subclass === Subclass.Ranger && opponents.some((opponent) => {
      if (!opponent.alive) return false;
      const opponentPos = {
        row: Number(opponent.position_row),
        col: Number(opponent.position_col),
      };
      const beastPos = getEffectivePosition(beast);
      return domainHexDistance(beastPos, opponentPos) <= 1;
    });
    const passiveActive = isPassiveActive(
      subclass,
      {
        hp,
        hp_max: hpMax,
        last_moved: Boolean(beast.last_moved),
        alive: Boolean(beast.alive),
      },
      undefined,
      hasAdjacentEnemy
    );

    const imgSize = hexSize * 0.82;
    const spriteScale = 2.45;
    const beastImgSrc = getBeastImagePath(Number(beast.beast_id), isMine ? "right" : "left");

    // HP bar dimensions
    const hpBarWidth = hexSize * 1.5;
    const hpBarHeight = 11;
    const hpBarY = cy - imgSize - 16;
    const beastKey = `${beast.player_index}-${beast.beast_index}`;
    const delayedHpVal = delayedHp.get(beastKey) ?? hp;
    const delayedPct = hpMax > 0 ? delayedHpVal / hpMax : 0;

    return (
      <g
        key={`beast-${beast.player_index}-${beast.beast_index}`}
        onClick={(e) => {
          e.stopPropagation();
          onBeastClick(Number(beast.player_index), beastIdx);
        }}
        style={{ cursor: "pointer" }}
      >
        {/* Shadow under beast */}
        <ellipse
          cx={cx}
          cy={cy + imgSize * 0.6}
          rx={hexSize * 0.4}
          ry={hexSize * 0.15}
          fill="rgba(0,0,0,0.4)"
          style={{ pointerEvents: "none" }}
        />

        {/* Team color tint base (behind sprite) */}
        <polygon
          points={hexClipPoints(cx, cy - 2, imgSize)}
          fill={isMine ? "rgba(135,180,155,0.1)" : "rgba(183,110,110,0.1)"}
          stroke="none"
        />

        {/* Beast image */}
        <image
          href={beastImgSrc}
          x={cx - imgSize * (spriteScale / 2)}
          y={cy - imgSize * 1.34}
          width={imgSize * spriteScale}
          height={imgSize * spriteScale}
          filter="url(#beastShadow)"
          preserveAspectRatio="xMidYMid meet"
        />

        {/* Passive active particles (high-contrast yellow, above sprite) */}
        {passiveActive && (
          <g style={{ pointerEvents: "none" }}>
            {Array.from({ length: 12 }).map((_, i) => {
              const angle = (Math.PI * 2 * i) / 12;
              const orbit = hexSize * (0.52 + (i % 3) * 0.09);
              const px = cx + Math.cos(angle) * orbit;
              const py = cy - hexSize * 0.18 + Math.sin(angle) * orbit * 0.62;
              const duration = 0.9 + (i % 4) * 0.18;
              return (
                <circle
                  key={`passive-particle-${beastIdx}-${i}`}
                  cx={px}
                  cy={py}
                  r={2.1}
                  fill="#FFF200"
                  opacity={0.8}
                  filter="url(#passiveParticleGlow)"
                >
                  <animate
                    attributeName="opacity"
                    values="0.1;1;0.1"
                    dur={`${duration}s`}
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="r"
                    values="1.3;4.9;1.3"
                    dur={`${duration + 0.2}s`}
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="cy"
                    values={`${py + 2.4};${py - 3.6};${py + 2.4}`}
                    dur={`${duration + 0.3}s`}
                    repeatCount="indefinite"
                  />
                </circle>
              );
            })}
          </g>
        )}

        {/* HP bar above beast (floating, like Tactical Monsters) */}
        <g style={{ pointerEvents: "none" }}>
          {/* Bar background */}
          <rect
            x={cx - hpBarWidth / 2}
            y={hpBarY}
            width={hpBarWidth}
            height={hpBarHeight}
            rx={2}
            fill="rgba(0,0,0,0.7)"
            stroke="rgba(0,0,0,0.4)"
            strokeWidth={0.5}
          />
          {/* Delayed drain bar (yellow lag behind actual HP) */}
          {delayedPct > hpPct && (
            <rect
              x={cx - hpBarWidth / 2 + 0.5}
              y={hpBarY + 0.5}
              width={Math.max(0, (hpBarWidth - 1) * delayedPct)}
              height={hpBarHeight - 1}
              rx={1.5}
              fill="#CDAE79"
              style={{ transition: "width 2s ease-in-out" }}
            />
          )}
          {/* Bar fill */}
          <rect
            x={cx - hpBarWidth / 2 + 0.5}
            y={hpBarY + 0.5}
            width={Math.max(0, (hpBarWidth - 1) * hpPct)}
            height={hpBarHeight - 1}
            rx={1.5}
            fill={
              isMine
                ? hpPct > 0.5
                  ? "#87B49B"
                  : hpPct > 0.25
                    ? "#CDAE79"
                    : "#C78989"
                : "#C78989"
            }
          />
          {/* HP text */}
          <text
            x={cx}
            y={hpBarY - 3}
            textAnchor="middle"
            fill="#FFFFFF"
            fontSize={10}
            fontWeight="bold"
            fontFamily="'JetBrains Mono', monospace"
            style={{ textShadow: "0 1px 2px rgba(0,0,0,0.8)" } as React.CSSProperties}
          >
            {hp}/{hpMax}
          </text>
        </g>

        {/* Floating damage number — big black, floats up then fades */}
        {damageNumbers.has(beastKey) && (() => {
          const dmgY = cy - hexSize * 0.5;
          const dmgText = `-${damageNumbers.get(beastKey)!.amount}`;
          return (
            <g style={{ pointerEvents: "none" }}>
              {/* Black stroke outline */}
              <text
                x={cx}
                y={dmgY}
                textAnchor="middle"
                dominantBaseline="central"
                fill="none"
                stroke="#000000"
                strokeWidth={5}
                strokeLinejoin="round"
                fontSize={34}
                fontWeight="900"
                fontFamily="'JetBrains Mono', monospace"
              >
                <animate attributeName="y" from={dmgY} to={dmgY - 30} dur="2.5s" fill="freeze" />
                <animate attributeName="opacity" values="1;1;1;0" keyTimes="0;0.5;0.75;1" dur="2.5s" fill="freeze" />
                {dmgText}
              </text>
              {/* Dark fill on top */}
              <text
                x={cx}
                y={dmgY}
                textAnchor="middle"
                dominantBaseline="central"
                fill="#1A1A1A"
                fontSize={34}
                fontWeight="900"
                fontFamily="'JetBrains Mono', monospace"
              >
                <animate attributeName="y" from={dmgY} to={dmgY - 30} dur="2.5s" fill="freeze" />
                <animate attributeName="opacity" values="1;1;1;0" keyTimes="0;0.5;0.75;1" dur="2.5s" fill="freeze" />
                {dmgText}
              </text>
            </g>
          );
        })()}

        {/* Planned action badge */}
        {actionBadge && (
          <g>
            <rect
              x={cx - 14}
              y={cy + imgSize + 2}
              width={28}
              height={13}
              rx={4}
              fill="rgba(189,145,84,0.9)"
              stroke="rgba(113,79,46,0.65)"
              strokeWidth={0.5}
            />
            <text
              x={cx}
              y={cy + imgSize + 11}
              textAnchor="middle"
              fill="#22170C"
              fontSize={7.5}
              fontWeight="bold"
              fontFamily="'JetBrains Mono', monospace"
              style={{ pointerEvents: "none" }}
            >
              {actionBadge}
            </text>
          </g>
        )}
      </g>
    );
  }

  // Render a flashing overlay on cells that are attack targets
  function renderAttackFlash(cx: number, cy: number, key: string) {
    return (
      <polygon
        key={key}
        points={hexPoints(cx, cy, hexSize * 0.92)}
        fill="rgba(183,110,110,0.34)"
        stroke="#D59A9A"
        strokeWidth={2}
        style={{ pointerEvents: "none" }}
      >
        <animate attributeName="opacity" values="0.9;0.3;0.9" dur="1s" repeatCount="indefinite" />
      </polygon>
    );
  }

  // Render action arrows (move + attack) and ghost sprites
  function renderActionArrows() {
    const elements: React.ReactNode[] = [];

    const entries = Array.from(actions.entries());
    for (let ei = 0; ei < entries.length; ei++) {
      const beastIdx = entries[ei][0];
      const action = entries[ei][1];

      const beast = myBeasts.find((b) => Number(b.beast_index) === beastIdx);
      if (!beast || !beast.alive) continue;

      // Source pixel position (beast's real position)
      const srcRow = Number(beast.position_row);
      const srcCol = Number(beast.position_col);
      const srcRW = ARENA_ROWS[srcCol];
      if (srcRW === undefined) continue;
      const srcVR = flipBoard ? srcRW - 1 - srcRow : srcRow;
      const src = hexToPixel(srcVR, srcCol, hexSize);

      if (action.actionType === ActionType.MOVE) {
        // Target pixel position
        const tgtRW = ARENA_ROWS[action.targetCol];
        if (tgtRW === undefined) continue;
        const tgtVR = flipBoard ? tgtRW - 1 - action.targetRow : action.targetRow;
        const tgt = hexToPixel(tgtVR, action.targetCol, hexSize);

        // Build hex-stepping path avoiding obstacles
        const hexSteps = hexPathBFS(
          { row: srcRow, col: srcCol },
          { row: action.targetRow, col: action.targetCol },
          obstacles
        );
        const waypoints: { x: number; y: number }[] = [];
        for (const h of hexSteps) {
          const rw = ARENA_ROWS[h.col];
          if (rw === undefined) continue;
          const vr = flipBoard ? rw - 1 - h.row : h.row;
          waypoints.push(hexToPixel(vr, h.col, hexSize));
        }
        // Fallback to straight line
        if (waypoints.length < 2) {
          waypoints.length = 0;
          waypoints.push({ x: src.x, y: src.y }, { x: tgt.x, y: tgt.y });
        }

        // Shorten start and end so arrow doesn't overlap sprites
        const shrinkAmt = hexSize * 0.4;
        if (waypoints.length >= 2) {
          const a = waypoints[0];
          const b = waypoints[1];
          const d = Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
          if (d > shrinkAmt) {
            waypoints[0] = { x: a.x + ((b.x - a.x) / d) * shrinkAmt, y: a.y + ((b.y - a.y) / d) * shrinkAmt };
          }
          const last = waypoints[waypoints.length - 1];
          const prev = waypoints[waypoints.length - 2];
          const d2 = Math.sqrt((prev.x - last.x) ** 2 + (prev.y - last.y) ** 2);
          if (d2 > shrinkAmt) {
            waypoints[waypoints.length - 1] = { x: last.x + ((prev.x - last.x) / d2) * shrinkAmt, y: last.y + ((prev.y - last.y) / d2) * shrinkAmt };
          }
        }

        const pts = waypoints.map((p) => `${p.x},${p.y}`).join(" ");

        elements.push(
          <polyline
            key={`arrow-move-${beastIdx}`}
            points={pts}
            fill="none"
            stroke="#87B49B"
            strokeWidth={3}
            strokeDasharray="8 4"
            strokeLinecap="round"
            strokeLinejoin="round"
            markerEnd="url(#arrowhead-move)"
            opacity={0.8}
            style={{ pointerEvents: "none", animation: "dash-flow-move 0.6s linear infinite" }}
          />
        );

        // Ghost sprite at destination
        const ghostImg = getBeastImagePath(Number(beast.beast_id), "right");
        const gs = hexSize * 0.82;
        const gScale = 2.45;
        elements.push(
          <image
            key={`ghost-${beastIdx}`}
            href={ghostImg}
            x={tgt.x - gs * (gScale / 2)}
            y={tgt.y - gs * 1.34}
            width={gs * gScale}
            height={gs * gScale}
            preserveAspectRatio="xMidYMid meet"
            opacity={0.25}
            style={{ pointerEvents: "none" }}
          />
        );

      } else if (action.actionType === ActionType.ATTACK || action.actionType === ActionType.CONSUMABLE_ATTACK_POTION) {
        const target = enemyBeasts.find((b) => Number(b.beast_index) === action.targetIndex);
        if (!target || !target.alive) continue;
        const tgtRow = Number(target.position_row);
        const tgtCol = Number(target.position_col);
        const tgtRW = ARENA_ROWS[tgtCol];
        if (tgtRW === undefined) continue;
        const tgtVR = flipBoard ? tgtRW - 1 - tgtRow : tgtRow;
        const tgt = hexToPixel(tgtVR, tgtCol, hexSize);

        // Build hex-stepping path avoiding obstacles
        const atkHexSteps = hexPathBFS(
          { row: srcRow, col: srcCol },
          { row: tgtRow, col: tgtCol },
          obstacles
        );
        const atkWaypoints: { x: number; y: number }[] = [];
        for (const h of atkHexSteps) {
          const rw = ARENA_ROWS[h.col];
          if (rw === undefined) continue;
          const vr = flipBoard ? rw - 1 - h.row : h.row;
          atkWaypoints.push(hexToPixel(vr, h.col, hexSize));
        }
        if (atkWaypoints.length < 2) {
          atkWaypoints.length = 0;
          atkWaypoints.push({ x: src.x, y: src.y }, { x: tgt.x, y: tgt.y });
        }

        // Shorten start and end
        const atkShrink = hexSize * 0.4;
        if (atkWaypoints.length >= 2) {
          const a = atkWaypoints[0];
          const b = atkWaypoints[1];
          const d = Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
          if (d > atkShrink) {
            atkWaypoints[0] = { x: a.x + ((b.x - a.x) / d) * atkShrink, y: a.y + ((b.y - a.y) / d) * atkShrink };
          }
          const last = atkWaypoints[atkWaypoints.length - 1];
          const prev = atkWaypoints[atkWaypoints.length - 2];
          const d2 = Math.sqrt((prev.x - last.x) ** 2 + (prev.y - last.y) ** 2);
          if (d2 > atkShrink) {
            atkWaypoints[atkWaypoints.length - 1] = { x: last.x + ((prev.x - last.x) / d2) * atkShrink, y: last.y + ((prev.y - last.y) / d2) * atkShrink };
          }
        }

        const atkPts = atkWaypoints.map((p) => `${p.x},${p.y}`).join(" ");

        elements.push(
          <polyline
            key={`arrow-atk-${beastIdx}`}
            points={atkPts}
            fill="none"
            stroke="#C78989"
            strokeWidth={3}
            strokeDasharray="6 3"
            strokeLinecap="round"
            strokeLinejoin="round"
            markerEnd="url(#arrowhead-attack)"
            style={{ pointerEvents: "none", animation: "dash-flow-attack 0.5s linear infinite, arrow-pulse-attack 1.5s ease-in-out infinite" }}
          />
        );
      }
    }

    return elements;
  }

  function getBeastRenderPositions() {
    return allBeasts
      .filter((beast) => beast.alive)
      .map((beast) => {
        // Always render at real position — ghost sprite shows planned destination
        const pos = { row: Number(beast.position_row), col: Number(beast.position_col) };
        const rowWidth = ARENA_ROWS[pos.col];
        if (rowWidth === undefined) return null;
        const visualRow = flipBoard ? rowWidth - 1 - pos.row : pos.row;
        const { x, y } = hexToPixel(visualRow, pos.col, hexSize);
        return { beast, x, y };
      })
      .filter((entry): entry is { beast: BeastStateModel; x: number; y: number } => entry !== null)
      .sort((a, b) => a.y - b.y); // far (top) first, near (bottom) last
  }

  const beastRenderPositions = getBeastRenderPositions();

  return (
    <Box
      className="arena-perspective"
      overflow="hidden"
      display="flex"
      justifyContent="center"
      alignItems="center"
      h="100%"
    >
      <svg
        className="arena-grid-3d"
        width={svgWidth + 20}
        height={svgHeight + 20}
        viewBox={`-10 -10 ${svgWidth + 20} ${svgHeight + 20}`}
        style={{ maxWidth: "100%", maxHeight: "100%" }}
      >
        <defs>
          <filter id="glowFilter" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="passiveParticleGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="beastShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.6" />
          </filter>
          {/* Hex cell 3D depth effect */}
          <filter id="hexDepth" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="2" stdDeviation="1" floodColor="#000" floodOpacity="0.3" />
          </filter>
          {/* Arrow markers */}
          <marker id="arrowhead-move" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto">
            <polygon points="0,0 10,4 0,8" fill="#87B49B" />
          </marker>
          <marker id="arrowhead-attack" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto">
            <polygon points="0,0 10,4 0,8" fill="#C78989" />
          </marker>
          <filter id="arrowGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Render cells: iterate col (vertical rows) then row (horizontal pos) */}
        {ARENA_ROWS.map((rowWidth, col) => {
          return Array.from({ length: rowWidth }, (_, logicalRow) => {
            // If flipped, mirror the row (horizontal) position
            const visualRow = flipBoard ? rowWidth - 1 - logicalRow : logicalRow;
            const { x, y } = hexToPixel(visualRow, col, hexSize);
            const cellClass = getCellClass(logicalRow, col);
            const clickable = isInMoveCells(logicalRow, col) || isInAttackCells(logicalRow, col);

            return (
              <g key={`cell-${logicalRow}-${col}`}>
                {/* Hex cell — full size so cells tile without gaps */}
                <polygon
                  points={hexPoints(x, y, hexSize)}
                  className={cellClass}
                  onClick={() => onCellClick(logicalRow, col)}
                  style={{ cursor: clickable ? "pointer" : "default" }}
                />

                {/* Inner hex highlight for 3D bevel effect */}
                <polygon
                  points={hexPoints(x, y - 1, hexSize * 0.88)}
                  fill="none"
                  stroke="rgba(255,255,255,0.06)"
                  strokeWidth={0.5}
                  style={{ pointerEvents: "none" }}
                />

                {/* Obstacle marker image */}
                {isObstacle(logicalRow, col, obstacles) && (
                  <g style={{ pointerEvents: "none" }}>
                    <image
                      href="/obstaculo.png"
                      x={x - hexSize * 1.26}
                      y={y - hexSize * 1.26}
                      width={hexSize * 2.52}
                      height={hexSize * 2.52}
                      preserveAspectRatio="xMidYMid meet"
                      filter="url(#beastShadow)"
                    />
                  </g>
                )}

                {/* Attack target flash */}
              </g>
            );
          });
        })}

        {/* Action arrows between cells and beasts */}
        {renderActionArrows()}

        {/* Beasts are rendered as a top layer so cells/overlays never cover them */}
        {beastRenderPositions.map(({ beast, x, y }) => renderBeast(beast, x, y))}
      </svg>
    </Box>
  );
}
