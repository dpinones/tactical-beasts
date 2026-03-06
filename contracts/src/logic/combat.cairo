use core::hash::HashStateTrait;
use core::poseidon::PoseidonTrait;
use crate::constants::{ADVANTAGE, DISADVANTAGE, MIN_DAMAGE, NEUTRAL, TYPE_BRUTE, TYPE_HUNTER, TYPE_MAGICAL};

/// Returns type advantage: Brute > Hunter > Magical > Brute
pub fn get_type_advantage(attacker_type: u8, defender_type: u8) -> u8 {
    if attacker_type == defender_type {
        NEUTRAL
    } else if (attacker_type == TYPE_BRUTE && defender_type == TYPE_HUNTER)
        || (attacker_type == TYPE_HUNTER && defender_type == TYPE_MAGICAL)
        || (attacker_type == TYPE_MAGICAL && defender_type == TYPE_BRUTE) {
        ADVANTAGE
    } else {
        DISADVANTAGE
    }
}

/// Calculates damage using the Death Mountain formula:
/// Base = level * (6 - tier), then apply type advantage, potion, and crit modifiers.
pub fn calculate_damage(
    attacker_level: u16, attacker_tier: u8, attacker_type: u8, defender_type: u8, use_potion: bool, is_crit: bool,
) -> u16 {
    // Base power
    let tier_mult: u32 = 6 - attacker_tier.into();
    let base_power: u32 = attacker_level.into() * tier_mult;

    // Type advantage: +50% / -50%
    let advantage = get_type_advantage(attacker_type, defender_type);
    let adjusted: u32 = if advantage == ADVANTAGE {
        base_power * 150 / 100
    } else if advantage == DISADVANTAGE {
        base_power * 50 / 100
    } else {
        base_power
    };

    // Potion: +10%
    let with_potion: u32 = if use_potion {
        adjusted * 110 / 100
    } else {
        adjusted
    };

    // Crit: x2
    let with_crit: u32 = if is_crit {
        with_potion * 2
    } else {
        with_potion
    };

    // Ensure minimum damage
    let damage: u16 = if with_crit > 65535 {
        65535
    } else {
        with_crit.try_into().unwrap()
    };
    if damage < MIN_DAMAGE {
        MIN_DAMAGE
    } else {
        damage
    }
}

/// Pseudo-random crit roll. Returns true if crit succeeds.
/// luck = percentage chance (0-95), seed = deterministic hash input.
pub fn roll_crit(luck: u8, seed: felt252) -> bool {
    let hash = PoseidonTrait::new().update(seed).update('crit').finalize();
    let hash_u256: u256 = hash.into();
    let roll: u256 = hash_u256 % 100;
    roll < luck.into()
}
