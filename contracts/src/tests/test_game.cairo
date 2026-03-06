use dojo::model::{ModelStorage, ModelStorageTest};
use starknet::testing::{set_account_contract_address, set_block_timestamp, set_contract_address};
use crate::constants::{GAME_STATUS_FINISHED, GAME_STATUS_PLAYING, GAME_STATUS_WAITING, MAX_ROUNDS, WIN_BONUS};
use crate::models::index::{BeastState, Game, GameToken, GameTokens};
use crate::systems::game_system::{
    IGameSystemDispatcherTrait, IMinigameTokenDataDispatcher, IMinigameTokenDataDispatcherTrait,
};
use crate::tests::setup::{PLAYER1, PLAYER2, Systems, spawn_game};
use crate::types::Action;

fn set_player(player: starknet::ContractAddress) {
    set_contract_address(player);
    set_account_contract_address(player);
}

fn setup_full_game(systems: Systems) -> u32 {
    // P1 creates game
    set_player(PLAYER1());
    let game_id = systems.game.create_game();

    // P2 joins
    set_player(PLAYER2());
    systems.game.join_game(game_id);

    // P1 sets team: beasts 1 (Magical), 26 (Hunter), 51 (Brute)
    set_player(PLAYER1());
    systems.game.set_team(game_id, 1, 26, 51);

    // P2 sets team: beasts 10 (Magical), 40 (Hunter), 60 (Brute)
    set_player(PLAYER2());
    systems.game.set_team(game_id, 10, 40, 60);

    game_id
}

// --- Create & Join ---

#[test]
fn test_create_game() {
    let (world, systems) = spawn_game();

    set_player(PLAYER1());
    let game_id = systems.game.create_game();

    assert!(game_id == 1, "First game should have id 1");
    let game: Game = world.read_model(game_id);
    assert!(game.status == GAME_STATUS_WAITING);
    assert!(game.player1 == PLAYER1());
    assert!(!game.p1_team_set, "P1 team should NOT be set on create");
    assert!(!game.p2_team_set, "P2 team should NOT be set on create");
}

#[test]
fn test_join_game() {
    let (world, systems) = spawn_game();

    set_player(PLAYER1());
    let game_id = systems.game.create_game();

    set_player(PLAYER2());
    systems.game.join_game(game_id);

    let game: Game = world.read_model(game_id);
    assert!(game.player2 == PLAYER2());
    assert!(game.status == GAME_STATUS_WAITING, "Game should still be waiting (no teams set)");
}

#[test]
#[should_panic]
fn test_cannot_join_own_game() {
    let (_world, systems) = spawn_game();

    set_player(PLAYER1());
    let game_id = systems.game.create_game();
    systems.game.join_game(game_id);
}

// --- Set Team ---

#[test]
fn test_set_team_p1() {
    let (world, systems) = spawn_game();

    set_player(PLAYER1());
    let game_id = systems.game.create_game();

    set_player(PLAYER2());
    systems.game.join_game(game_id);

    set_player(PLAYER1());
    systems.game.set_team(game_id, 1, 26, 51);

    let game: Game = world.read_model(game_id);
    assert!(game.p1_team_set, "P1 team should be set");
    assert!(!game.p2_team_set, "P2 team should NOT be set yet");
    assert!(game.status == GAME_STATUS_WAITING, "Game should still be waiting");
}

#[test]
#[should_panic]
fn test_cannot_set_team_twice() {
    let (_world, systems) = spawn_game();

    set_player(PLAYER1());
    let game_id = systems.game.create_game();

    set_player(PLAYER2());
    systems.game.join_game(game_id);

    set_player(PLAYER1());
    systems.game.set_team(game_id, 1, 26, 51);
    systems.game.set_team(game_id, 2, 27, 52); // Should panic
}

// --- Game Start ---

#[test]
fn test_both_teams_start_game() {
    let (world, systems) = spawn_game();
    let game_id = setup_full_game(systems);

    let game: Game = world.read_model(game_id);
    assert!(game.status == GAME_STATUS_PLAYING, "Game should be playing after both teams set");
    assert!(game.round == 1);
    assert!(game.current_attacker == 1 || game.current_attacker == 2);
}

#[test]
fn test_beasts_have_spawn_positions() {
    let (world, systems) = spawn_game();
    let game_id = setup_full_game(systems);

    // P1 beast 0 should be at spawn (0,1)
    let b: BeastState = world.read_model((game_id, 1_u8, 0_u8));
    assert!(b.alive);
    assert!(b.position_row == 0 && b.position_col == 1, "P1 beast 0 spawn wrong");

    // P2 beast 0 should be at spawn (6,1)
    let b2: BeastState = world.read_model((game_id, 2_u8, 0_u8));
    assert!(b2.alive);
    assert!(b2.position_row == 6 && b2.position_col == 1, "P2 beast 0 spawn wrong");
}

// --- Execute Turn ---

#[test]
fn test_move_beast() {
    let (world, systems) = spawn_game();
    set_block_timestamp(0);
    let game_id = setup_full_game(systems);

    let game: Game = world.read_model(game_id);
    let attacker = game.current_attacker;
    let attacker_addr = if attacker == 1 {
        PLAYER1()
    } else {
        PLAYER2()
    };

    // Use WAIT for all beasts to test turn switching
    set_player(attacker_addr);
    systems
        .game
        .execute_turn(
            game_id,
            array![
                Action { beast_index: 0, action_type: 0, target_index: 0, target_row: 0, target_col: 0 },
                Action { beast_index: 1, action_type: 0, target_index: 0, target_row: 0, target_col: 0 },
                Action { beast_index: 2, action_type: 0, target_index: 0, target_row: 0, target_col: 0 },
            ],
        );

    // Turn should switch
    let game_after: Game = world.read_model(game_id);
    assert!(game_after.current_attacker != attacker, "Turn should switch");
}

#[test]
#[should_panic]
fn test_wrong_player_cannot_execute() {
    let (_world, systems) = spawn_game();
    set_block_timestamp(0);
    let game_id = setup_full_game(systems);

    let game: Game = _world.read_model(game_id);
    let non_attacker = if game.current_attacker == 1 {
        PLAYER2()
    } else {
        PLAYER1()
    };

    set_player(non_attacker);
    systems
        .game
        .execute_turn(
            game_id,
            array![
                Action { beast_index: 0, action_type: 0, target_index: 0, target_row: 0, target_col: 0 },
                Action { beast_index: 1, action_type: 0, target_index: 0, target_row: 0, target_col: 0 },
                Action { beast_index: 2, action_type: 0, target_index: 0, target_row: 0, target_col: 0 },
            ],
        );
}

#[test]
#[should_panic]
fn test_wrong_action_count_panics() {
    let (_world, systems) = spawn_game();
    set_block_timestamp(0);
    let game_id = setup_full_game(systems);

    let game: Game = _world.read_model(game_id);
    let attacker_addr = if game.current_attacker == 1 {
        PLAYER1()
    } else {
        PLAYER2()
    };

    // Only 2 actions when 3 beasts alive
    set_player(attacker_addr);
    systems
        .game
        .execute_turn(
            game_id,
            array![
                Action { beast_index: 0, action_type: 0, target_index: 0, target_row: 0, target_col: 0 },
                Action { beast_index: 1, action_type: 0, target_index: 0, target_row: 0, target_col: 0 },
            ],
        );
}

// --- EGS ---

#[test]
fn test_create_mints_nft() {
    let (world, systems) = spawn_game();

    set_player(PLAYER1());
    let game_id = systems.game.create_game();

    // Verify GameToken was created
    let game_tokens: GameTokens = world.read_model(game_id);
    assert!(game_tokens.p1_token_id == 1, "P1 should get token_id 1");
    assert!(game_tokens.p2_token_id == 0, "P2 token should be 0 before join");

    let game_token: GameToken = world.read_model(1_u64);
    assert!(game_token.match_id == game_id);
    assert!(game_token.player == PLAYER1());
}

#[test]
fn test_join_mints_nft() {
    let (world, systems) = spawn_game();
    let game_id = setup_full_game(systems);

    let game_tokens: GameTokens = world.read_model(game_id);
    assert!(game_tokens.p1_token_id == 1, "P1 should get token_id 1");
    assert!(game_tokens.p2_token_id == 2, "P2 should get token_id 2");

    let game_token: GameToken = world.read_model(2_u64);
    assert!(game_token.match_id == game_id);
    assert!(game_token.player == PLAYER2());
}

#[test]
fn test_egs_in_progress() {
    let (_world, systems) = spawn_game();

    set_player(PLAYER1());
    let _game_id = systems.game.create_game();

    let egs = IMinigameTokenDataDispatcher { contract_address: systems.game.contract_address };
    // token_id 1 maps to game_id 1
    assert!(!egs.game_over(1));
    assert!(egs.score(1) == 0);
}

#[test]
fn test_finish_submits_score() {
    let (mut world, systems) = spawn_game();
    set_block_timestamp(0);
    let game_id = setup_full_game(systems);

    let game: Game = world.read_model(game_id);
    let attacker = game.current_attacker;
    let defender: u8 = if attacker == 1 {
        2
    } else {
        1
    };
    let attacker_addr = if attacker == 1 {
        PLAYER1()
    } else {
        PLAYER2()
    };

    // Kill all defender beasts via direct model write
    let mut i: u8 = 0;
    while i < 3 {
        let mut b: BeastState = world.read_model((game_id, defender, i));
        b.alive = false;
        b.hp = 0;
        b.extra_lives = 0;
        world.write_model_test(@b);
        i += 1;
    }

    // Execute WAIT turn — victory check triggers
    set_player(attacker_addr);
    systems
        .game
        .execute_turn(
            game_id,
            array![
                Action { beast_index: 0, action_type: 0, target_index: 0, target_row: 0, target_col: 0 },
                Action { beast_index: 1, action_type: 0, target_index: 0, target_row: 0, target_col: 0 },
                Action { beast_index: 2, action_type: 0, target_index: 0, target_row: 0, target_col: 0 },
            ],
        );

    // Verify game finished
    let game_after: Game = world.read_model(game_id);
    assert!(game_after.status == GAME_STATUS_FINISHED, "Game should be finished");
    assert!(game_after.winner == attacker_addr, "Winner should be attacker");

    // Verify EGS score
    let egs = IMinigameTokenDataDispatcher { contract_address: systems.game.contract_address };
    let game_tokens: GameTokens = world.read_model(game_id);
    let winner_token = if attacker == 1 {
        game_tokens.p1_token_id
    } else {
        game_tokens.p2_token_id
    };
    let loser_token = if attacker == 1 {
        game_tokens.p2_token_id
    } else {
        game_tokens.p1_token_id
    };

    // Score = (MAX_ROUNDS - round) * 10 + WIN_BONUS = (50 - 1) * 10 + 100 = 590
    let expected_score: u64 = (MAX_ROUNDS.into() - 1_u64) * 10 + WIN_BONUS;
    assert!(egs.score(winner_token) == expected_score, "Winner score wrong");
    assert!(egs.score(loser_token) == 0, "Loser score should be 0");
}

#[test]
fn test_game_over_token() {
    let (mut world, systems) = spawn_game();
    set_block_timestamp(0);
    let game_id = setup_full_game(systems);

    let egs = IMinigameTokenDataDispatcher { contract_address: systems.game.contract_address };
    let game_tokens: GameTokens = world.read_model(game_id);

    // Before finish, game_over should be false for both tokens
    assert!(!egs.game_over(game_tokens.p1_token_id), "P1 token should not be game_over");
    assert!(!egs.game_over(game_tokens.p2_token_id), "P2 token should not be game_over");

    // Kill defender beasts and trigger victory
    let game: Game = world.read_model(game_id);
    let attacker = game.current_attacker;
    let defender: u8 = if attacker == 1 {
        2
    } else {
        1
    };
    let attacker_addr = if attacker == 1 {
        PLAYER1()
    } else {
        PLAYER2()
    };

    let mut i: u8 = 0;
    while i < 3 {
        let mut b: BeastState = world.read_model((game_id, defender, i));
        b.alive = false;
        b.hp = 0;
        b.extra_lives = 0;
        world.write_model_test(@b);
        i += 1;
    }

    set_player(attacker_addr);
    systems
        .game
        .execute_turn(
            game_id,
            array![
                Action { beast_index: 0, action_type: 0, target_index: 0, target_row: 0, target_col: 0 },
                Action { beast_index: 1, action_type: 0, target_index: 0, target_row: 0, target_col: 0 },
                Action { beast_index: 2, action_type: 0, target_index: 0, target_row: 0, target_col: 0 },
            ],
        );

    // After finish, game_over should be true for both tokens
    assert!(egs.game_over(game_tokens.p1_token_id), "P1 token should be game_over");
    assert!(egs.game_over(game_tokens.p2_token_id), "P2 token should be game_over");
}

#[test]
fn test_multiple_games() {
    let (world, systems) = spawn_game();

    set_player(PLAYER1());
    let g1 = systems.game.create_game();
    let g2 = systems.game.create_game();

    assert!(g1 == 1);
    assert!(g2 == 2);

    let game1: Game = world.read_model(g1);
    let game2: Game = world.read_model(g2);
    assert!(game1.player1 == PLAYER1());
    assert!(game2.player1 == PLAYER1());

    // Each game mints a new token
    let tokens1: GameTokens = world.read_model(g1);
    let tokens2: GameTokens = world.read_model(g2);
    assert!(tokens1.p1_token_id == 1);
    assert!(tokens2.p1_token_id == 2);
}
