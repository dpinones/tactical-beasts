// Ported from src/domain/hexGrid.ts — non-UI functions only
import { HexCoord } from "../types.js";

export const ROW_WIDTHS = [6, 7, 8, 7, 8, 7, 6];

export const OBSTACLES: HexCoord[] = [
  { row: 3, col: 2 },
  { row: 4, col: 2 },
  { row: 3, col: 3 },
  { row: 4, col: 3 },
  { row: 3, col: 4 },
  { row: 4, col: 4 },
];

const MAX_EVEN_W = Math.max(...ROW_WIDTHS.filter((_, i) => i % 2 === 0));
const MAX_ODD_W = Math.max(...ROW_WIDTHS.filter((_, i) => i % 2 === 1));

function offsetToCube(row: number, col: number): { q: number; r: number; s: number } {
  const isOddCol = col % 2 === 1;
  const maxW = isOddCol ? MAX_ODD_W : MAX_EVEN_W;
  const rowWidth = ROW_WIDTHS[col] ?? 0;
  const logicalRow = row + (maxW - rowWidth) / 2;
  const q = logicalRow - Math.floor(col / 2);
  const r = col;
  const s = -q - r;
  return { q, r, s };
}

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
