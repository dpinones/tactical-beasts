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
