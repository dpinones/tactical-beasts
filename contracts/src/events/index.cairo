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
pub struct GameFinished {
    #[key]
    pub game_id: u32,
    pub winner: ContractAddress,
    pub rounds: u16,
    pub time: u64,
}
