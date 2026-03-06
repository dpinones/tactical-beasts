use crate::constants::{
    DEFAULT_ATTACK_RANGE, DEFAULT_HP, DEFAULT_LEVEL, DEFAULT_LUCK, DEFAULT_MOVE_RANGE, DEFAULT_TIER, TYPE_BRUTE,
    TYPE_HUNTER, TYPE_MAGICAL,
};

/// Derives beast type from beast ID using Loot Survivor ranges:
/// 1-25: Magical, 26-50: Hunter, 51-75: Brute
pub fn get_beast_type(beast_id: u32) -> u8 {
    if beast_id == 0 {
        TYPE_BRUTE
    } else if beast_id <= 25 {
        TYPE_MAGICAL
    } else if beast_id <= 50 {
        TYPE_HUNTER
    } else if beast_id <= 75 {
        TYPE_BRUTE
    } else {
        // Fallback for IDs outside standard range
        let remainder = beast_id % 3;
        if remainder == 0 {
            TYPE_BRUTE
        } else if remainder == 1 {
            TYPE_MAGICAL
        } else {
            TYPE_HUNTER
        }
    }
}

// All configurable functions below return fixed defaults in MVP.
// They exist as extension points for future versions.

pub fn get_beast_level(_beast_id: u32) -> u16 {
    DEFAULT_LEVEL
}

pub fn get_beast_tier(_beast_id: u32) -> u8 {
    DEFAULT_TIER
}

pub fn get_beast_hp(_beast_id: u32) -> u16 {
    DEFAULT_HP
}

pub fn get_luck(_beast_id: u32) -> u8 {
    DEFAULT_LUCK
}

pub fn get_move_range(_beast_id: u32) -> u8 {
    DEFAULT_MOVE_RANGE
}

pub fn get_attack_range(_beast_id: u32) -> u8 {
    DEFAULT_ATTACK_RANGE
}
