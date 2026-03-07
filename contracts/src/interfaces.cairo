use starknet::ContractAddress;

// Local replica of beasts_nft::pack::PackableBeast (same Serde layout)
#[derive(Drop, Copy, Serde)]
pub struct PackableBeast {
    pub id: u8,
    pub prefix: u8,
    pub suffix: u8,
    pub level: u16,
    pub health: u16,
    pub shiny: u8,
    pub animated: u8,
}

// Only the functions we need from the beasts NFT contract
#[starknet::interface]
pub trait IBeasts<T> {
    fn get_beast(self: @T, token_id: u256) -> PackableBeast;
}

// Only owner_of for ownership validation
#[starknet::interface]
pub trait IERC721<T> {
    fn owner_of(self: @T, token_id: u256) -> ContractAddress;
}
