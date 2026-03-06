import { HexCoord } from "./types";

// Arena layout: rows with [6, 7, 8, 7, 8, 7, 6] cells
export const ARENA_ROWS = [6, 7, 8, 7, 8, 7, 6];

// Fixed obstacles (6 cells)
export const OBSTACLES: HexCoord[] = [
  { row: 2, col: 3 },
  { row: 2, col: 4 },
  { row: 3, col: 3 },
  { row: 4, col: 3 },
  { row: 4, col: 4 },
  { row: 3, col: 4 },
];

// Player spawn positions
export const P1_SPAWNS: HexCoord[] = [
  { row: 0, col: 1 },
  { row: 0, col: 3 },
  { row: 1, col: 5 },
];

export const P2_SPAWNS: HexCoord[] = [
  { row: 6, col: 1 },
  { row: 6, col: 3 },
  { row: 5, col: 1 },
];

export function isValidCell(row: number, col: number): boolean {
  if (row < 0 || row >= ARENA_ROWS.length) return false;
  return col >= 0 && col < ARENA_ROWS[row];
}

export function isObstacle(row: number, col: number): boolean {
  return OBSTACLES.some((o) => o.row === row && o.col === col);
}

export function hexDistance(a: HexCoord, b: HexCoord): number {
  // Convert offset coords to cube coords for accurate distance
  const aCube = offsetToCube(a.row, a.col);
  const bCube = offsetToCube(b.row, b.col);
  return Math.max(
    Math.abs(aCube.q - bCube.q),
    Math.abs(aCube.r - bCube.r),
    Math.abs(aCube.s - bCube.s)
  );
}

function offsetToCube(row: number, col: number): { q: number; r: number; s: number } {
  // Even-row offset to cube (flat-top hex)
  const isOddRow = row % 2 === 1;
  const q = col - Math.floor(row / 2);
  const r = row;
  const s = -q - r;
  return { q: isOddRow ? q : q, r, s };
}

// Get all cells within a given range from a position
export function getCellsInRange(pos: HexCoord, range: number): HexCoord[] {
  const cells: HexCoord[] = [];
  for (let r = 0; r < ARENA_ROWS.length; r++) {
    for (let c = 0; c < ARENA_ROWS[r]; c++) {
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
  occupiedCells: HexCoord[]
): HexCoord[] {
  return getCellsInRange(pos, moveRange).filter(
    (cell) =>
      !isObstacle(cell.row, cell.col) &&
      !occupiedCells.some((o) => o.row === cell.row && o.col === cell.col)
  );
}

// Hex pixel position for rendering (pointy-top hexagons)
export function hexToPixel(
  row: number,
  col: number,
  hexSize: number
): { x: number; y: number } {
  const w = Math.sqrt(3) * hexSize;
  const h = 2 * hexSize;
  const isOddRow = row % 2 === 1;
  const maxCols = Math.max(...ARENA_ROWS);
  const rowCols = ARENA_ROWS[row];
  const rowOffset = ((maxCols - rowCols) * w) / 2;

  const x = col * w + (isOddRow ? w / 2 : 0) + rowOffset + w / 2;
  const y = row * (h * 0.75) + hexSize;

  return { x, y };
}

// Generate pointy-top hexagon SVG points
export function hexPoints(cx: number, cy: number, size: number): string {
  const points: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i - 30);
    const px = cx + size * Math.cos(angle);
    const py = cy + size * Math.sin(angle);
    points.push(`${px},${py}`);
  }
  return points.join(" ");
}

// Get all cells in the grid
export function getAllCells(): HexCoord[] {
  const cells: HexCoord[] = [];
  for (let r = 0; r < ARENA_ROWS.length; r++) {
    for (let c = 0; c < ARENA_ROWS[r]; c++) {
      cells.push({ row: r, col: c });
    }
  }
  return cells;
}
