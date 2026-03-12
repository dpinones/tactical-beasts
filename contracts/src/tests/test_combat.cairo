use crate::constants::{MIN_DAMAGE, TYPE_BRUTE, TYPE_HUNTER, TYPE_MAGICAL};
use crate::logic::{beast, board, combat};
use crate::models::index::MapState;
use crate::utils::death_mountain_combat::{WeaponEffectiveness, get_elemental_effectiveness, type_from_beast_type};

// --- Type advantage (via death_mountain elemental effectiveness) ---

#[test]
fn test_brute_beats_hunter() {
    // Bludgeon_or_Metal is Strong against Blade_or_Hide
    let eff = get_elemental_effectiveness(type_from_beast_type(TYPE_BRUTE), type_from_beast_type(TYPE_HUNTER));
    assert!(eff == WeaponEffectiveness::Strong);
}

#[test]
fn test_hunter_beats_magical() {
    // Blade_or_Hide is Strong against Magic_or_Cloth
    let eff = get_elemental_effectiveness(type_from_beast_type(TYPE_HUNTER), type_from_beast_type(TYPE_MAGICAL));
    assert!(eff == WeaponEffectiveness::Strong);
}

#[test]
fn test_magical_beats_brute() {
    // Magic_or_Cloth is Strong against Bludgeon_or_Metal
    let eff = get_elemental_effectiveness(type_from_beast_type(TYPE_MAGICAL), type_from_beast_type(TYPE_BRUTE));
    assert!(eff == WeaponEffectiveness::Strong);
}

#[test]
fn test_same_type_fair() {
    let eff_b = get_elemental_effectiveness(type_from_beast_type(TYPE_BRUTE), type_from_beast_type(TYPE_BRUTE));
    let eff_h = get_elemental_effectiveness(type_from_beast_type(TYPE_HUNTER), type_from_beast_type(TYPE_HUNTER));
    let eff_m = get_elemental_effectiveness(type_from_beast_type(TYPE_MAGICAL), type_from_beast_type(TYPE_MAGICAL));
    assert!(eff_b == WeaponEffectiveness::Fair);
    assert!(eff_h == WeaponEffectiveness::Fair);
    assert!(eff_m == WeaponEffectiveness::Fair);
}

#[test]
fn test_weakness() {
    let eff1 = get_elemental_effectiveness(type_from_beast_type(TYPE_HUNTER), type_from_beast_type(TYPE_BRUTE));
    let eff2 = get_elemental_effectiveness(type_from_beast_type(TYPE_MAGICAL), type_from_beast_type(TYPE_HUNTER));
    let eff3 = get_elemental_effectiveness(type_from_beast_type(TYPE_BRUTE), type_from_beast_type(TYPE_MAGICAL));
    assert!(eff1 == WeaponEffectiveness::Weak);
    assert!(eff2 == WeaponEffectiveness::Weak);
    assert!(eff3 == WeaponEffectiveness::Weak);
}

// --- Damage calculation ---

#[test]
fn test_base_damage_neutral() {
    // level=5, tier=3 → base = 5 * 3 = 15, same type → no adjustment
    let dmg = combat::calculate_damage(5, 3, TYPE_BRUTE, TYPE_BRUTE, false, false);
    assert!(dmg == 15, "Expected 15, got {}", dmg);
}

#[test]
fn test_damage_with_advantage() {
    // base=15, strong → 15 + 15/2 = 22
    let dmg = combat::calculate_damage(5, 3, TYPE_BRUTE, TYPE_HUNTER, false, false);
    assert!(dmg == 22, "Expected 22, got {}", dmg);
}

#[test]
fn test_damage_with_disadvantage() {
    // base=15, weak → 15 - 15/2 = 8 (integer division: 15/2=7, 15-7=8)
    let dmg = combat::calculate_damage(5, 3, TYPE_HUNTER, TYPE_BRUTE, false, false);
    assert!(dmg == 8, "Expected 8, got {}", dmg);
}

#[test]
fn test_damage_with_potion() {
    // base=15, fair, potion → 15 * 110 / 100 = 16
    let dmg = combat::calculate_damage(5, 3, TYPE_BRUTE, TYPE_BRUTE, true, false);
    assert!(dmg == 16, "Expected 16, got {}", dmg);
}

#[test]
fn test_damage_with_crit() {
    // base=15, fair, crit → 15 * 2 = 30
    let dmg = combat::calculate_damage(5, 3, TYPE_BRUTE, TYPE_BRUTE, false, true);
    assert!(dmg == 30, "Expected 30, got {}", dmg);
}

#[test]
fn test_min_damage_floor() {
    // level=1, tier=5 → base = 1 * 1 = 1, weak → 1 - 0 = 1 → clamped to MIN_DAMAGE
    let dmg = combat::calculate_damage(1, 5, TYPE_HUNTER, TYPE_BRUTE, false, false);
    assert!(dmg == MIN_DAMAGE, "Expected min damage {}, got {}", MIN_DAMAGE, dmg);
}

#[test]
fn test_get_attack_power() {
    // level=5, tier=3 → 5 * 3 = 15
    let power = combat::get_attack_power(5, 3, TYPE_BRUTE);
    assert!(power == 15, "Expected 15, got {}", power);

    // level=10, tier=1 → 10 * 5 = 50
    let power_t1 = combat::get_attack_power(10, 1, TYPE_MAGICAL);
    assert!(power_t1 == 50, "Expected 50, got {}", power_t1);
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
    assert!(board::is_valid_cell(5, 0));
    assert!(!board::is_valid_cell(6, 0)); // col 0 has width 6
    assert!(board::is_valid_cell(7, 2)); // col 2 has width 8
    assert!(!board::is_valid_cell(8, 2));
    assert!(!board::is_valid_cell(0, 7)); // col 7 doesn't exist
}

#[test]
fn test_obstacles_in_map() {
    let map_state = MapState {
        game_id: 1,
        obstacle_1_row: 2,
        obstacle_1_col: 2,
        obstacle_2_row: 2,
        obstacle_2_col: 5,
        obstacle_3_row: 3,
        obstacle_3_col: 1,
        obstacle_4_row: 3,
        obstacle_4_col: 5,
        obstacle_5_row: 4,
        obstacle_5_col: 2,
        obstacle_6_row: 4,
        obstacle_6_col: 5,
    };
    assert!(board::is_obstacle_in_map(map_state, 2, 2));
    assert!(board::is_obstacle_in_map(map_state, 2, 5));
    assert!(board::is_obstacle_in_map(map_state, 3, 1));
    assert!(board::is_obstacle_in_map(map_state, 3, 5));
    assert!(board::is_obstacle_in_map(map_state, 4, 2));
    assert!(board::is_obstacle_in_map(map_state, 4, 5));
    assert!(!board::is_obstacle_in_map(map_state, 0, 0));
    assert!(!board::is_obstacle_in_map(map_state, 3, 3));
}

// =====================================================
// Shared test cases (mirrored in frontend hexGrid.test.ts)
// =====================================================

// --- hex_distance parity tests ---

#[test]
fn test_hex_distance_same_row_adjacent() {
    // (2,3) to (3,3) — same col, adjacent row positions
    let dist = board::hex_distance(2, 3, 3, 3);
    assert!(dist == 1, "Expected 1, got {}", dist);
}

#[test]
fn test_hex_distance_diagonal_step() {
    // (0,0) to (0,1) — top-left corner to next col
    let dist = board::hex_distance(0, 0, 0, 1);
    assert!(dist == 1, "Expected 1, got {}", dist);
}

#[test]
fn test_hex_distance_wide_to_narrow_row() {
    // (4,2) col2 width=8 to (3,3) col3 width=7
    let dist = board::hex_distance(4, 2, 3, 3);
    assert!(dist == 1, "Expected 1, got {}", dist);
}

#[test]
fn test_hex_distance_corner_to_corner() {
    // (0,0) top-left to (5,6) bottom-right
    let dist = board::hex_distance(0, 0, 5, 6);
    assert!(dist == 8, "Expected 8, got {}", dist);
}

#[test]
fn test_hex_distance_p1_spawn_to_p2_spawn() {
    // P1 spawn (0,1) to P2 spawn (6,1) — straight across
    let dist = board::hex_distance(0, 1, 6, 1);
    assert!(dist == 6, "Expected 6, got {}", dist);
}

#[test]
fn test_hex_distance_center_cell_distances() {
    // From center-ish cell (4,3) to various positions
    // Adjacent
    assert!(board::hex_distance(4, 3, 3, 3) == 1);
    assert!(board::hex_distance(4, 3, 5, 3) == 1);
    assert!(board::hex_distance(4, 3, 4, 2) == 1);
    assert!(board::hex_distance(4, 3, 4, 4) == 1);
    // 2 steps
    assert!(board::hex_distance(4, 3, 2, 3) == 2);
    // Symmetry
    assert!(board::hex_distance(4, 3, 2, 1) == board::hex_distance(2, 1, 4, 3));
}

#[test]
fn test_hex_distance_narrow_row_col0() {
    // col0 has width 6, col6 has width 6, both have centering_offset = 1
    // (0,0) to (0,6) — both narrowest rows, first position
    let dist = board::hex_distance(0, 0, 0, 6);
    assert!(dist == 6, "Expected 6, got {}", dist);
}

#[test]
fn test_hex_distance_symmetry_batch() {
    // Verify distance(a,b) == distance(b,a) for many pairs
    assert!(board::hex_distance(0, 0, 5, 4) == board::hex_distance(5, 4, 0, 0));
    assert!(board::hex_distance(1, 1, 6, 5) == board::hex_distance(6, 5, 1, 1));
    assert!(board::hex_distance(3, 2, 5, 6) == board::hex_distance(5, 6, 3, 2));
    assert!(board::hex_distance(0, 3, 7, 4) == board::hex_distance(7, 4, 0, 3));
}

#[test]
fn test_hex_distance_range_2() {
    // (0,1) P1 spawn — cells at exactly distance 2
    assert!(board::hex_distance(0, 1, 2, 1) == 2);
    assert!(board::hex_distance(0, 1, 1, 3) == 2);
    assert!(board::hex_distance(0, 1, 0, 3) == 2);
}

#[test]
fn test_hex_distance_range_3() {
    // From (0,1) — cells at exactly distance 3
    assert!(board::hex_distance(0, 1, 3, 1) == 3);
    assert!(board::hex_distance(0, 1, 0, 4) == 3);
}

// --- Obstacle + movement validation tests ---

#[test]
fn test_obstacle_blocks_movement_destination() {
    // Obstacle at (3,3) — even though distance is 1 from (2,3), can't move there
    let map_state = MapState {
        game_id: 99,
        obstacle_1_row: 3,
        obstacle_1_col: 3,
        obstacle_2_row: 0,
        obstacle_2_col: 0,
        obstacle_3_row: 0,
        obstacle_3_col: 0,
        obstacle_4_row: 0,
        obstacle_4_col: 0,
        obstacle_5_row: 0,
        obstacle_5_col: 0,
        obstacle_6_row: 0,
        obstacle_6_col: 0,
    };
    // Can reach (3,3) distance-wise from (2,3)
    assert!(board::hex_distance(2, 3, 3, 3) == 1);
    // But it's an obstacle
    assert!(board::is_obstacle_in_map(map_state, 3, 3));
    // Adjacent cell is not an obstacle
    assert!(!board::is_obstacle_in_map(map_state, 2, 3));
}

#[test]
fn test_obstacle_does_not_block_attack_range() {
    // Obstacle between attacker and target doesn't block attacks
    // Attacker at (2,3), obstacle at (3,3), target at (4,3)
    // Distance from attacker to target = 2 (range-based, no pathfinding)
    let dist = board::hex_distance(2, 3, 4, 3);
    assert!(dist == 2, "Expected 2, got {}", dist);
    // A range-2 attacker can still hit (4,3) even with obstacle at (3,3)
}

#[test]
fn test_multiple_obstacles_ring() {
    // Ring of obstacles around (3,3): all adjacent cells
    let map_state = MapState {
        game_id: 99,
        obstacle_1_row: 2,
        obstacle_1_col: 3,
        obstacle_2_row: 4,
        obstacle_2_col: 3,
        obstacle_3_row: 3,
        obstacle_3_col: 2,
        obstacle_4_row: 3,
        obstacle_4_col: 4,
        obstacle_5_row: 2,
        obstacle_5_col: 2,
        obstacle_6_row: 2,
        obstacle_6_col: 4,
    };
    // Center cell (3,3) is NOT an obstacle itself
    assert!(!board::is_obstacle_in_map(map_state, 3, 3));
    // All 6 surrounding obstacles exist
    assert!(board::is_obstacle_in_map(map_state, 2, 3));
    assert!(board::is_obstacle_in_map(map_state, 4, 3));
    assert!(board::is_obstacle_in_map(map_state, 3, 2));
    assert!(board::is_obstacle_in_map(map_state, 3, 4));
    assert!(board::is_obstacle_in_map(map_state, 2, 2));
    assert!(board::is_obstacle_in_map(map_state, 2, 4));
}

#[test]
fn test_valid_cells_all_corners() {
    // All 4 corners of the grid are valid
    assert!(board::is_valid_cell(0, 0)); // top-left
    assert!(board::is_valid_cell(5, 0)); // top-right (col0 width=6)
    assert!(board::is_valid_cell(0, 6)); // bottom-left
    assert!(board::is_valid_cell(5, 6)); // bottom-right (col6 width=6)
    // Just outside corners are invalid
    assert!(!board::is_valid_cell(6, 0));
    assert!(!board::is_valid_cell(6, 6));
}

#[test]
fn test_obstacle_at_spawn_does_not_crash() {
    // Edge case: obstacle placed at a spawn position (shouldn't happen but shouldn't crash)
    let map_state = MapState {
        game_id: 99,
        obstacle_1_row: 0,
        obstacle_1_col: 1,
        obstacle_2_row: 0,
        obstacle_2_col: 0,
        obstacle_3_row: 0,
        obstacle_3_col: 0,
        obstacle_4_row: 0,
        obstacle_4_col: 0,
        obstacle_5_row: 0,
        obstacle_5_col: 0,
        obstacle_6_row: 0,
        obstacle_6_col: 0,
    };
    assert!(board::is_obstacle_in_map(map_state, 0, 1));
}

#[test]
fn test_spawn_positions_valid() {
    // All spawn positions should be valid cells
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
            i += 1;
        }
        player += 1;
    };
}
