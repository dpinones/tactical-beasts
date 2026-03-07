/// Combat logic copied from death_mountain_combat (Provable-Games/death-mountain, branch componentize).
/// Kept local to avoid version conflicts with other ecosystem dependencies.
/// Source: contracts/src/models/combat.cairo + contracts/src/constants/combat.cairo

// --- Enums ---

#[derive(Drop, Copy, PartialEq, Serde)]
pub enum WeaponEffectiveness {
    Weak,
    Fair,
    Strong,
}

#[derive(Copy, Drop, PartialEq, Serde)]
pub enum Type {
    None,
    Magic_or_Cloth,
    Blade_or_Hide,
    Bludgeon_or_Metal,
}

#[derive(Copy, Drop, PartialEq, Serde)]
pub enum Tier {
    None,
    T1,
    T2,
    T3,
    T4,
    T5,
}

// --- Constants ---

/// ELEMENTAL_DAMAGE_BONUS=2 means ±50% damage for type advantage/disadvantage
const ELEMENTAL_DAMAGE_BONUS: u16 = 2;

/// Tier damage multipliers: T1=5, T2=4, T3=3, T4=2, T5=1
/// Equivalent to level * (6 - tier_number)
mod TIER_DAMAGE_MULTIPLIER {
    pub const T1: u16 = 5;
    pub const T2: u16 = 4;
    pub const T3: u16 = 3;
    pub const T4: u16 = 2;
    pub const T5: u16 = 1;
}

// --- Structs ---

#[derive(Drop, Copy, Serde)]
pub struct CombatSpec {
    pub tier: Tier,
    pub item_type: Type,
    pub level: u16,
}

// --- Functions ---

/// Attack HP = level * tier_multiplier
pub fn get_attack_hp(weapon: CombatSpec) -> u16 {
    match weapon.tier {
        Tier::None => 0,
        Tier::T1 => weapon.level * TIER_DAMAGE_MULTIPLIER::T1,
        Tier::T2 => weapon.level * TIER_DAMAGE_MULTIPLIER::T2,
        Tier::T3 => weapon.level * TIER_DAMAGE_MULTIPLIER::T3,
        Tier::T4 => weapon.level * TIER_DAMAGE_MULTIPLIER::T4,
        Tier::T5 => weapon.level * TIER_DAMAGE_MULTIPLIER::T5,
    }
}

/// Elemental effectiveness: Magic > Bludgeon > Blade > Magic
pub fn get_elemental_effectiveness(weapon_type: Type, armor_type: Type) -> WeaponEffectiveness {
    match weapon_type {
        Type::None => WeaponEffectiveness::Fair,
        Type::Magic_or_Cloth => {
            match armor_type {
                Type::None => WeaponEffectiveness::Strong,
                Type::Magic_or_Cloth => WeaponEffectiveness::Fair,
                Type::Blade_or_Hide => WeaponEffectiveness::Weak,
                Type::Bludgeon_or_Metal => WeaponEffectiveness::Strong,
            }
        },
        Type::Blade_or_Hide => {
            match armor_type {
                Type::None => WeaponEffectiveness::Strong,
                Type::Magic_or_Cloth => WeaponEffectiveness::Strong,
                Type::Blade_or_Hide => WeaponEffectiveness::Fair,
                Type::Bludgeon_or_Metal => WeaponEffectiveness::Weak,
            }
        },
        Type::Bludgeon_or_Metal => {
            match armor_type {
                Type::None => WeaponEffectiveness::Strong,
                Type::Magic_or_Cloth => WeaponEffectiveness::Weak,
                Type::Blade_or_Hide => WeaponEffectiveness::Strong,
                Type::Bludgeon_or_Metal => WeaponEffectiveness::Fair,
            }
        },
    }
}

/// Adjusts damage based on elemental type matchup (±50% with ELEMENTAL_DAMAGE_BONUS=2)
pub fn elemental_adjusted_damage(damage: u16, weapon_type: Type, armor_type: Type) -> u16 {
    let elemental_effect = damage / ELEMENTAL_DAMAGE_BONUS;
    let effectiveness = get_elemental_effectiveness(weapon_type, armor_type);
    match effectiveness {
        WeaponEffectiveness::Weak => damage - elemental_effect,
        WeaponEffectiveness::Fair => damage,
        WeaponEffectiveness::Strong => damage + elemental_effect,
    }
}

/// Simplified calculate_damage for tactical-beasts (no strength, no specials, no armor).
/// Applies: base attack → elemental adjustment → minimum damage floor.
pub fn calculate_damage(attacker: CombatSpec, defender: CombatSpec, minimum_damage: u16) -> u16 {
    let base_attack = get_attack_hp(attacker);
    let adjusted = elemental_adjusted_damage(base_attack, attacker.item_type, defender.item_type);
    if adjusted < minimum_damage {
        minimum_damage
    } else {
        adjusted
    }
}

// --- Conversion helpers ---

/// Convert a u8 tier number (1-5) to a Tier enum
pub fn tier_from_u8(tier: u8) -> Tier {
    match tier {
        1 => Tier::T1,
        2 => Tier::T2,
        3 => Tier::T3,
        4 => Tier::T4,
        5 => Tier::T5,
        _ => Tier::None,
    }
}

/// Convert a u8 beast type (0=Magical, 1=Hunter, 2=Brute) to death_mountain Type enum.
/// Mapping: Magical→Magic_or_Cloth, Hunter→Blade_or_Hide, Brute→Bludgeon_or_Metal
pub fn type_from_beast_type(beast_type: u8) -> Type {
    match beast_type {
        0 => Type::Magic_or_Cloth,
        1 => Type::Blade_or_Hide,
        2 => Type::Bludgeon_or_Metal,
        _ => Type::None,
    }
}
