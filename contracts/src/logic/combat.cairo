use core::hash::HashStateTrait;
use core::poseidon::PoseidonTrait;
use crate::constants::MIN_DAMAGE;
use crate::utils::death_mountain_combat::{
    CombatSpec, calculate_damage as dm_calculate_damage, get_attack_hp, tier_from_u8, type_from_beast_type,
};

/// Builds a CombatSpec from beast attributes.
pub fn build_combat_spec(level: u16, tier: u8, beast_type: u8) -> CombatSpec {
    CombatSpec { tier: tier_from_u8(tier), item_type: type_from_beast_type(beast_type), level }
}

/// Calculates damage using death_mountain formula, then applies potion (+10%) and crit (×2).
pub fn calculate_damage(
    attacker_level: u16, attacker_tier: u8, attacker_type: u8, defender_type: u8, use_potion: bool, is_crit: bool,
) -> u16 {
    let attacker_spec = build_combat_spec(attacker_level, attacker_tier, attacker_type);
    let defender_spec = build_combat_spec(0, 5, defender_type);

    let base_damage: u32 = dm_calculate_damage(attacker_spec, defender_spec, MIN_DAMAGE).into();

    // Potion: +10%
    let with_potion: u32 = if use_potion {
        base_damage * 110 / 100
    } else {
        base_damage
    };

    // Crit: ×2
    let with_crit: u32 = if is_crit {
        with_potion * 2
    } else {
        with_potion
    };

    // Cap at u16 max
    if with_crit > 65535 {
        65535
    } else {
        with_crit.try_into().unwrap()
    }
}

/// Returns the attack power of a beast using death_mountain formula: level × (6 - tier)
pub fn get_attack_power(level: u16, tier: u8, beast_type: u8) -> u16 {
    get_attack_hp(build_combat_spec(level, tier, beast_type))
}

/// Pseudo-random crit roll. Returns true if crit succeeds.
/// luck = percentage chance (0-95), seed = deterministic hash input.
pub fn roll_crit(luck: u8, seed: felt252) -> bool {
    let hash = PoseidonTrait::new().update(seed).update('crit').finalize();
    let hash_u256: u256 = hash.into();
    let roll: u256 = hash_u256 % 100;
    roll < luck.into()
}

/// Applies offensive passive bonus to damage (percentage increase).
pub fn apply_passive_bonus(damage: u16, bonus_pct: u32) -> u16 {
    let d: u32 = damage.into();
    let result = d * (100 + bonus_pct) / 100;
    if result > 65535 {
        65535
    } else {
        result.try_into().unwrap()
    }
}

/// Applies defensive passive reduction to damage (percentage decrease).
pub fn apply_passive_reduction(damage: u16, reduction_pct: u32) -> u16 {
    let d: u32 = damage.into();
    let result = d * (100 - reduction_pct) / 100;
    if result < MIN_DAMAGE.into() {
        MIN_DAMAGE
    } else {
        result.try_into().unwrap()
    }
}
