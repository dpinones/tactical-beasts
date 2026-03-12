import { HexCoord } from "./types";

// Arena layout: 7 horizontal rows, width of each row (bottom-up: 6,7,8,7,8,7,6)
// Index = col (vertical row, 0=top, 6=bottom), value = number of columns in that row
export const ROW_WIDTHS = [6, 7, 8, 7, 8, 7, 6];

// Fixed obstacles (fallback when no MapState)
export const OBSTACLES: HexCoord[] = [
  { row: 3, col: 2 },
  { row: 4, col: 2 },
  { row: 3, col: 3 },
  { row: 4, col: 3 },
  { row: 3, col: 4 },
  { row: 4, col: 4 },
];

// Player spawn positions — P1 left (row 0), P2 right (row 6)
export const P1_SPAWNS: HexCoord[] = [
  { row: 0, col: 1 },
  { row: 0, col: 3 },
  { row: 0, col: 5 },
];

export const P2_SPAWNS: HexCoord[] = [
  { row: 6, col: 1 },
  { row: 6, col: 3 },
  { row: 6, col: 5 },
];

// Keep ARENA_ROWS as alias for backward compat (used by HexGrid iteration)
export const ARENA_ROWS = ROW_WIDTHS;

export function isValidCell(row: number, col: number): boolean {
  if (col < 0 || col >= ROW_WIDTHS.length) return false;
  return row >= 0 && row < ROW_WIDTHS[col];
}

export function isObstacle(row: number, col: number, obstacles: HexCoord[] = OBSTACLES): boolean {
  return obstacles.some((o) => o.row === row && o.col === col);
}

export function hexDistance(a: HexCoord, b: HexCoord): number {
  const aCube = offsetToCube(a.row, a.col);
  const bCube = offsetToCube(b.row, b.col);
  return Math.max(
    Math.abs(aCube.q - bCube.q),
    Math.abs(aCube.r - bCube.r),
    Math.abs(aCube.s - bCube.s)
  );
}

// Max widths per parity — used for centering offset in cube conversion
const MAX_EVEN_W = Math.max(...ROW_WIDTHS.filter((_, i) => i % 2 === 0));
const MAX_ODD_W = Math.max(...ROW_WIDTHS.filter((_, i) => i % 2 === 1));

function offsetToCube(row: number, col: number): { q: number; r: number; s: number } {
  // Adjust row by centering offset so narrower rows align with wider ones
  const isOddCol = col % 2 === 1;
  const maxW = isOddCol ? MAX_ODD_W : MAX_EVEN_W;
  const rowWidth = ROW_WIDTHS[col] ?? 0;
  const logicalRow = row + (maxW - rowWidth) / 2;
  const q = logicalRow - Math.floor(col / 2);
  const r = col;
  const s = -q - r;
  return { q, r, s };
}

// Get all cells within a given range from a position
export function getCellsInRange(pos: HexCoord, range: number): HexCoord[] {
  const cells: HexCoord[] = [];
  for (let c = 0; c < ROW_WIDTHS.length; c++) {
    for (let r = 0; r < ROW_WIDTHS[c]; r++) {
      if (r === pos.row && c === pos.col) continue;
      if (hexDistance(pos, { row: r, col: c }) <= range) {
        cells.push({ row: r, col: c });
      }
    }
  }
  return cells;
}

// Get valid move targets (in range, not obstacle, not occupied)
export function getValidMoveTargets(
  pos: HexCoord,
  moveRange: number,
  occupiedCells: HexCoord[],
  obstacles: HexCoord[] = OBSTACLES
): HexCoord[] {
  return getCellsInRange(pos, moveRange).filter(
    (cell) =>
      !isObstacle(cell.row, cell.col, obstacles) &&
      !occupiedCells.some((o) => o.row === cell.row && o.col === cell.col)
  );
}

// Horizontal stretch factor — makes hexes wider without changing height
export const HEX_WIDTH_SCALE = 1.35;

// Max widths per parity — for centering narrower rows
const MAX_EVEN_WIDTH = Math.max(...ROW_WIDTHS.filter((_, i) => i % 2 === 0));
const MAX_ODD_WIDTH = Math.max(...ROW_WIDTHS.filter((_, i) => i % 2 === 1));

// Hex pixel position for rendering — pointy-top hexagons, horizontal layout
// row = position within a horizontal row (left-to-right)
// col = row index (top-to-bottom, 0..6)
export function hexToPixel(
  row: number,
  col: number,
  hexSize: number
): { x: number; y: number } {
  const w = Math.sqrt(3) * hexSize * HEX_WIDTH_SCALE; // stretched hex width
  const isOddCol = col % 2 === 1;
  const refWidth = isOddCol ? MAX_ODD_WIDTH : MAX_EVEN_WIDTH;
  const rowWidth = ROW_WIDTHS[col];
  const centerOffset = ((refWidth - rowWidth) * w) / 2;

  const x = row * w + (isOddCol ? w / 2 : 0) + centerOffset + w / 2;
  const y = col * hexSize * 1.5 + hexSize;

  return { x, y };
}

// Generate pointy-top hexagon SVG points, stretched horizontally
export function hexPoints(cx: number, cy: number, size: number): string {
  const points: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i + 30);
    const px = cx + size * HEX_WIDTH_SCALE * Math.cos(angle);
    const py = cy + size * Math.sin(angle);
    points.push(`${px},${py}`);
  }
  return points.join(" ");
}

// Cube-round for hex line interpolation
function cubeRound(q: number, r: number, s: number): { q: number; r: number; s: number } {
  let rq = Math.round(q);
  let rr = Math.round(r);
  let rs = Math.round(s);
  const dq = Math.abs(rq - q);
  const dr = Math.abs(rr - r);
  const ds = Math.abs(rs - s);
  if (dq > dr && dq > ds) rq = -rr - rs;
  else if (dr > ds) rr = -rq - rs;
  else rs = -rq - rr;
  return { q: rq, r: rr, s: rs };
}

// Convert cube coords back to offset (row, col) — inverse of offsetToCube
function cubeToOffset(q: number, r: number): HexCoord {
  const col = r;
  const isOddCol = col % 2 === 1;
  const maxW = isOddCol ? MAX_ODD_W : MAX_EVEN_W;
  const rowWidth = ROW_WIDTHS[col] ?? 0;
  const logicalRow = q + Math.floor(col / 2);
  const row = logicalRow - (maxW - rowWidth) / 2;
  return { row, col };
}

// Get hex path from A to B stepping through adjacent hexes (Red Blob Games line algorithm)
export function hexLinePath(a: HexCoord, b: HexCoord): HexCoord[] {
  const n = hexDistance(a, b);
  if (n === 0) return [a];
  const aCube = offsetToCube(a.row, a.col);
  const bCube = offsetToCube(b.row, b.col);
  const path: HexCoord[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const q = aCube.q + (bCube.q - aCube.q) * t;
    const r = aCube.r + (bCube.r - aCube.r) * t;
    const s = aCube.s + (bCube.s - aCube.s) * t;
    const rounded = cubeRound(q, r, s);
    const offset = cubeToOffset(rounded.q, rounded.r);
    // Deduplicate consecutive identical cells
    if (path.length === 0 || path[path.length - 1].row !== offset.row || path[path.length - 1].col !== offset.col) {
      path.push(offset);
    }
  }
  return path;
}

// Get all cells in the grid
export function getAllCells(): HexCoord[] {
  const cells: HexCoord[] = [];
  for (let c = 0; c < ROW_WIDTHS.length; c++) {
    for (let r = 0; r < ROW_WIDTHS[c]; r++) {
      cells.push({ row: r, col: c });
    }
  }
  return cells;
}
