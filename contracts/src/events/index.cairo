use starknet::ContractAddress;

#[derive(Copy, Drop, Serde)]
#[dojo::event]
pub struct GameCreated {
    #[key]
    pub game_id: u32,
    pub player1: ContractAddress,
    pub time: u64,
}

#[derive(Copy, Drop, Serde)]
#[dojo::event]
pub struct PlayerJoined {
    #[key]
    pub game_id: u32,
    pub player2: ContractAddress,
    pub time: u64,
}

#[derive(Copy, Drop, Serde)]
#[dojo::event]
pub struct MoveCommitted {
    #[key]
    pub game_id: u32,
    pub player: ContractAddress,
    pub time: u64,
}

#[derive(Copy, Drop, Serde)]
#[dojo::event]
pub struct MoveRevealed {
    #[key]
    pub game_id: u32,
    pub player: ContractAddress,
    pub move_value: u8,
    pub time: u64,
}

#[derive(Copy, Drop, Serde)]
#[dojo::event]
pub struct GameFinished {
    #[key]
    pub game_id: u32,
    pub winner: ContractAddress,
    pub player1_move: u8,
    pub player2_move: u8,
    pub time: u64,
}
