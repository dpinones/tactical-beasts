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

/// Checks if a cell is one of the 6 fixed obstacles.
pub fn is_obstacle(row: u8, col: u8) -> bool {
    (row == 2 && col == 2)
        || (row == 2 && col == 5)
        || (row == 3 && col == 1)
        || (row == 3 && col == 5)
        || (row == 4 && col == 2)
        || (row == 4 && col == 5)
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
