use starknet::ContractAddress;

#[derive(Copy, Drop, Serde)]
#[dojo::model]
pub struct Game {
    #[key]
    pub game_id: u32,
    pub player1: ContractAddress,
    pub player2: ContractAddress,
    pub status: u8,
    pub current_attacker: u8,
    pub round: u16,
    pub winner: ContractAddress,
    pub p1_team_set: bool,
    pub p2_team_set: bool,
}

#[derive(Copy, Drop, Serde)]
#[dojo::model]
pub struct BeastState {
    #[key]
    pub game_id: u32,
    #[key]
    pub player_index: u8,
    #[key]
    pub beast_index: u8,
    pub beast_id: u32,
    pub beast_type: u8,
    pub tier: u8,
    pub level: u16,
    pub hp: u16,
    pub hp_max: u16,
    pub extra_lives: u8,
    pub position_row: u8,
    pub position_col: u8,
    pub alive: bool,
}

#[derive(Copy, Drop, Serde)]
#[dojo::model]
pub struct PlayerState {
    #[key]
    pub game_id: u32,
    #[key]
    pub player: ContractAddress,
    pub player_index: u8,
    pub beast_1: u32,
    pub beast_2: u32,
    pub beast_3: u32,
    pub potion_used: bool,
}

#[derive(Copy, Drop, Serde)]
#[dojo::model]
pub struct GameConfig {
    #[key]
    pub id: felt252,
    pub game_count: u32,
    pub token_count: u64,
}

#[derive(Copy, Drop, Serde)]
#[dojo::model]
pub struct GameToken {
    #[key]
    pub token_id: u64,
    pub match_id: u32,
    pub player: ContractAddress,
}

#[derive(Copy, Drop, Serde)]
#[dojo::model]
pub struct GameTokens {
    #[key]
    pub match_id: u32,
    pub p1_token_id: u64,
    pub p2_token_id: u64,
}

#[derive(Copy, Drop, Serde)]
#[dojo::model]
pub struct MatchmakingQueue {
    #[key]
    pub id: felt252,
    pub waiting_player: ContractAddress,
    pub waiting_game_id: u32,
}
