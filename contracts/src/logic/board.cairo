use core::hash::HashStateTrait;
use core::poseidon::PoseidonTrait;
use starknet::ContractAddress;
use crate::models::index::MapState;

/// Returns the number of valid columns for a given row.
/// Grid shape: 6/7/8/7/8/7/6
pub fn row_width(row: u8) -> u8 {
    if row == 0 || row == 6 {
        6
    } else if row == 1 || row == 3 || row == 5 {
        7
    } else if row == 2 || row == 4 {
        8
    } else {
        0
    }
}

/// Checks if a cell coordinate is within the grid bounds.
pub fn is_valid_cell(row: u8, col: u8) -> bool {
    if row > 6 {
        return false;
    }
    col < row_width(row)
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
    // P1 spawns: (0,1), (0,3), (1,5)
    // P2 spawns: (6,1), (6,3), (5,1)
    (row == 0 && col == 1)
        || (row == 0 && col == 3)
        || (row == 1 && col == 5)
        || (row == 6 && col == 1)
        || (row == 6 && col == 3)
        || (row == 5 && col == 1)
}

/// Generates 6 random obstacle positions for a game.
/// Excludes spawn positions. Uses Poseidon hash for deterministic randomness.
pub fn generate_obstacles(
    game_id: u32, player1: ContractAddress, player2: ContractAddress, timestamp: u64,
) -> MapState {
    // Build list of candidate cells (all valid cells minus spawn positions)
    // Total valid cells: 6+7+8+7+8+7+6 = 49, minus 6 spawns = 43 candidates
    let mut candidates: Array<(u8, u8)> = array![];
    let mut row: u8 = 0;
    loop {
        if row > 6 {
            break;
        }
        let width = row_width(row);
        let mut col: u8 = 0;
        loop {
            if col >= width {
                break;
            }
            if !is_spawn(row, col) {
                candidates.append((row, col));
            }
            col += 1;
        };
        row += 1;
    };

    let seed = PoseidonTrait::new()
        .update(game_id.into())
        .update(player1.into())
        .update(player2.into())
        .update(timestamp.into())
        .finalize();

    // Select 6 obstacles using Fisher-Yates-like selection
    let mut remaining = candidates.len();
    let mut selected: Array<(u8, u8)> = array![];
    // We copy candidates into a mutable structure via spans and rebuilding
    // Since Cairo arrays are append-only, we use index selection with swap-remove logic
    let candidates_span = candidates.span();

    // Build a mutable index array
    let mut indices: Array<u32> = array![];
    let mut idx: u32 = 0;
    loop {
        if idx >= remaining {
            break;
        }
        indices.append(idx);
        idx += 1;
    };

    let mut i: felt252 = 0;
    loop {
        if selected.len() >= 6 {
            break;
        }
        let hash = PoseidonTrait::new().update(seed).update(i).finalize();
        // Convert hash to u256 for modulo
        let hash_u256: u256 = hash.into();
        let remaining_u256: u256 = remaining.into();
        let pick: u32 = (hash_u256 % remaining_u256).try_into().unwrap();

        // Get the index at position `pick`
        let actual_idx = *indices.span().at(pick);
        let (r, c) = *candidates_span.at(actual_idx);
        selected.append((r, c));

        // Swap-remove: replace picked index with last, shrink remaining
        remaining -= 1;
        // Rebuild indices without the picked element (swap with last)
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
        };
        indices = new_indices;

        i += 1;
    };

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

/// Computes hex distance between two cells using odd-r offset → cube coordinate conversion.
/// Uses a positive offset (100) to avoid unsigned underflow.
pub fn hex_distance(r1: u8, c1: u8, r2: u8, c2: u8) -> u8 {
    let offset: u16 = 100;

    let o1: u16 = ((r1 - (r1 % 2)) / 2).into();
    let o2: u16 = ((r2 - (r2 % 2)) / 2).into();

    let x1: u16 = offset + c1.into() - o1;
    let z1: u16 = offset + r1.into();
    let y1: u16 = 3 * offset - x1 - z1;

    let x2: u16 = offset + c2.into() - o2;
    let z2: u16 = offset + r2.into();
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
/// Player 1 spawns in top rows, Player 2 in bottom rows.
pub fn get_spawn_position(player_index: u8, beast_index: u8) -> (u8, u8) {
    if player_index == 1 {
        if beast_index == 0 {
            (0, 1)
        } else if beast_index == 1 {
            (0, 3)
        } else {
            (1, 5)
        }
    } else {
        if beast_index == 0 {
            (6, 1)
        } else if beast_index == 1 {
            (6, 3)
        } else {
            (5, 1)
        }
    }
}
