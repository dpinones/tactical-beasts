use core::hash::HashStateTrait;
use core::poseidon::PoseidonTrait;
use starknet::ContractAddress;
use crate::constants::GRID_NUM_ROWS;
use crate::models::index::MapState;

/// Returns the horizontal width (number of columns) for a given row index.
/// Row widths: [6, 7, 8, 7, 8, 7, 6]
pub fn row_width(col: u8) -> u8 {
    if col == 0 || col == 6 {
        6
    } else if col == 1 || col == 3 || col == 5 {
        7
    } else if col == 2 || col == 4 {
        8
    } else {
        0
    }
}

/// Checks if a cell coordinate is within the grid bounds.
pub fn is_valid_cell(row: u8, col: u8) -> bool {
    if col >= GRID_NUM_ROWS {
        return false;
    }
    row < row_width(col)
}

/// Checks if a cell is an obstacle using the dynamic MapState.
pub fn is_obstacle_in_map(map_state: MapState, row: u8, col: u8) -> bool {
    (map_state.obstacle_1_row == row && map_state.obstacle_1_col == col)
        || (map_state.obstacle_2_row == row && map_state.obstacle_2_col == col)
        || (map_state.obstacle_3_row == row && map_state.obstacle_3_col == col)
        || (map_state.obstacle_4_row == row && map_state.obstacle_4_col == col)
        || (map_state.obstacle_5_row == row && map_state.obstacle_5_col == col)
        || (map_state.obstacle_6_row == row && map_state.obstacle_6_col == col)
}

/// Returns true if the given cell is a spawn position.
fn is_spawn(row: u8, col: u8) -> bool {
    // P1 spawns (left): (0,1), (0,3), (0,5)
    // P2 spawns (right): (6,1), (6,3), (6,5)  — rightmost in 7-wide rows
    (row == 0 && col == 1)
        || (row == 0 && col == 3)
        || (row == 0 && col == 5)
        || (row == 6 && col == 1)
        || (row == 6 && col == 3)
        || (row == 6 && col == 5)
}

/// Generates 6 random obstacle positions for a game.
/// Excludes spawn positions. Uses Poseidon hash for deterministic randomness.
pub fn generate_obstacles(
    game_id: u32, player1: ContractAddress, player2: ContractAddress, timestamp: u64,
) -> MapState {
    // Build list of candidate cells (all valid cells minus spawn positions)
    // Total valid cells: 6+7+8+7+8+7+6 = 49, minus 6 spawns = 43 candidates
    let mut candidates: Array<(u8, u8)> = array![];
    let mut col: u8 = 0;
    loop {
        if col >= GRID_NUM_ROWS {
            break;
        }
        let width = row_width(col);
        let mut row: u8 = 0;
        loop {
            if row >= width {
                break;
            }
            if !is_spawn(row, col) {
                candidates.append((row, col));
            }
            row += 1;
        }
        col += 1;
    }

    let seed = PoseidonTrait::new()
        .update(game_id.into())
        .update(player1.into())
        .update(player2.into())
        .update(timestamp.into())
        .finalize();

    // Select 6 obstacles using Fisher-Yates-like selection
    let mut remaining = candidates.len();
    let mut selected: Array<(u8, u8)> = array![];
    let candidates_span = candidates.span();

    let mut indices: Array<u32> = array![];
    let mut idx: u32 = 0;
    loop {
        if idx >= remaining {
            break;
        }
        indices.append(idx);
        idx += 1;
    }

    let mut i: felt252 = 0;
    loop {
        if selected.len() >= 6 {
            break;
        }
        let hash = PoseidonTrait::new().update(seed).update(i).finalize();
        let hash_u256: u256 = hash.into();
        let remaining_u256: u256 = remaining.into();
        let pick: u32 = (hash_u256 % remaining_u256).try_into().unwrap();

        let actual_idx = *indices.span().at(pick);
        let (r, c) = *candidates_span.at(actual_idx);
        selected.append((r, c));

        remaining -= 1;
        let last_idx = *indices.span().at(remaining);
        let mut new_indices: Array<u32> = array![];
        let mut j: u32 = 0;
        loop {
            if j >= remaining {
                break;
            }
            if j == pick {
                new_indices.append(last_idx);
            } else {
                new_indices.append(*indices.span().at(j));
            }
            j += 1;
        }
        indices = new_indices;

        i += 1;
    }

    let sel = selected.span();
    let (r1, c1) = *sel.at(0);
    let (r2, c2) = *sel.at(1);
    let (r3, c3) = *sel.at(2);
    let (r4, c4) = *sel.at(3);
    let (r5, c5) = *sel.at(4);
    let (r6, c6) = *sel.at(5);

    MapState {
        game_id,
        obstacle_1_row: r1,
        obstacle_1_col: c1,
        obstacle_2_row: r2,
        obstacle_2_col: c2,
        obstacle_3_row: r3,
        obstacle_3_col: c3,
        obstacle_4_row: r4,
        obstacle_4_col: c4,
        obstacle_5_row: r5,
        obstacle_5_col: c5,
        obstacle_6_row: r6,
        obstacle_6_col: c6,
    }
}

fn abs_diff(a: u16, b: u16) -> u16 {
    if a >= b {
        a - b
    } else {
        b - a
    }
}

/// Returns the centering offset for a given col.
/// Narrower rows are centered relative to the widest row of the same parity.
/// Even cols: max width 8. Odd cols: max width 7.
/// Only cols 0 and 6 (width 6, even) have offset = 1; all others = 0.
fn centering_offset(col: u8) -> u16 {
    if col == 0 || col == 6 {
        1
    } else {
        0
    }
}

/// Computes hex distance between two cells using odd-col offset -> cube coordinate conversion.
/// Adjusts row by centering offset so variable-width rows align correctly.
/// Uses a positive offset (100) to avoid unsigned underflow.
pub fn hex_distance(r1: u8, c1: u8, r2: u8, c2: u8) -> u8 {
    let offset: u16 = 100;

    let o1: u16 = ((c1 - (c1 % 2)) / 2).into();
    let o2: u16 = ((c2 - (c2 % 2)) / 2).into();

    // Adjust row by centering offset for narrower rows
    let lr1: u16 = r1.into() + centering_offset(c1);
    let lr2: u16 = r2.into() + centering_offset(c2);

    let x1: u16 = offset + lr1 - o1;
    let z1: u16 = offset + c1.into();
    let y1: u16 = 3 * offset - x1 - z1;

    let x2: u16 = offset + lr2 - o2;
    let z2: u16 = offset + c2.into();
    let y2: u16 = 3 * offset - x2 - z2;

    let dx = abs_diff(x1, x2);
    let dy = abs_diff(y1, y2);
    let dz = abs_diff(z1, z2);

    let max = if dx >= dy && dx >= dz {
        dx
    } else if dy >= dz {
        dy
    } else {
        dz
    };
    max.try_into().unwrap()
}

/// Returns fixed spawn position for a beast.
/// Player 1 spawns on the left (row 0), Player 2 on the right (row 6, rightmost of 7-wide rows).
pub fn get_spawn_position(player_index: u8, beast_index: u8) -> (u8, u8) {
    if player_index == 1 {
        if beast_index == 0 {
            (0, 1)
        } else if beast_index == 1 {
            (0, 3)
        } else {
            (0, 5)
        }
    } else {
        if beast_index == 0 {
            (6, 1)
        } else if beast_index == 1 {
            (6, 3)
        } else {
            (6, 5)
        }
    }
}
