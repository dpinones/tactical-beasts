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

// Grid — 7 horizontal rows, width per row: [6, 7, 8, 7, 8, 7, 6]
// col = row index (0..6 top-to-bottom), row = position within that row (0..width-1)
pub const GRID_NUM_ROWS: u8 = 7;
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

// Valid tier range (T1 and T5 are excluded from tactical combat)
pub const MIN_TIER: u8 = 2;
pub const MAX_TIER: u8 = 4;

// Subclasses (2 per type)
pub const SUBCLASS_WARLOCK: u8 = 0; // Magic glass cannon: mov 1, low HP, high dmg, range 3
pub const SUBCLASS_ENCHANTER: u8 = 1; // Magic balanced: mov 1, med HP, med dmg, range 2
pub const SUBCLASS_STALKER: u8 = 2; // Hunter assassin: mov 2, low HP, high dmg, melee
pub const SUBCLASS_RANGER: u8 = 3; // Hunter sniper: mov 1, med HP, med dmg, range 4
pub const SUBCLASS_JUGGERNAUT: u8 = 4; // Brute tank: mov 1, very high HP, low dmg, melee
pub const SUBCLASS_BERSERKER: u8 = 5; // Brute bruiser: mov 1, high HP, high dmg, melee

// Combat defaults
pub const DEFAULT_LEVEL: u16 = 5;
pub const DEFAULT_TIER: u8 = 3;
pub const DEFAULT_HP: u16 = 100;
pub const DEFAULT_EXTRA_LIVES: u8 = 1;
pub const DEFAULT_LUCK: u8 = 10;
pub const DEFAULT_MOVE_RANGE: u8 = 2;
pub const DEFAULT_ATTACK_RANGE: u8 = 1;
pub const MIN_DAMAGE: u16 = 2;

// Default beast token IDs start at this threshold (fictional, not real NFTs)
pub const DEFAULT_BEAST_TOKEN_MIN: u32 = 100000;

// Chain IDs
pub const MAINNET_CHAIN_ID: felt252 = 0x534e5f4d41494e;

// Beast NFT contract address (mainnet)
pub const BEAST_NFT_ADDRESS: felt252 = 0x046da8955829adf2bda310099a0063451923f02e648cf25a1203aac6335cf0e4;
