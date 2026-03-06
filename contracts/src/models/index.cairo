use starknet::ContractAddress;

#[derive(Copy, Drop, Serde)]
#[dojo::model]
pub struct Game {
    #[key]
    pub game_id: u32,
    pub player1: ContractAddress,
    pub player2: ContractAddress,
    pub status: u8,
    pub winner: ContractAddress,
    pub player1_move: u8,
    pub player2_move: u8,
    pub committed_at: u64,
}

#[derive(Copy, Drop, Serde)]
#[dojo::model]
pub struct PlayerCommit {
    #[key]
    pub game_id: u32,
    #[key]
    pub player: ContractAddress,
    pub commitment: felt252,
    pub revealed: bool,
}

#[derive(Copy, Drop, Serde)]
#[dojo::model]
pub struct GameConfig {
    #[key]
    pub id: felt252,
    pub game_count: u32,
    pub timeout_duration: u64,
}
