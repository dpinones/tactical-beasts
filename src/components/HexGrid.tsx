import { Box } from "@chakra-ui/react";
import {
  ARENA_ROWS,
  OBSTACLES,
  HEX_WIDTH_SCALE,
  hexToPixel,
  hexPoints,
  isObstacle,
} from "../domain/hexGrid";
import { BeastStateModel, BeastType, ActionType, GameAction, HexCoord } from "../domain/types";
import { getTypeColor } from "../domain/combat";
import { getBeastImagePath } from "../data/beasts";

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

  function getCellClass(row: number, col: number): string {
    if (isObstacle(row, col, obstacles)) return "hex-cell--obstacle";
    if (isInAttackCells(row, col)) return "hex-cell--attack-range";
    if (isInMoveCells(row, col)) return "hex-cell--move-range";
    return `hex-cell ${terrainClass(row, col)}`;
  }

  function getActionBadge(beastIndex: number): string | null {
    const action = actions.get(beastIndex);
    if (!action) return null;
    switch (action.actionType) {
      case ActionType.MOVE: return "GO";
      case ActionType.ATTACK: return "ATK";
      case ActionType.CONSUMABLE_ATTACK_POTION: return "ATK+";
      case ActionType.WAIT: return "ZZ";
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

  function renderBeast(beast: BeastStateModel, cx: number, cy: number) {
    const isMine = Number(beast.player_index) === myPlayerIndex;
    const bType = Number(beast.beast_type) as BeastType;
    const color = getTypeColor(bType);
    const beastIdx = Number(beast.beast_index);
    const isSelected = isMine && beastIdx === selectedBeastIndex;
    const hp = Number(beast.hp);
    const hpMax = Number(beast.hp_max);
    const hpPct = hpMax > 0 ? hp / hpMax : 0;
    const extraLives = Number(beast.extra_lives);
    const actionBadge = isMine ? getActionBadge(beastIdx) : null;

    const clipId = `beast-clip-${beast.player_index}-${beast.beast_index}`;
    const imgSize = hexSize * 0.82;
    const beastImgSrc = getBeastImagePath(Number(beast.beast_id));

    // HP bar dimensions
    const hpBarWidth = hexSize * 0.85;
    const hpBarHeight = 5;
    const hpBarY = cy - imgSize - 6;

    return (
      <g
        key={`beast-${beast.player_index}-${beast.beast_index}`}
        onClick={(e) => {
          e.stopPropagation();
          onBeastClick(Number(beast.player_index), beastIdx);
        }}
        style={{ cursor: "pointer" }}
      >
        {/* Clip path for hex shape */}
        <defs>
          <clipPath id={clipId}>
            <polygon points={hexClipPoints(cx, cy - 2, imgSize)} />
          </clipPath>
        </defs>

        {/* Shadow under beast */}
        <ellipse
          cx={cx}
          cy={cy + imgSize * 0.6}
          rx={hexSize * 0.4}
          ry={hexSize * 0.15}
          fill="rgba(0,0,0,0.4)"
          style={{ pointerEvents: "none" }}
        />

        {/* Selection ring pulse */}
        {isSelected && (
          <polygon
            points={hexClipPoints(cx, cy - 2, hexSize * 0.5)}
            fill="none"
            stroke="#00FFDD"
            strokeWidth={2.5}
            opacity={0.6}
          >
            <animate attributeName="opacity" values="0.6;0.2;0.6" dur="1.5s" repeatCount="indefinite" />
          </polygon>
        )}

        {/* Beast image */}
        <image
          href={beastImgSrc}
          x={cx - imgSize * 0.7}
          y={cy - imgSize * 0.9}
          width={imgSize * 1.4}
          height={imgSize * 1.4}
          clipPath={`url(#${clipId})`}
          filter="url(#beastShadow)"
          preserveAspectRatio="xMidYMid meet"
        />

        {/* Team color tint overlay */}
        <polygon
          points={hexClipPoints(cx, cy - 2, imgSize)}
          fill={isMine ? "rgba(0,220,150,0.08)" : "rgba(255,51,51,0.08)"}
          stroke={isSelected ? "#00FFDD" : color}
          strokeWidth={isSelected ? 2.5 : 1.2}
        />

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
                  ? "#33DD66"
                  : hpPct > 0.25
                    ? "#DDAA00"
                    : "#DD3333"
                : "#DD3333"
            }
          />
          {/* HP text */}
          <text
            x={cx}
            y={hpBarY - 2}
            textAnchor="middle"
            fill="#FFFFFF"
            fontSize={7}
            fontWeight="bold"
            fontFamily="'JetBrains Mono', monospace"
            style={{ textShadow: "0 1px 2px rgba(0,0,0,0.8)" } as React.CSSProperties}
          >
            {hp}/{hpMax}
          </text>
        </g>

        {/* Extra lives indicator */}
        {extraLives > 0 && (
          <text
            x={cx + hexSize * 0.38}
            y={cy - imgSize + 6}
            fill="#FFD700"
            fontSize={8}
            fontWeight="bold"
            fontFamily="'JetBrains Mono', monospace"
            style={{ pointerEvents: "none" }}
          >
            +{extraLives}
          </text>
        )}

        {/* Planned action badge */}
        {actionBadge && (
          <g>
            <rect
              x={cx - 14}
              y={cy + imgSize + 2}
              width={28}
              height={13}
              rx={4}
              fill="rgba(255,215,0,0.9)"
              stroke="rgba(180,150,0,0.6)"
              strokeWidth={0.5}
            />
            <text
              x={cx}
              y={cy + imgSize + 11}
              textAnchor="middle"
              fill="#1A0A00"
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
        fill="rgba(255,51,51,0.3)"
        stroke="#FF4444"
        strokeWidth={2}
        style={{ pointerEvents: "none" }}
      >
        <animate attributeName="opacity" values="0.9;0.3;0.9" dur="1s" repeatCount="indefinite" />
      </polygon>
    );
  }

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
          <filter id="beastShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.6" />
          </filter>
          {/* Hex cell 3D depth effect */}
          <filter id="hexDepth" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="2" stdDeviation="1" floodColor="#000" floodOpacity="0.3" />
          </filter>
        </defs>

        {/* Render cells: iterate col (vertical rows) then row (horizontal pos) */}
        {ARENA_ROWS.map((rowWidth, col) => {
          return Array.from({ length: rowWidth }, (_, logicalRow) => {
            // If flipped, mirror the row (horizontal) position
            const visualRow = flipBoard ? rowWidth - 1 - logicalRow : logicalRow;
            const { x, y } = hexToPixel(visualRow, col, hexSize);
            const beast = getBeastAt(logicalRow, col);
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

                {/* Obstacle marker — stone/cannon */}
                {isObstacle(logicalRow, col, obstacles) && (
                  <g style={{ pointerEvents: "none" }}>
                    <circle cx={x} cy={y} r={hexSize * 0.22} fill="rgba(60,45,25,0.7)" stroke="rgba(90,70,40,0.6)" strokeWidth={1.5} />
                    <circle cx={x} cy={y} r={hexSize * 0.1} fill="rgba(40,30,15,0.8)" />
                    <circle cx={x - hexSize * 0.15} cy={y + hexSize * 0.12} r={hexSize * 0.08} fill="rgba(70,55,30,0.5)" />
                    <circle cx={x + hexSize * 0.14} cy={y - hexSize * 0.1} r={hexSize * 0.07} fill="rgba(70,55,30,0.45)" />
                  </g>
                )}

                {/* Attack target flash */}
                {isAttackTarget(logicalRow, col) && renderAttackFlash(x, y, `atk-flash-${logicalRow}-${col}`)}

                {/* Beast */}
                {beast && renderBeast(beast, x, y)}
              </g>
            );
          });
        })}
      </svg>
    </Box>
  );
}
