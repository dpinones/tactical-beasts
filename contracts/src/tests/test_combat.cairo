use crate::constants::{ADVANTAGE, DISADVANTAGE, MIN_DAMAGE, NEUTRAL, TYPE_BRUTE, TYPE_HUNTER, TYPE_MAGICAL};
use crate::logic::{beast, board, combat};

// --- Type advantage ---

#[test]
fn test_brute_beats_hunter() {
    assert!(combat::get_type_advantage(TYPE_BRUTE, TYPE_HUNTER) == ADVANTAGE);
}

#[test]
fn test_hunter_beats_magical() {
    assert!(combat::get_type_advantage(TYPE_HUNTER, TYPE_MAGICAL) == ADVANTAGE);
}

#[test]
fn test_magical_beats_brute() {
    assert!(combat::get_type_advantage(TYPE_MAGICAL, TYPE_BRUTE) == ADVANTAGE);
}

#[test]
fn test_same_type_neutral() {
    assert!(combat::get_type_advantage(TYPE_BRUTE, TYPE_BRUTE) == NEUTRAL);
    assert!(combat::get_type_advantage(TYPE_HUNTER, TYPE_HUNTER) == NEUTRAL);
    assert!(combat::get_type_advantage(TYPE_MAGICAL, TYPE_MAGICAL) == NEUTRAL);
}

#[test]
fn test_disadvantage() {
    assert!(combat::get_type_advantage(TYPE_HUNTER, TYPE_BRUTE) == DISADVANTAGE);
    assert!(combat::get_type_advantage(TYPE_MAGICAL, TYPE_HUNTER) == DISADVANTAGE);
    assert!(combat::get_type_advantage(TYPE_BRUTE, TYPE_MAGICAL) == DISADVANTAGE);
}

// --- Damage calculation ---

#[test]
fn test_base_damage_neutral() {
    // level=5, tier=3 → base = 5 * (6-3) = 15
    let dmg = combat::calculate_damage(5, 3, TYPE_BRUTE, TYPE_BRUTE, false, false);
    assert!(dmg == 15, "Expected 15, got {}", dmg);
}

#[test]
fn test_damage_with_advantage() {
    // base=15, advantage → 15 * 150 / 100 = 22
    let dmg = combat::calculate_damage(5, 3, TYPE_BRUTE, TYPE_HUNTER, false, false);
    assert!(dmg == 22, "Expected 22, got {}", dmg);
}

#[test]
fn test_damage_with_disadvantage() {
    // base=15, disadvantage → 15 * 50 / 100 = 7
    let dmg = combat::calculate_damage(5, 3, TYPE_HUNTER, TYPE_BRUTE, false, false);
    assert!(dmg == 7, "Expected 7, got {}", dmg);
}

#[test]
fn test_damage_with_potion() {
    // base=15, neutral, potion → 15 * 110 / 100 = 16
    let dmg = combat::calculate_damage(5, 3, TYPE_BRUTE, TYPE_BRUTE, true, false);
    assert!(dmg == 16, "Expected 16, got {}", dmg);
}

#[test]
fn test_damage_with_crit() {
    // base=15, neutral, crit → 15 * 2 = 30
    let dmg = combat::calculate_damage(5, 3, TYPE_BRUTE, TYPE_BRUTE, false, true);
    assert!(dmg == 30, "Expected 30, got {}", dmg);
}

#[test]
fn test_min_damage_floor() {
    // level=1, tier=5 → base = 1 * (6-5) = 1, disadvantage → 0 → clamped to MIN_DAMAGE
    let dmg = combat::calculate_damage(1, 5, TYPE_HUNTER, TYPE_BRUTE, false, false);
    assert!(dmg == MIN_DAMAGE, "Expected min damage {}, got {}", MIN_DAMAGE, dmg);
}

// --- Beast type derivation ---

#[test]
fn test_beast_type_ranges() {
    assert!(beast::get_beast_type(1) == TYPE_MAGICAL);
    assert!(beast::get_beast_type(25) == TYPE_MAGICAL);
    assert!(beast::get_beast_type(26) == TYPE_HUNTER);
    assert!(beast::get_beast_type(50) == TYPE_HUNTER);
    assert!(beast::get_beast_type(51) == TYPE_BRUTE);
    assert!(beast::get_beast_type(75) == TYPE_BRUTE);
}

// --- Board / hex distance ---

#[test]
fn test_hex_distance_same_cell() {
    assert!(board::hex_distance(0, 0, 0, 0) == 0);
}

#[test]
fn test_hex_distance_adjacent() {
    // (0,1) to (1,1) should be 1 step on hex grid
    assert!(board::hex_distance(0, 1, 1, 1) == 1);
}

#[test]
fn test_hex_distance_across_board() {
    // (0,1) to (6,1) — top to bottom
    let dist = board::hex_distance(0, 1, 6, 1);
    assert!(dist == 6, "Expected 6, got {}", dist);
}

#[test]
fn test_valid_cells() {
    assert!(board::is_valid_cell(0, 0));
    assert!(board::is_valid_cell(0, 5));
    assert!(!board::is_valid_cell(0, 6)); // row 0 has width 6
    assert!(board::is_valid_cell(2, 7)); // row 2 has width 8
    assert!(!board::is_valid_cell(2, 8));
    assert!(!board::is_valid_cell(7, 0)); // row 7 doesn't exist
}

#[test]
fn test_obstacles() {
    assert!(board::is_obstacle(2, 2));
    assert!(board::is_obstacle(2, 5));
    assert!(board::is_obstacle(3, 1));
    assert!(board::is_obstacle(3, 5));
    assert!(board::is_obstacle(4, 2));
    assert!(board::is_obstacle(4, 5));
    assert!(!board::is_obstacle(0, 0));
    assert!(!board::is_obstacle(3, 3));
}

#[test]
fn test_spawn_positions_valid() {
    // All spawn positions should be valid cells and not obstacles
    let mut player: u8 = 1;
    loop {
        if player > 2 {
            break;
        }
        let mut i: u8 = 0;
        loop {
            if i >= 3 {
                break;
            }
            let (row, col) = board::get_spawn_position(player, i);
            assert!(board::is_valid_cell(row, col), "Spawn ({},{}) invalid", row, col);
            assert!(!board::is_obstacle(row, col), "Spawn ({},{}) is obstacle", row, col);
            i += 1;
        }
        player += 1;
    };
}
