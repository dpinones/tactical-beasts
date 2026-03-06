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

interface HexGridProps {
  hexSize?: number;
  myBeasts: BeastStateModel[];
  enemyBeasts: BeastStateModel[];
  selectedBeastIndex: number | null;
  onCellClick: (row: number, col: number) => void;
  onBeastClick: (playerIndex: number, beastIndex: number) => void;
  highlightedCells?: HexCoord[];
  highlightType?: "move" | "attack";
  myPlayerIndex: number;
  actions?: Map<number, GameAction>;
  obstacles?: HexCoord[];
}

export function HexGrid({
  hexSize = 36,
  myBeasts,
  enemyBeasts,
  selectedBeastIndex,
  onCellClick,
  onBeastClick,
  highlightedCells = [],
  highlightType = "move",
  myPlayerIndex,
  actions = new Map(),
  obstacles = OBSTACLES,
}: HexGridProps) {
  const maxCols = Math.max(...ARENA_ROWS);
  const w = Math.sqrt(3) * hexSize;
  const svgWidth = maxCols * w + w;
  const svgHeight = ARENA_ROWS.length * (hexSize * 1.5) + hexSize;

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

  function isHighlighted(row: number, col: number): boolean {
    return highlightedCells.some((c) => c.row === row && c.col === col);
  }

  function getCellClass(row: number, col: number): string {
    if (isObstacle(row, col, obstacles)) return "hex-cell--obstacle";
    if (isHighlighted(row, col)) {
      return highlightType === "attack"
        ? "hex-cell--attack-range"
        : "hex-cell--move-range";
    }
    return "hex-cell";
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

    return (
      <g
        key={`beast-${beast.player_index}-${beast.beast_index}`}
        onClick={(e) => {
          e.stopPropagation();
          onBeastClick(Number(beast.player_index), beastIdx);
        }}
        style={{ cursor: "pointer" }}
      >
        {/* Selection ring pulse */}
        {isSelected && (
          <circle
            cx={cx}
            cy={cy - 2}
            r={hexSize * 0.44}
            fill="none"
            stroke="#00FF44"
            strokeWidth={1}
            opacity={0.4}
          >
            <animate attributeName="r" values={`${hexSize * 0.42};${hexSize * 0.48};${hexSize * 0.42}`} dur="1.5s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.4;0.1;0.4" dur="1.5s" repeatCount="indefinite" />
          </circle>
        )}

        {/* Beast circle */}
        <circle
          cx={cx}
          cy={cy - 2}
          r={hexSize * 0.38}
          fill={isMine ? "rgba(0,255,68,0.2)" : "rgba(255,51,51,0.2)"}
          stroke={isSelected ? "#00FF44" : color}
          strokeWidth={isSelected ? 2.5 : 1.5}
          filter={isSelected ? "url(#glowFilter)" : undefined}
        />

        {/* Beast type letter */}
        <text
          x={cx}
          y={cy + 2}
          textAnchor="middle"
          fill={color}
          fontSize={hexSize * 0.32}
          fontWeight="bold"
          fontFamily="'EB Garamond', serif"
          style={{ pointerEvents: "none" }}
        >
          {bType === BeastType.Magical
            ? "M"
            : bType === BeastType.Hunter
              ? "H"
              : "B"}
        </text>

        {/* Beast index number */}
        <text
          x={cx}
          y={cy - hexSize * 0.28}
          textAnchor="middle"
          fill={isMine ? "#33FF66" : "#FF3333"}
          fontSize={8}
          fontFamily="'JetBrains Mono', monospace"
          fontWeight="700"
          style={{ pointerEvents: "none" }}
        >
          {beastIdx + 1}
        </text>

        {/* HP bar background */}
        <rect
          x={cx - hexSize * 0.3}
          y={cy + hexSize * 0.25}
          width={hexSize * 0.6}
          height={3}
          rx={1}
          fill="#1A1A1A"
          stroke="#2D5A2D"
          strokeWidth={0.5}
        />

        {/* HP bar fill */}
        <rect
          x={cx - hexSize * 0.3}
          y={cy + hexSize * 0.25}
          width={hexSize * 0.6 * hpPct}
          height={3}
          rx={1}
          fill={
            isMine
              ? hpPct > 0.5
                ? "#33FF66"
                : hpPct > 0.25
                  ? "#FFD700"
                  : "#FF3333"
              : "#FF3333"
          }
        />

        {/* Extra lives indicator */}
        {extraLives > 0 && (
          <text
            x={cx + hexSize * 0.35}
            y={cy + hexSize * 0.36}
            fill="#FFD700"
            fontSize={7}
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
              x={cx - 10}
              y={cy + hexSize * 0.38}
              width={20}
              height={10}
              rx={2}
              fill="rgba(255,215,0,0.9)"
            />
            <text
              x={cx}
              y={cy + hexSize * 0.38 + 8}
              textAnchor="middle"
              fill="#0D0D0D"
              fontSize={6}
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
        </defs>

        {/* Render cells */}
        {ARENA_ROWS.map((cols, row) =>
          Array.from({ length: cols }, (_, col) => {
            const { x, y } = hexToPixel(row, col, hexSize);
            const beast = getBeastAt(row, col);
            const cellClass = getCellClass(row, col);
            const highlighted = isHighlighted(row, col);

            return (
              <g key={`cell-${row}-${col}`}>
                <polygon
                  points={hexPoints(x, y, hexSize * 0.92)}
                  className={cellClass}
                  onClick={() => onCellClick(row, col)}
                  style={{ cursor: highlighted ? "pointer" : "default" }}
                />

                {/* Obstacle marker */}
                {isObstacle(row, col, obstacles) && (
                  <g style={{ pointerEvents: "none" }}>
                    <line x1={x - 5} y1={y - 5} x2={x + 5} y2={y + 5} stroke="#556655" strokeWidth={1.5} />
                    <line x1={x + 5} y1={y - 5} x2={x - 5} y2={y + 5} stroke="#556655" strokeWidth={1.5} />
                  </g>
                )}

                {/* Beast */}
                {beast && renderBeast(beast, x, y)}
              </g>
            );
          })
        )}
      </svg>
    </Box>
  );
}
