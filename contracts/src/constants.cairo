#[inline]
pub fn NAMESPACE() -> ByteArray {
    "TB1"
}

// Game status
pub const GAME_STATUS_WAITING: u8 = 0;
pub const GAME_STATUS_PLAYING: u8 = 1;
pub const GAME_STATUS_FINISHED: u8 = 2;

// Action types
pub const ACTION_WAIT: u8 = 0;
pub const ACTION_MOVE: u8 = 1;
pub const ACTION_ATTACK: u8 = 2;
pub const ACTION_CONSUMABLE_ATTACK: u8 = 3;

// Beast types
pub const TYPE_MAGICAL: u8 = 0;
pub const TYPE_HUNTER: u8 = 1;
pub const TYPE_BRUTE: u8 = 2;

// Type advantage results
pub const ADVANTAGE: u8 = 0;
pub const DISADVANTAGE: u8 = 1;
pub const NEUTRAL: u8 = 2;

// Grid
pub const GRID_ROWS: u8 = 7;
pub const BEASTS_PER_PLAYER: u8 = 3;

// EGS
pub const LEADERBOARD_ID: felt252 = 1;
pub const MAX_ROUNDS: u16 = 50;
pub const WIN_BONUS: u64 = 100;

// Collection
#[inline]
pub fn COLLECTION_NAME() -> ByteArray {
    "Tactical Beasts"
}

#[inline]
pub fn COLLECTION_SYMBOL() -> ByteArray {
    "TBST"
}

#[inline]
pub fn COLLECTION_DESCRIPTION() -> ByteArray {
    "Tactical Beasts - Tactical turn-based grid combat game on Starknet"
}

#[inline]
pub fn COLLECTION_IMAGE() -> ByteArray {
    ""
}

#[inline]
pub fn COLLECTION_BANNER() -> ByteArray {
    ""
}

#[inline]
pub fn COLLECTION_URL() -> ByteArray {
    ""
}

// Achievement task identifiers
pub const TASK_WINNER: felt252 = 'WINNER';
pub const TASK_FLAWLESS: felt252 = 'FLAWLESS';

// Combat defaults
pub const DEFAULT_LEVEL: u16 = 5;
pub const DEFAULT_TIER: u8 = 3;
pub const DEFAULT_HP: u16 = 100;
pub const DEFAULT_EXTRA_LIVES: u8 = 1;
pub const DEFAULT_LUCK: u8 = 10;
pub const DEFAULT_MOVE_RANGE: u8 = 2;
pub const DEFAULT_ATTACK_RANGE: u8 = 1;
pub const MIN_DAMAGE: u16 = 2;
