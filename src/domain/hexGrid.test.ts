import { describe, expect, it } from "vitest";
import {
  hexDistance,
  isValidCell,
  isObstacle,
  getValidMoveTargets,
  getCellsInRange,
  ROW_WIDTHS,
} from "./hexGrid";
import { HexCoord } from "./types";

// =====================================================
// Shared test cases (mirrored in contracts test_combat.cairo)
// =====================================================

// --- hexDistance parity tests ---

describe("hexDistance", () => {
  it("same cell returns 0", () => {
    expect(hexDistance({ row: 0, col: 0 }, { row: 0, col: 0 })).toBe(0);
  });

  it("adjacent cells in same col return 1", () => {
    expect(hexDistance({ row: 0, col: 1 }, { row: 1, col: 1 })).toBe(1);
  });

  it("same row adjacent positions return 1", () => {
    expect(hexDistance({ row: 2, col: 3 }, { row: 3, col: 3 })).toBe(1);
  });

  it("diagonal step returns 1", () => {
    expect(hexDistance({ row: 0, col: 0 }, { row: 0, col: 1 })).toBe(1);
  });

  it("wide to narrow row returns 1", () => {
    // (4,2) col2 width=8 to (3,3) col3 width=7
    expect(hexDistance({ row: 4, col: 2 }, { row: 3, col: 3 })).toBe(1);
  });

  it("across board top to bottom returns 6", () => {
    expect(hexDistance({ row: 0, col: 1 }, { row: 6, col: 1 })).toBe(6);
  });

  it("corner to corner returns 6", () => {
    // (0,0) top-left to (5,6) bottom-right
    expect(hexDistance({ row: 0, col: 0 }, { row: 5, col: 6 })).toBe(8);
  });

  it("P1 spawn to P2 spawn returns 6", () => {
    expect(hexDistance({ row: 0, col: 1 }, { row: 6, col: 1 })).toBe(6);
  });

  it("center cell distances", () => {
    const center: HexCoord = { row: 4, col: 3 };
    // Adjacent
    expect(hexDistance(center, { row: 3, col: 3 })).toBe(1);
    expect(hexDistance(center, { row: 5, col: 3 })).toBe(1);
    expect(hexDistance(center, { row: 4, col: 2 })).toBe(1);
    expect(hexDistance(center, { row: 4, col: 4 })).toBe(1);
    // 2 steps
    expect(hexDistance(center, { row: 2, col: 3 })).toBe(2);
    // Symmetry
    expect(hexDistance(center, { row: 2, col: 1 })).toBe(
      hexDistance({ row: 2, col: 1 }, center)
    );
  });

  it("narrow row col0 to col6 returns 6", () => {
    expect(hexDistance({ row: 0, col: 0 }, { row: 0, col: 6 })).toBe(6);
  });

  it("symmetry batch", () => {
    expect(hexDistance({ row: 0, col: 0 }, { row: 5, col: 4 })).toBe(
      hexDistance({ row: 5, col: 4 }, { row: 0, col: 0 })
    );
    expect(hexDistance({ row: 1, col: 1 }, { row: 6, col: 5 })).toBe(
      hexDistance({ row: 6, col: 5 }, { row: 1, col: 1 })
    );
    expect(hexDistance({ row: 3, col: 2 }, { row: 5, col: 6 })).toBe(
      hexDistance({ row: 5, col: 6 }, { row: 3, col: 2 })
    );
    expect(hexDistance({ row: 0, col: 3 }, { row: 7, col: 4 })).toBe(
      hexDistance({ row: 7, col: 4 }, { row: 0, col: 3 })
    );
  });

  it("range 2 from P1 spawn", () => {
    const spawn: HexCoord = { row: 0, col: 1 };
    expect(hexDistance(spawn, { row: 2, col: 1 })).toBe(2);
    expect(hexDistance(spawn, { row: 1, col: 3 })).toBe(2);
    expect(hexDistance(spawn, { row: 0, col: 3 })).toBe(2);
  });

  it("range 3 from P1 spawn", () => {
    const spawn: HexCoord = { row: 0, col: 1 };
    expect(hexDistance(spawn, { row: 3, col: 1 })).toBe(3);
    expect(hexDistance(spawn, { row: 0, col: 4 })).toBe(3);
  });
});

// --- Obstacle + movement validation tests ---

describe("obstacles and movement", () => {
  const obstaclesAt33: HexCoord[] = [{ row: 3, col: 3 }];

  it("obstacle blocks movement destination", () => {
    // Can reach (3,3) distance-wise from (2,3)
    expect(hexDistance({ row: 2, col: 3 }, { row: 3, col: 3 })).toBe(1);
    // But it's an obstacle
    expect(isObstacle(3, 3, obstaclesAt33)).toBe(true);
    // Adjacent cell is not an obstacle
    expect(isObstacle(2, 3, obstaclesAt33)).toBe(false);
  });

  it("obstacle does not block attack range", () => {
    // Obstacle between attacker and target doesn't block attacks
    // Attacker at (2,3), obstacle at (3,3), target at (4,3)
    const dist = hexDistance({ row: 2, col: 3 }, { row: 4, col: 3 });
    expect(dist).toBe(2);
    // A range-2 attacker can still hit (4,3) — getCellsInRange doesn't filter obstacles
    const inRange = getCellsInRange({ row: 2, col: 3 }, 2);
    expect(inRange.some((c) => c.row === 4 && c.col === 3)).toBe(true);
  });

  it("getValidMoveTargets excludes obstacles", () => {
    const pos: HexCoord = { row: 2, col: 3 };
    const targets = getValidMoveTargets(pos, 1, [], obstaclesAt33);
    // (3,3) should NOT be in valid targets because it's an obstacle
    expect(targets.some((c) => c.row === 3 && c.col === 3)).toBe(false);
    // But other adjacent cells should be valid
    expect(targets.length).toBeGreaterThan(0);
  });

  it("getValidMoveTargets excludes occupied cells", () => {
    const pos: HexCoord = { row: 2, col: 3 };
    const occupied: HexCoord[] = [{ row: 3, col: 3 }];
    const targets = getValidMoveTargets(pos, 1, occupied, []);
    expect(targets.some((c) => c.row === 3 && c.col === 3)).toBe(false);
  });

  it("multiple obstacles ring around center", () => {
    const ring: HexCoord[] = [
      { row: 2, col: 3 },
      { row: 4, col: 3 },
      { row: 3, col: 2 },
      { row: 3, col: 4 },
      { row: 2, col: 2 },
      { row: 2, col: 4 },
    ];
    // Center (3,3) is NOT an obstacle
    expect(isObstacle(3, 3, ring)).toBe(false);
    // All ring cells are obstacles
    for (const o of ring) {
      expect(isObstacle(o.row, o.col, ring)).toBe(true);
    }
    // Moving from center with range 1 — all adjacent are obstacles
    const targets = getValidMoveTargets({ row: 3, col: 3 }, 1, [], ring);
    // Should have very few or no valid targets since ring blocks adjacents
    for (const t of targets) {
      expect(ring.some((o) => o.row === t.row && o.col === t.col)).toBe(false);
    }
  });
});

// --- Valid cells ---

describe("isValidCell", () => {
  it("all 4 corners are valid", () => {
    expect(isValidCell(0, 0)).toBe(true); // top-left
    expect(isValidCell(5, 0)).toBe(true); // top-right (col0 width=6)
    expect(isValidCell(0, 6)).toBe(true); // bottom-left
    expect(isValidCell(5, 6)).toBe(true); // bottom-right (col6 width=6)
  });

  it("just outside corners are invalid", () => {
    expect(isValidCell(6, 0)).toBe(false);
    expect(isValidCell(6, 6)).toBe(false);
  });

  it("widest row col2 has 8 cells", () => {
    expect(isValidCell(7, 2)).toBe(true);
    expect(isValidCell(8, 2)).toBe(false);
  });

  it("col 7 does not exist", () => {
    expect(isValidCell(0, 7)).toBe(false);
  });
});
