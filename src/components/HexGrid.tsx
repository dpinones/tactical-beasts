import { Box } from "@chakra-ui/react";
import {
  ARENA_ROWS,
  OBSTACLES,
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

function terrainClass(row: number, col: number): string {
  const hash = (row * 7 + col * 13) % 4;
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
  // Flip board so the current player's beasts are always at the bottom
  const flipBoard = myPlayerIndex === 1;
  const maxCols = Math.max(...ARENA_ROWS);
  const w = Math.sqrt(3) * hexSize;
  const svgWidth = maxCols * w + w;
  const svgHeight = ARENA_ROWS.length * (hexSize * 1.5) + hexSize;
  const lastRow = ARENA_ROWS.length - 1;

  const allBeasts = [...myBeasts, ...enemyBeasts];

  function getBeastAt(row: number, col: number): BeastStateModel | null {
    return (
      allBeasts.find(
        (b) =>
          b.alive &&
          Number(b.position_row) === row &&
          Number(b.position_col) === col
      ) || null
    );
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

  // Generate hex clip path points string for a given size
  function hexClipPoints(cx: number, cy: number, size: number): string {
    const pts: string[] = [];
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 6;
      pts.push(`${cx + size * Math.cos(angle)},${cy + size * Math.sin(angle)}`);
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

    const beastId = Number(beast.beast_id);
    const imgPath = getBeastImagePath(beastId);
    const clipId = `beast-clip-${beast.player_index}-${beast.beast_index}`;
    const imgSize = hexSize * 0.82;

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

        {/* Selection ring pulse */}
        {isSelected && (
          <polygon
            points={hexClipPoints(cx, cy - 2, hexSize * 0.46)}
            fill="none"
            stroke="#00FF44"
            strokeWidth={1.5}
            opacity={0.5}
          >
            <animate attributeName="opacity" values="0.5;0.15;0.5" dur="1.5s" repeatCount="indefinite" />
          </polygon>
        )}

        {/* Beast image clipped to hex */}
        <image
          href={imgPath}
          x={cx - imgSize}
          y={cy - 2 - imgSize}
          width={imgSize * 2}
          height={imgSize * 2}
          clipPath={`url(#${clipId})`}
          filter="url(#beastShadow)"
          preserveAspectRatio="xMidYMid slice"
        />

        {/* Team color tint overlay */}
        <polygon
          points={hexClipPoints(cx, cy - 2, imgSize)}
          fill={isMine ? "rgba(0,255,68,0.12)" : "rgba(255,51,51,0.12)"}
          stroke={isSelected ? "#00FF44" : color}
          strokeWidth={isSelected ? 2 : 1}
        />

        {/* HP badge below hex */}
        <g>
          <rect
            x={cx - hexSize * 0.38}
            y={cy + imgSize - 2}
            width={hexSize * 0.76}
            height={14}
            rx={4}
            fill="rgba(0,0,0,0.75)"
            stroke={isMine ? "rgba(0,255,68,0.3)" : "rgba(232,64,64,0.3)"}
            strokeWidth={0.5}
          />
          <text
            x={cx}
            y={cy + imgSize + 9}
            textAnchor="middle"
            fill={
              isMine
                ? hpPct > 0.5
                  ? "#33FF66"
                  : hpPct > 0.25
                    ? "#FFD700"
                    : "#E84040"
                : "#E84040"
            }
            fontSize={9}
            fontWeight="bold"
            fontFamily="'JetBrains Mono', monospace"
            style={{ pointerEvents: "none" }}
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
              x={cx - 12}
              y={cy + imgSize + 13}
              width={24}
              height={11}
              rx={3}
              fill="rgba(255,215,0,0.9)"
            />
            <text
              x={cx}
              y={cy + imgSize + 21}
              textAnchor="middle"
              fill="#0B1A0B"
              fontSize={7}
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

  return (
    <Box overflow="auto" display="flex" justifyContent="center">
      <svg
        width={svgWidth + 20}
        height={svgHeight + 20}
        viewBox={`-10 -10 ${svgWidth + 20} ${svgHeight + 20}`}
        style={{ maxWidth: "100%" }}
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
            <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="#000" floodOpacity="0.5" />
          </filter>
        </defs>

        {/* Render cells */}
        {ARENA_ROWS.map((cols, logicalRow) => {
          const visualRow = flipBoard ? lastRow - logicalRow : logicalRow;
          const visualCols = ARENA_ROWS[visualRow];
          return Array.from({ length: cols }, (_, col) => {
            // Use visualRow for pixel position, logicalRow for data
            const { x, y } = hexToPixel(visualRow, col, hexSize);
            const beast = getBeastAt(logicalRow, col);
            const cellClass = getCellClass(logicalRow, col);
            const clickable = isInMoveCells(logicalRow, col) || isInAttackCells(logicalRow, col);

            return (
              <g key={`cell-${logicalRow}-${col}`}>
                <polygon
                  points={hexPoints(x, y, hexSize * 0.92)}
                  className={cellClass}
                  onClick={() => onCellClick(logicalRow, col)}
                  style={{ cursor: clickable ? "pointer" : "default" }}
                />

                {/* Obstacle marker — stone circles */}
                {isObstacle(logicalRow, col, obstacles) && (
                  <g style={{ pointerEvents: "none" }}>
                    <circle cx={x} cy={y} r={hexSize * 0.18} fill="rgba(90,70,40,0.5)" stroke="rgba(70,55,30,0.6)" strokeWidth={0.8} />
                    <circle cx={x - hexSize * 0.15} cy={y + hexSize * 0.1} r={hexSize * 0.1} fill="rgba(80,60,35,0.4)" />
                    <circle cx={x + hexSize * 0.12} cy={y - hexSize * 0.08} r={hexSize * 0.08} fill="rgba(85,65,38,0.35)" />
                  </g>
                )}

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
