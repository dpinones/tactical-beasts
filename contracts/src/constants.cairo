#[inline]
pub fn NAMESPACE() -> ByteArray {
    "RPS"
}

pub const GAME_STATUS_WAITING: u8 = 0;
pub const GAME_STATUS_COMMITTING: u8 = 1;
pub const GAME_STATUS_REVEALING: u8 = 2;
pub const GAME_STATUS_FINISHED: u8 = 3;

pub const MOVE_NONE: u8 = 0;
pub const MOVE_ROCK: u8 = 1;
pub const MOVE_PAPER: u8 = 2;
pub const MOVE_SCISSORS: u8 = 3;

pub const DEFAULT_TIMEOUT: u64 = 600; // 10 minutes in seconds
