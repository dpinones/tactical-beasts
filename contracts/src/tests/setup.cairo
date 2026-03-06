use achievement::events::index as achievement_events;
use achievement::models::index as achievement_models;
use dojo::world::{WorldStorage, WorldStorageTrait, world};
use dojo_cairo_test::{
    ContractDef, ContractDefTrait, NamespaceDef, TestResource, WorldStorageTestTrait, spawn_test_world,
};
use leaderboard::events::index as leaderboard_events;
use starknet::ContractAddress;
use starknet::testing::{set_account_contract_address, set_contract_address};
use crate::constants::NAMESPACE;
use crate::events::index as events;
use crate::models::index as models;
use crate::systems::collection::{Collection, NAME as COLLECTION_NAME};
use crate::systems::game_system::{IGameSystemDispatcher, NAME as GAME_SYSTEM_NAME, game_system};

pub fn PLAYER1() -> ContractAddress {
    'PLAYER1'.try_into().unwrap()
}

pub fn PLAYER2() -> ContractAddress {
    'PLAYER2'.try_into().unwrap()
}

#[derive(Copy, Drop)]
pub struct Systems {
    pub game: IGameSystemDispatcher,
}

#[inline]
fn setup_namespace() -> NamespaceDef {
    NamespaceDef {
        namespace: NAMESPACE(),
        resources: [
            TestResource::Model(models::m_Game::TEST_CLASS_HASH),
            TestResource::Model(models::m_BeastState::TEST_CLASS_HASH),
            TestResource::Model(models::m_PlayerState::TEST_CLASS_HASH),
            TestResource::Model(models::m_GameConfig::TEST_CLASS_HASH),
            TestResource::Model(models::m_GameToken::TEST_CLASS_HASH),
            TestResource::Model(models::m_GameTokens::TEST_CLASS_HASH),
            TestResource::Model(models::m_MatchmakingQueue::TEST_CLASS_HASH),
            TestResource::Model(achievement_models::m_AchievementDefinition::TEST_CLASS_HASH),
            TestResource::Model(achievement_models::m_AchievementCompletion::TEST_CLASS_HASH),
            TestResource::Model(achievement_models::m_AchievementAdvancement::TEST_CLASS_HASH),
            TestResource::Model(achievement_models::m_AchievementAssociation::TEST_CLASS_HASH),
            TestResource::Event(events::e_GameCreated::TEST_CLASS_HASH),
            TestResource::Event(events::e_PlayerJoined::TEST_CLASS_HASH),
            TestResource::Event(events::e_GameFinished::TEST_CLASS_HASH),
            TestResource::Event(achievement_events::e_TrophyCreation::TEST_CLASS_HASH),
            TestResource::Event(achievement_events::e_TrophyProgression::TEST_CLASS_HASH),
            TestResource::Event(achievement_events::e_AchievementCompleted::TEST_CLASS_HASH),
            TestResource::Event(achievement_events::e_AchievementClaimed::TEST_CLASS_HASH),
            TestResource::Event(leaderboard_events::e_LeaderboardScore::TEST_CLASS_HASH),
            TestResource::Contract(game_system::TEST_CLASS_HASH), TestResource::Contract(Collection::TEST_CLASS_HASH),
        ]
            .span(),
    }
}

#[inline]
fn setup_contracts() -> Span<ContractDef> {
    let ns_hash = dojo::utils::bytearray_hash(@NAMESPACE());
    [
        ContractDefTrait::new(@NAMESPACE(), @GAME_SYSTEM_NAME())
            .with_writer_of([ns_hash].span())
            .with_init_calldata(array![].span()),
        ContractDefTrait::new(@NAMESPACE(), @COLLECTION_NAME())
            .with_owner_of([ns_hash].span())
            .with_init_calldata(array![].span()),
    ]
        .span()
}

pub fn spawn_game() -> (WorldStorage, Systems) {
    set_contract_address(PLAYER1());
    set_account_contract_address(PLAYER1());

    let namespace_def = setup_namespace();
    let world = spawn_test_world(world::TEST_CLASS_HASH, [namespace_def].span());
    world.sync_perms_and_inits(setup_contracts());

    let (game_address, _) = world.dns(@GAME_SYSTEM_NAME()).expect('game_system not found');
    let systems = Systems { game: IGameSystemDispatcher { contract_address: game_address } };

    (world, systems)
}
