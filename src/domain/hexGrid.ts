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

// Get valid move targets reachable by walking (BFS, no jumping over obstacles)
export function getValidMoveTargets(
  pos: HexCoord,
  moveRange: number,
  occupiedCells: HexCoord[],
  obstacles: HexCoord[] = OBSTACLES
): HexCoord[] {
  const key = (h: HexCoord) => `${h.row},${h.col}`;
  const visited = new Set<string>();
  visited.add(key(pos));

  // BFS layer by layer up to moveRange steps
  let frontier: HexCoord[] = [pos];
  const reachable: HexCoord[] = [];

  for (let step = 0; step < moveRange; step++) {
    const nextFrontier: HexCoord[] = [];
    for (const cell of frontier) {
      for (const neighbor of getCellsInRange(cell, 1)) {
        const nk = key(neighbor);
        if (visited.has(nk)) continue;
        if (!isValidCell(neighbor.row, neighbor.col)) continue;
        if (isObstacle(neighbor.row, neighbor.col, obstacles)) continue;
        visited.add(nk);
        nextFrontier.push(neighbor);
        // Only add as valid target if not occupied
        if (!occupiedCells.some((o) => o.row === neighbor.row && o.col === neighbor.col)) {
          reachable.push(neighbor);
        }
      }
    }
    frontier = nextFrontier;
  }

  return reachable;
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

// Get hex neighbors of a cell (all 6 adjacent valid cells)
export function getHexNeighbors(pos: HexCoord): HexCoord[] {
  const neighbors: HexCoord[] = [];
  const cells = getCellsInRange(pos, 1);
  for (const c of cells) {
    if (isValidCell(c.row, c.col)) neighbors.push(c);
  }
  return neighbors;
}

// BFS shortest path from A to B avoiding obstacles
export function hexPathBFS(a: HexCoord, b: HexCoord, obstacles: HexCoord[] = OBSTACLES): HexCoord[] {
  if (a.row === b.row && a.col === b.col) return [a];

  const key = (h: HexCoord) => `${h.row},${h.col}`;
  const visited = new Set<string>();
  const parent = new Map<string, HexCoord | null>();
  const queue: HexCoord[] = [a];
  visited.add(key(a));
  parent.set(key(a), null);

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.row === b.row && current.col === b.col) {
      // Reconstruct path
      const path: HexCoord[] = [];
      let node: HexCoord | null = current;
      while (node !== null) {
        path.unshift(node);
        node = parent.get(key(node)) ?? null;
      }
      return path;
    }

    for (const neighbor of getHexNeighbors(current)) {
      const nk = key(neighbor);
      if (visited.has(nk)) continue;
      // Allow destination even if it looks blocked
      if (neighbor.row !== b.row || neighbor.col !== b.col) {
        if (isObstacle(neighbor.row, neighbor.col, obstacles)) continue;
      }
      visited.add(nk);
      parent.set(nk, current);
      queue.push(neighbor);
    }
  }

  // No path found — fallback to direct line
  return [a, b];
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
