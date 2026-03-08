import { Box } from "@chakra-ui/react";
import {
  ARENA_ROWS,
  OBSTACLES,
  HEX_WIDTH_SCALE,
  hexToPixel,
  hexPoints,
  isObstacle,
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

  function isSelectedBeastCell(row: number, col: number): boolean {
    if (selectedBeastIndex === null) return false;
    const selected = myBeasts.find(
      (b) => b.alive && Number(b.beast_index) === selectedBeastIndex
    );
    if (!selected) return false;
    const pos = getEffectivePosition(selected);
    return pos.row === row && pos.col === col;
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
    const hpBarWidth = hexSize * 1.12;
    const hpBarHeight = 7;
    const hpBarY = cy - imgSize - 8;

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
            fontSize={7}
            fontWeight="bold"
            fontFamily="'JetBrains Mono', monospace"
            style={{ textShadow: "0 1px 2px rgba(0,0,0,0.8)" } as React.CSSProperties}
          >
            {hp}/{hpMax}
          </text>
        </g>

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

  function getBeastRenderPositions() {
    return allBeasts
      .filter((beast) => beast.alive)
      .map((beast) => {
        const pos = getEffectivePosition(beast);
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
                {isAttackTarget(logicalRow, col) && renderAttackFlash(x, y, `atk-flash-${logicalRow}-${col}`)}
              </g>
            );
          });
        })}

        {/* Beasts are rendered as a top layer so cells/overlays never cover them */}
        {beastRenderPositions.map(({ beast, x, y }) => renderBeast(beast, x, y))}
      </svg>
    </Box>
  );
}
