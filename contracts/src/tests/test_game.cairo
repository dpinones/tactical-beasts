use dojo::model::{ModelStorage, ModelStorageTest};
use starknet::testing::{set_account_contract_address, set_block_timestamp, set_contract_address};
use crate::constants::{GAME_STATUS_FINISHED, GAME_STATUS_PLAYING, GAME_STATUS_WAITING};
use crate::logic::board;
use crate::models::index::{BeastState, Game, GameConfig, GameSettings, GameToken, GameTokens, MapState, MatchmakingQueue, PlayerProfile, TokenScore};
use crate::systems::game_system::IGameSystemDispatcherTrait;
use game_components_embeddable_game_standard::minigame::interface::{
    IMinigameTokenDataDispatcher, IMinigameTokenDataDispatcherTrait,
};
use game_components_embeddable_game_standard::minigame::extensions::settings::interface::{
    IMinigameSettingsDispatcher, IMinigameSettingsDispatcherTrait,
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

    // P1 sets team: token 47101 (Gorgon T2), 62550 (Rakshasa T3), 4394 (Goblin T4)
    set_player(PLAYER1());
    systems.game.set_team(game_id, 47101, 62550, 4394);

    // P2 sets team: token 601 (Wendigo T2), 45386 (Pegasus T3), 27863 (Berserker T4)
    set_player(PLAYER2());
    systems.game.set_team(game_id, 601, 45386, 27863);

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
    systems.game.set_team(game_id, 47101, 62550, 4394);

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
    systems.game.set_team(game_id, 47101, 62550, 4394);
    systems.game.set_team(game_id, 601, 45386, 27863); // Should panic
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

    // Empty turn (no actions) to test turn switching
    set_player(attacker_addr);
    systems.game.execute_turn(game_id, array![]);

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
    systems.game.execute_turn(game_id, array![]);
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

    // 4 actions when only 3 beasts alive — should panic (too many)
    set_player(attacker_addr);
    systems
        .game
        .execute_turn(
            game_id,
            array![
                Action { beast_index: 0, action_type: 1, target_index: 0, target_row: 1, target_col: 0 },
                Action { beast_index: 1, action_type: 1, target_index: 0, target_row: 1, target_col: 1 },
                Action { beast_index: 2, action_type: 1, target_index: 0, target_row: 1, target_col: 2 },
                Action { beast_index: 0, action_type: 1, target_index: 0, target_row: 2, target_col: 0 },
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

    let game_token: GameToken = world.read_model(1);
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

    let game_token: GameToken = world.read_model(2);
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
    systems.game.execute_turn(game_id, array![]);

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

    // Score = wins*500 + kills*50 + beasts_alive*30
    // Winner: 1 win, 3 kills (all defender beasts dead), 3 beasts alive
    // = 500 + 150 + 90 = 740
    let expected_score: u64 = 500 + 3 * 50 + 3 * 30;
    assert!(egs.score(winner_token) == expected_score, "Winner score wrong");
    // Loser: 0 wins, 0 kills, 0 alive = 0
    assert!(egs.score(loser_token) == 0, "Loser score should be 0");

    // Verify TokenScore model
    let winner_ts: TokenScore = world.read_model(winner_token);
    assert!(winner_ts.wins == 1, "Winner should have 1 win");
    assert!(winner_ts.kills == 3, "Winner should have 3 kills");
    assert!(winner_ts.deaths == 0, "Winner should have 0 deaths");
    assert!(winner_ts.beasts_alive == 3, "Winner should have 3 beasts alive");
    assert!(winner_ts.matches_played == 1, "Winner should have 1 match");

    let loser_ts: TokenScore = world.read_model(loser_token);
    assert!(loser_ts.losses == 1, "Loser should have 1 loss");
    assert!(loser_ts.kills == 0, "Loser should have 0 kills");
    assert!(loser_ts.deaths == 3, "Loser should have 3 deaths");
    assert!(loser_ts.beasts_alive == 0, "Loser should have 0 beasts alive");
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
    systems.game.execute_turn(game_id, array![]);

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

// --- Matchmaking ---

#[test]
fn test_find_match_creates_game() {
    let (world, systems) = spawn_game();

    set_player(PLAYER1());
    let game_id = systems.game.find_match();

    assert!(game_id == 1, "First find_match should create game 1");

    let game: Game = world.read_model(game_id);
    assert!(game.player1 == PLAYER1());
    assert!(game.status == GAME_STATUS_WAITING);

    let queue: MatchmakingQueue = world.read_model(0);
    assert!(queue.waiting_player == PLAYER1());
    assert!(queue.waiting_game_id == game_id);
}

#[test]
fn test_find_match_joins_existing() {
    let (world, systems) = spawn_game();

    set_player(PLAYER1());
    let game_id = systems.game.find_match();

    set_player(PLAYER2());
    let matched_id = systems.game.find_match();

    assert!(matched_id == game_id, "Second player should join same game");

    let game: Game = world.read_model(game_id);
    assert!(game.player1 == PLAYER1());
    assert!(game.player2 == PLAYER2());

    // Queue should be cleared
    let queue: MatchmakingQueue = world.read_model(0);
    assert!(queue.waiting_player == 0.try_into().unwrap());
    assert!(queue.waiting_game_id == 0);
}

#[test]
fn test_find_match_already_in_queue_is_noop() {
    let (world, systems) = spawn_game();

    set_player(PLAYER1());
    let game_id1 = systems.game.find_match();
    let game_id2 = systems.game.find_match(); // Should return same game_id without panic

    assert!(game_id1 == game_id2, "Should return same game id");

    // Queue should still have the player
    let queue: MatchmakingQueue = world.read_model(0);
    assert!(queue.waiting_player == PLAYER1());
    assert!(queue.waiting_game_id == game_id1);
}

#[test]
fn test_cancel_matchmaking() {
    let (world, systems) = spawn_game();

    set_player(PLAYER1());
    systems.game.find_match();

    // Verify queue has player
    let queue: MatchmakingQueue = world.read_model(0);
    assert!(queue.waiting_player == PLAYER1());

    // Cancel
    systems.game.cancel_matchmaking();

    // Queue should be cleared
    let queue_after: MatchmakingQueue = world.read_model(0);
    assert!(queue_after.waiting_player == 0.try_into().unwrap());
    assert!(queue_after.waiting_game_id == 0);
}

#[test]
#[should_panic]
fn test_cancel_matchmaking_not_in_queue() {
    let (_world, systems) = spawn_game();

    set_player(PLAYER1());
    systems.game.cancel_matchmaking(); // Should panic: "Not in queue"
}

// --- Abandon Game ---

#[test]
fn test_abandon_during_play() {
    let (world, systems) = spawn_game();
    set_block_timestamp(0);
    let game_id = setup_full_game(systems);

    // Player 1 abandons
    set_player(PLAYER1());
    systems.game.abandon_game(game_id);

    let game: Game = world.read_model(game_id);
    assert!(game.status == GAME_STATUS_FINISHED, "Game should be finished");
    assert!(game.winner == PLAYER2(), "Winner should be player 2");

    // Profiles updated
    let p1_profile: PlayerProfile = world.read_model(PLAYER1());
    assert!(p1_profile.games_played == 1);
    assert!(p1_profile.losses == 1);
    assert!(p1_profile.wins == 0);
    assert!(p1_profile.abandons == 1, "Abandoner should have 1 abandon");

    let p2_profile: PlayerProfile = world.read_model(PLAYER2());
    assert!(p2_profile.games_played == 1);
    assert!(p2_profile.wins == 1);
    assert!(p2_profile.losses == 0);
    assert!(p2_profile.abandons == 0, "Winner should have 0 abandons");
}

#[test]
fn test_abandon_during_waiting() {
    let (world, systems) = spawn_game();

    set_player(PLAYER1());
    let game_id = systems.game.create_game();

    set_player(PLAYER2());
    systems.game.join_game(game_id);

    // Player 2 abandons before teams are set
    systems.game.abandon_game(game_id);

    let game: Game = world.read_model(game_id);
    assert!(game.status == GAME_STATUS_FINISHED);
    assert!(game.winner == PLAYER1());

    let p2_profile: PlayerProfile = world.read_model(PLAYER2());
    assert!(p2_profile.games_played == 0, "Game never started, should not count");
    assert!(p2_profile.losses == 1);
    assert!(p2_profile.abandons == 1);
}

#[test]
fn test_abandon_solo_game() {
    let (world, systems) = spawn_game();

    set_player(PLAYER1());
    let game_id = systems.game.create_game();

    // Abandon without opponent — game never started so games_played stays 0
    systems.game.abandon_game(game_id);

    let game: Game = world.read_model(game_id);
    assert!(game.status == GAME_STATUS_FINISHED);

    let profile: PlayerProfile = world.read_model(PLAYER1());
    assert!(profile.games_played == 0, "Game never started, should not count");
    assert!(profile.losses == 1, "Should count as loss");
    assert!(profile.abandons == 1, "Should count as abandon");
    assert!(profile.wins == 0);
}

#[test]
#[should_panic]
fn test_cannot_abandon_finished_game() {
    let (mut world, systems) = spawn_game();
    set_block_timestamp(0);
    let game_id = setup_full_game(systems);

    // Finish the game first
    let game: Game = world.read_model(game_id);
    let defender: u8 = if game.current_attacker == 1 {
        2
    } else {
        1
    };
    let attacker_addr = if game.current_attacker == 1 {
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
    systems.game.execute_turn(game_id, array![]);

    // Try to abandon finished game — should panic
    set_player(PLAYER1());
    systems.game.abandon_game(game_id);
}

#[test]
#[should_panic]
fn test_non_player_cannot_abandon() {
    let (_world, systems) = spawn_game();

    set_player(PLAYER1());
    let game_id = systems.game.create_game();

    set_player(PLAYER2());
    // PLAYER2 hasn't joined yet, so not a player
    systems.game.abandon_game(game_id);
}

// --- Player Profile ---

#[test]
fn test_profile_updated_on_finish() {
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
    let defender_addr = if attacker == 1 {
        PLAYER2()
    } else {
        PLAYER1()
    };

    // Kill all defender beasts
    let mut i: u8 = 0;
    while i < 3 {
        let mut b: BeastState = world.read_model((game_id, defender, i));
        b.alive = false;
        b.hp = 0;
        b.extra_lives = 0;
        world.write_model_test(@b);
        i += 1;
    }

    // Trigger victory
    set_player(attacker_addr);
    systems.game.execute_turn(game_id, array![]);

    // Check winner profile
    let winner_profile: PlayerProfile = world.read_model(attacker_addr);
    assert!(winner_profile.games_played == 1, "Winner should have 1 game played");
    assert!(winner_profile.wins == 1, "Winner should have 1 win");
    assert!(winner_profile.losses == 0, "Winner should have 0 losses");
    assert!(winner_profile.total_kills == 3, "Winner should have 3 kills");
    assert!(winner_profile.total_deaths == 0, "Winner should have 0 deaths");

    // Check loser profile
    let loser_profile: PlayerProfile = world.read_model(defender_addr);
    assert!(loser_profile.games_played == 1, "Loser should have 1 game played");
    assert!(loser_profile.wins == 0, "Loser should have 0 wins");
    assert!(loser_profile.losses == 1, "Loser should have 1 loss");
    assert!(loser_profile.total_kills == 0, "Loser should have 0 kills");
    assert!(loser_profile.total_deaths == 3, "Loser should have 3 deaths");
}

#[test]
fn test_profile_accumulates_across_games() {
    let (mut world, systems) = spawn_game();
    set_block_timestamp(0);

    // Game 1: attacker wins
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
    systems.game.execute_turn(game_id, array![]);

    // Game 2: same players, attacker wins again
    set_player(PLAYER1());
    let game_id2 = systems.game.create_game();
    set_player(PLAYER2());
    systems.game.join_game(game_id2);
    set_player(PLAYER1());
    systems.game.set_team(game_id2, 47101, 62550, 4394);
    set_player(PLAYER2());
    systems.game.set_team(game_id2, 601, 45386, 27863);

    let game2: Game = world.read_model(game_id2);
    let attacker2 = game2.current_attacker;
    let defender2: u8 = if attacker2 == 1 {
        2
    } else {
        1
    };
    let attacker_addr2 = if attacker2 == 1 {
        PLAYER1()
    } else {
        PLAYER2()
    };

    let mut j: u8 = 0;
    while j < 3 {
        let mut b: BeastState = world.read_model((game_id2, defender2, j));
        b.alive = false;
        b.hp = 0;
        b.extra_lives = 0;
        world.write_model_test(@b);
        j += 1;
    }

    set_player(attacker_addr2);
    systems.game.execute_turn(game_id2, array![]);

    // attacker_addr should have 2 wins (both games, attacker is always player1 with current_attacker=1)
    let profile: PlayerProfile = world.read_model(attacker_addr);
    assert!(profile.games_played == 2, "Should have 2 games played");
    assert!(profile.wins == 2, "Should have 2 wins");
}

// --- Map State (Dynamic Obstacles) ---

#[test]
fn test_join_game_generates_obstacles() {
    let (world, systems) = spawn_game();

    set_player(PLAYER1());
    let game_id = systems.game.create_game();

    set_player(PLAYER2());
    systems.game.join_game(game_id);

    let map_state: MapState = world.read_model(game_id);

    // Collect all 6 obstacle positions
    let obstacles: [(u8, u8); 6] = [
        (map_state.obstacle_1_row, map_state.obstacle_1_col), (map_state.obstacle_2_row, map_state.obstacle_2_col),
        (map_state.obstacle_3_row, map_state.obstacle_3_col), (map_state.obstacle_4_row, map_state.obstacle_4_col),
        (map_state.obstacle_5_row, map_state.obstacle_5_col), (map_state.obstacle_6_row, map_state.obstacle_6_col),
    ];

    // Verify all obstacles are valid cells and not spawn positions
    let mut i: u32 = 0;
    loop {
        if i >= 6 {
            break;
        }
        let (row, col) = *obstacles.span().at(i);
        assert!(board::is_valid_cell(row, col), "Obstacle ({},{}) is not a valid cell", row, col);

        // Check not a spawn position
        let mut is_spawn = false;
        let mut p: u8 = 1;
        loop {
            if p > 2 {
                break;
            }
            let mut b: u8 = 0;
            loop {
                if b >= 3 {
                    break;
                }
                let (sr, sc) = board::get_spawn_position(p, b);
                if sr == row && sc == col {
                    is_spawn = true;
                }
                b += 1;
            }
            p += 1;
        }
        assert!(!is_spawn, "Obstacle ({},{}) is a spawn position", row, col);

        i += 1;
    }

    // Verify no duplicate obstacles
    let mut j: u32 = 0;
    loop {
        if j >= 6 {
            break;
        }
        let mut k: u32 = j + 1;
        loop {
            if k >= 6 {
                break;
            }
            let (r1, c1) = *obstacles.span().at(j);
            let (r2, c2) = *obstacles.span().at(k);
            assert!(r1 != r2 || c1 != c2, "Duplicate obstacle at ({},{})", r1, c1);
            k += 1;
        }
        j += 1;
    }

    // Verify is_obstacle_in_map works
    let mut m: u32 = 0;
    loop {
        if m >= 6 {
            break;
        }
        let (r, c) = *obstacles.span().at(m);
        assert!(board::is_obstacle_in_map(map_state, r, c), "is_obstacle_in_map failed for ({},{})", r, c);
        m += 1;
    };
}

// --- Game Settings ---

#[test]
fn test_default_settings_exist() {
    let (world, systems) = spawn_game();

    // Default settings (id=1) should be created by dojo_init
    let config: GameConfig = world.read_model(0);
    assert!(config.settings_count == 1, "Should have 1 default setting");

    let settings: GameSettings = world.read_model(1_u32);
    assert!(settings.min_tier == 2);
    assert!(settings.max_tier == 4);
    assert!(settings.max_t2_per_team == 1);
    assert!(settings.max_t3_per_team == 2);
    assert!(settings.beasts_per_player == 3);

    // IMinigameSettings should report settings_id=0 and 1 as existing
    let egs_settings = IMinigameSettingsDispatcher { contract_address: systems.game.contract_address };
    assert!(egs_settings.settings_exist(0), "settings_id=0 should exist (default alias)");
    assert!(egs_settings.settings_exist(1), "settings_id=1 should exist");
    assert!(!egs_settings.settings_exist(2), "settings_id=2 should not exist");
}

#[test]
fn test_create_settings() {
    let (world, systems) = spawn_game();

    set_player(PLAYER1());
    let settings_id = systems.game.create_settings(
        "T3 Only", "Only T3 beasts allowed", 3, 3, 0, 3, 3,
    );

    assert!(settings_id == 2, "Should be settings_id 2");

    let settings = systems.game.settings_details(settings_id);
    assert!(settings.min_tier == 3);
    assert!(settings.max_tier == 3);
    assert!(settings.max_t2_per_team == 0);
    assert!(settings.max_t3_per_team == 3);
    assert!(settings.beasts_per_player == 3);

    let config: GameConfig = world.read_model(0);
    assert!(config.settings_count == 2);

    assert!(systems.game.settings_count() == 2);
}

#[test]
fn test_game_with_custom_settings_2_beasts() {
    let (_world, systems) = spawn_game();

    set_player(PLAYER1());
    // Create settings: 2 beasts per player, T2-T4
    let settings_id = systems.game.create_settings(
        "Duel", "2v2 beast duel", 2, 4, 1, 2, 2,
    );

    let game_id = systems.game.create_game_with_settings(settings_id);

    set_player(PLAYER2());
    systems.game.join_game(game_id);

    // Set teams with 2 beasts each
    set_player(PLAYER1());
    systems.game.set_team_dynamic(game_id, array![47101, 62550]); // Gorgon T2, Rakshasa T3

    set_player(PLAYER2());
    systems.game.set_team_dynamic(game_id, array![601, 45386]); // Wendigo T2, Pegasus T3

    let game: Game = _world.read_model(game_id);
    assert!(game.status == GAME_STATUS_PLAYING, "Game should be playing");
    assert!(game.settings_id == settings_id);
}

#[test]
fn test_4_beasts_game() {
    let (world, systems) = spawn_game();

    set_player(PLAYER1());
    // Create settings: 4 beasts per player
    let settings_id = systems.game.create_settings(
        "Full Squad", "4v4 beast battle", 2, 4, 1, 3, 4,
    );

    let game_id = systems.game.create_game_with_settings(settings_id);

    set_player(PLAYER2());
    systems.game.join_game(game_id);

    // Set teams with 4 beasts each
    set_player(PLAYER1());
    systems.game.set_team_dynamic(game_id, array![47101, 62550, 4394, 37152]); // T2, T3, T4, T4

    set_player(PLAYER2());
    systems.game.set_team_dynamic(game_id, array![601, 45386, 27863, 9070]); // T2, T3, T4, T4

    let game: Game = world.read_model(game_id);
    assert!(game.status == GAME_STATUS_PLAYING, "Game should be playing");

    // Verify 4th beast has spawn position
    let b3_p1: BeastState = world.read_model((game_id, 1_u8, 3_u8));
    assert!(b3_p1.alive);
    assert!(b3_p1.position_row == 1 && b3_p1.position_col == 0, "P1 beast 3 spawn wrong");

    let b3_p2: BeastState = world.read_model((game_id, 2_u8, 3_u8));
    assert!(b3_p2.alive);
    assert!(b3_p2.position_row == 5 && b3_p2.position_col == 0, "P2 beast 3 spawn wrong");
}

#[test]
fn test_custom_tier_restriction() {
    let (_world, systems) = spawn_game();

    set_player(PLAYER1());
    // T3 only, 3 beasts, up to 3 T3 allowed
    let settings_id = systems.game.create_settings(
        "T3 Only", "T3 only", 3, 3, 0, 3, 3,
    );

    let game_id = systems.game.create_game_with_settings(settings_id);

    set_player(PLAYER2());
    systems.game.join_game(game_id);

    // All T3 beasts
    set_player(PLAYER1());
    systems.game.set_team(game_id, 62550, 30226, 4508); // Rakshasa T3, Banshee T3, Draugr T3

    set_player(PLAYER2());
    systems.game.set_team(game_id, 45386, 17790, 39316); // Pegasus T3, Weretiger T3, Oni T3

    let game: Game = _world.read_model(game_id);
    assert!(game.status == GAME_STATUS_PLAYING);
}

#[test]
#[should_panic]
fn test_custom_tier_rejects_wrong_tier() {
    let (_world, systems) = spawn_game();

    set_player(PLAYER1());
    // T3 only
    let settings_id = systems.game.create_settings(
        "T3 Only", "T3 only", 3, 3, 0, 3, 3,
    );

    let game_id = systems.game.create_game_with_settings(settings_id);

    set_player(PLAYER2());
    systems.game.join_game(game_id);

    // Try to use a T2 beast in T3-only game — should panic
    set_player(PLAYER1());
    systems.game.set_team(game_id, 47101, 62550, 4508); // Gorgon T2 is not allowed
}

#[test]
#[should_panic]
fn test_wrong_beast_count_panics() {
    let (_world, systems) = spawn_game();

    set_player(PLAYER1());
    // 2 beasts per player
    let settings_id = systems.game.create_settings(
        "Duel", "2v2", 2, 4, 1, 2, 2,
    );

    let game_id = systems.game.create_game_with_settings(settings_id);

    set_player(PLAYER2());
    systems.game.join_game(game_id);

    // Try to set 3 beasts in a 2-beast game — should panic
    set_player(PLAYER1());
    systems.game.set_team(game_id, 47101, 62550, 4394);
}

#[test]
fn test_finish_4_beast_game() {
    let (mut world, systems) = spawn_game();
    set_block_timestamp(0);

    set_player(PLAYER1());
    let settings_id = systems.game.create_settings(
        "Full", "4v4", 2, 4, 1, 3, 4,
    );
    let game_id = systems.game.create_game_with_settings(settings_id);

    set_player(PLAYER2());
    systems.game.join_game(game_id);

    set_player(PLAYER1());
    systems.game.set_team_dynamic(game_id, array![47101, 62550, 4394, 37152]);

    set_player(PLAYER2());
    systems.game.set_team_dynamic(game_id, array![601, 45386, 27863, 9070]);

    let game: Game = world.read_model(game_id);
    let attacker = game.current_attacker;
    let defender: u8 = if attacker == 1 { 2 } else { 1 };
    let attacker_addr = if attacker == 1 { PLAYER1() } else { PLAYER2() };

    // Kill all 4 defender beasts
    let mut i: u8 = 0;
    while i < 4 {
        let mut b: BeastState = world.read_model((game_id, defender, i));
        b.alive = false;
        b.hp = 0;
        b.extra_lives = 0;
        world.write_model_test(@b);
        i += 1;
    };

    set_player(attacker_addr);
    systems.game.execute_turn(game_id, array![]);

    let game_after: Game = world.read_model(game_id);
    assert!(game_after.status == GAME_STATUS_FINISHED);
    assert!(game_after.winner == attacker_addr);

    // Score: 1 win(500) + 4 kills(200) + 4 alive(120) = 820
    let egs = IMinigameTokenDataDispatcher { contract_address: systems.game.contract_address };
    let game_tokens: GameTokens = world.read_model(game_id);
    let winner_token = if attacker == 1 { game_tokens.p1_token_id } else { game_tokens.p2_token_id };
    let expected_score: u64 = 500 + 4 * 50 + 4 * 30;
    assert!(egs.score(winner_token) == expected_score, "Winner score wrong for 4-beast game");
}
