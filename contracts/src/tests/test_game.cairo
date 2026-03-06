use core::hash::HashStateTrait;
use core::poseidon::PoseidonTrait;
use dojo::model::ModelStorage;
use starknet::testing::{set_account_contract_address, set_contract_address};
use crate::constants::{
    GAME_STATUS_COMMITTING, GAME_STATUS_FINISHED, GAME_STATUS_REVEALING, GAME_STATUS_WAITING, MOVE_PAPER, MOVE_ROCK,
    MOVE_SCISSORS,
};
use crate::models::index::Game;
use crate::systems::game_system::{
    IGameSystemDispatcherTrait, IMinigameTokenDataDispatcher, IMinigameTokenDataDispatcherTrait,
};
use crate::tests::setup::{PLAYER1, PLAYER2, Systems, spawn_game};

fn commit_hash(move_value: u8, salt: felt252) -> felt252 {
    PoseidonTrait::new().update(move_value.into()).update(salt).finalize()
}

fn play_full_game(systems: Systems, move1: u8, move2: u8) -> u32 {
    let salt1: felt252 = 'salt1';
    let salt2: felt252 = 'salt2';

    // Player 1 creates game
    set_contract_address(PLAYER1());
    set_account_contract_address(PLAYER1());
    let game_id = systems.game.create_game();

    // Player 2 joins
    set_contract_address(PLAYER2());
    set_account_contract_address(PLAYER2());
    systems.game.join_game(game_id);

    // Player 1 commits
    set_contract_address(PLAYER1());
    set_account_contract_address(PLAYER1());
    systems.game.commit_move(game_id, commit_hash(move1, salt1));

    // Player 2 commits
    set_contract_address(PLAYER2());
    set_account_contract_address(PLAYER2());
    systems.game.commit_move(game_id, commit_hash(move2, salt2));

    // Player 1 reveals
    set_contract_address(PLAYER1());
    set_account_contract_address(PLAYER1());
    systems.game.reveal_move(game_id, move1, salt1);

    // Player 2 reveals
    set_contract_address(PLAYER2());
    set_account_contract_address(PLAYER2());
    systems.game.reveal_move(game_id, move2, salt2);

    game_id
}

#[test]
fn test_rock_beats_scissors() {
    let (world, systems) = spawn_game();
    let game_id = play_full_game(systems, MOVE_ROCK, MOVE_SCISSORS);

    let game: Game = world.read_model(game_id);
    assert!(game.status == GAME_STATUS_FINISHED, "Game should be finished");
    assert!(game.winner == PLAYER1(), "Player1 (rock) should beat player2 (scissors)");
    assert!(game.player1_move == MOVE_ROCK, "Player1 move should be rock");
    assert!(game.player2_move == MOVE_SCISSORS, "Player2 move should be scissors");
}

#[test]
fn test_paper_beats_rock() {
    let (world, systems) = spawn_game();
    let game_id = play_full_game(systems, MOVE_PAPER, MOVE_ROCK);

    let game: Game = world.read_model(game_id);
    assert!(game.winner == PLAYER1(), "Player1 (paper) should beat player2 (rock)");
}

#[test]
fn test_scissors_beats_paper() {
    let (world, systems) = spawn_game();
    let game_id = play_full_game(systems, MOVE_SCISSORS, MOVE_PAPER);

    let game: Game = world.read_model(game_id);
    assert!(game.winner == PLAYER1(), "Player1 (scissors) should beat player2 (paper)");
}

#[test]
fn test_player2_wins() {
    let (world, systems) = spawn_game();
    let game_id = play_full_game(systems, MOVE_ROCK, MOVE_PAPER);

    let game: Game = world.read_model(game_id);
    assert!(game.winner == PLAYER2(), "Player2 (paper) should beat player1 (rock)");
}

#[test]
fn test_draw() {
    let (world, systems) = spawn_game();
    let game_id = play_full_game(systems, MOVE_ROCK, MOVE_ROCK);

    let game: Game = world.read_model(game_id);
    assert!(game.status == GAME_STATUS_FINISHED, "Game should be finished");
    assert!(game.winner == 0.try_into().unwrap(), "Draw should have zero winner");
}

#[test]
fn test_create_and_join() {
    let (world, systems) = spawn_game();

    // Player 1 creates
    set_contract_address(PLAYER1());
    set_account_contract_address(PLAYER1());
    let game_id = systems.game.create_game();

    let game: Game = world.read_model(game_id);
    assert!(game.status == GAME_STATUS_WAITING, "New game should be waiting");
    assert!(game.player1 == PLAYER1(), "Player1 should be creator");
    assert!(game_id == 1, "First game should have id 1");

    // Player 2 joins
    set_contract_address(PLAYER2());
    set_account_contract_address(PLAYER2());
    systems.game.join_game(game_id);

    let game: Game = world.read_model(game_id);
    assert!(game.status == GAME_STATUS_COMMITTING, "Game should be committing after join");
    assert!(game.player2 == PLAYER2(), "Player2 should be joiner");
}

#[test]
#[should_panic]
fn test_cannot_join_own_game() {
    let (_world, systems) = spawn_game();

    set_contract_address(PLAYER1());
    set_account_contract_address(PLAYER1());
    let game_id = systems.game.create_game();
    systems.game.join_game(game_id);
}

#[test]
#[should_panic]
fn test_cannot_commit_twice() {
    let (_world, systems) = spawn_game();

    set_contract_address(PLAYER1());
    set_account_contract_address(PLAYER1());
    let game_id = systems.game.create_game();

    set_contract_address(PLAYER2());
    set_account_contract_address(PLAYER2());
    systems.game.join_game(game_id);

    set_contract_address(PLAYER1());
    set_account_contract_address(PLAYER1());
    let hash = commit_hash(MOVE_ROCK, 'salt');
    systems.game.commit_move(game_id, hash);
    systems.game.commit_move(game_id, hash); // Should panic
}

#[test]
#[should_panic]
fn test_wrong_hash_fails_reveal() {
    let (_world, systems) = spawn_game();

    set_contract_address(PLAYER1());
    set_account_contract_address(PLAYER1());
    let game_id = systems.game.create_game();

    set_contract_address(PLAYER2());
    set_account_contract_address(PLAYER2());
    systems.game.join_game(game_id);

    // Both commit
    set_contract_address(PLAYER1());
    set_account_contract_address(PLAYER1());
    systems.game.commit_move(game_id, commit_hash(MOVE_ROCK, 'salt1'));

    set_contract_address(PLAYER2());
    set_account_contract_address(PLAYER2());
    systems.game.commit_move(game_id, commit_hash(MOVE_PAPER, 'salt2'));

    // Player 1 tries to reveal with wrong move
    set_contract_address(PLAYER1());
    set_account_contract_address(PLAYER1());
    systems.game.reveal_move(game_id, MOVE_PAPER, 'salt1'); // Committed rock, revealing paper
}

#[test]
#[should_panic]
fn test_invalid_move() {
    let (_world, systems) = spawn_game();

    set_contract_address(PLAYER1());
    set_account_contract_address(PLAYER1());
    let game_id = systems.game.create_game();

    set_contract_address(PLAYER2());
    set_account_contract_address(PLAYER2());
    systems.game.join_game(game_id);

    // Both commit
    set_contract_address(PLAYER1());
    set_account_contract_address(PLAYER1());
    systems.game.commit_move(game_id, commit_hash(MOVE_ROCK, 'salt1'));

    set_contract_address(PLAYER2());
    set_account_contract_address(PLAYER2());
    systems.game.commit_move(game_id, commit_hash(MOVE_PAPER, 'salt2'));

    // Player 1 reveals with invalid move value (4)
    set_contract_address(PLAYER1());
    set_account_contract_address(PLAYER1());
    systems.game.reveal_move(game_id, 4, 'salt1');
}

#[test]
fn test_commit_phase_transitions() {
    let (world, systems) = spawn_game();

    set_contract_address(PLAYER1());
    set_account_contract_address(PLAYER1());
    let game_id = systems.game.create_game();

    set_contract_address(PLAYER2());
    set_account_contract_address(PLAYER2());
    systems.game.join_game(game_id);

    // After first commit, still in committing
    set_contract_address(PLAYER1());
    set_account_contract_address(PLAYER1());
    systems.game.commit_move(game_id, commit_hash(MOVE_ROCK, 'salt1'));

    let game: Game = world.read_model(game_id);
    assert!(game.status == GAME_STATUS_COMMITTING, "Should still be committing after one commit");

    // After second commit, transitions to revealing
    set_contract_address(PLAYER2());
    set_account_contract_address(PLAYER2());
    systems.game.commit_move(game_id, commit_hash(MOVE_PAPER, 'salt2'));

    let game: Game = world.read_model(game_id);
    assert!(game.status == GAME_STATUS_REVEALING, "Should be revealing after both commit");
}

#[test]
fn test_timeout_claim() {
    let (_world, systems) = spawn_game();

    set_contract_address(PLAYER1());
    set_account_contract_address(PLAYER1());
    let game_id = systems.game.create_game();

    set_contract_address(PLAYER2());
    set_account_contract_address(PLAYER2());
    systems.game.join_game(game_id);

    // Both commit
    set_contract_address(PLAYER1());
    set_account_contract_address(PLAYER1());
    systems.game.commit_move(game_id, commit_hash(MOVE_ROCK, 'salt1'));

    set_contract_address(PLAYER2());
    set_account_contract_address(PLAYER2());
    systems.game.commit_move(game_id, commit_hash(MOVE_PAPER, 'salt2'));

    // Player 1 reveals
    set_contract_address(PLAYER1());
    set_account_contract_address(PLAYER1());
    systems.game.reveal_move(game_id, MOVE_ROCK, 'salt1');

    // Advance time past timeout (600 seconds)
    starknet::testing::set_block_timestamp(700);

    // Player 1 claims timeout
    set_contract_address(PLAYER1());
    set_account_contract_address(PLAYER1());
    systems.game.claim_timeout(game_id);

    let game: Game = _world.read_model(game_id);
    assert!(game.status == GAME_STATUS_FINISHED, "Game should be finished after timeout");
    assert!(game.winner == PLAYER1(), "Player1 should win by timeout");
}

#[test]
fn test_egs_score_and_game_over() {
    let (_world, systems) = spawn_game();
    let game_id = play_full_game(systems, MOVE_ROCK, MOVE_SCISSORS);

    let egs = IMinigameTokenDataDispatcher { contract_address: systems.game.contract_address };

    assert!(egs.game_over(game_id.into()), "Game should be over");
    assert!(egs.score(game_id.into()) == 1, "Score should be 1 for a won game");
}

#[test]
fn test_egs_draw_score() {
    let (_world, systems) = spawn_game();
    let game_id = play_full_game(systems, MOVE_ROCK, MOVE_ROCK);

    let egs = IMinigameTokenDataDispatcher { contract_address: systems.game.contract_address };

    assert!(egs.game_over(game_id.into()), "Game should be over");
    assert!(egs.score(game_id.into()) == 0, "Score should be 0 for a draw");
}

#[test]
fn test_egs_in_progress() {
    let (_world, systems) = spawn_game();

    set_contract_address(PLAYER1());
    set_account_contract_address(PLAYER1());
    let game_id = systems.game.create_game();

    let egs = IMinigameTokenDataDispatcher { contract_address: systems.game.contract_address };

    assert!(!egs.game_over(game_id.into()), "Game should not be over");
    assert!(egs.score(game_id.into()) == 0, "Score should be 0 for in-progress game");
}

#[test]
fn test_multiple_games() {
    let (world, systems) = spawn_game();

    // Create two games
    set_contract_address(PLAYER1());
    set_account_contract_address(PLAYER1());
    let game1 = systems.game.create_game();
    let game2 = systems.game.create_game();

    assert!(game1 == 1, "First game id should be 1");
    assert!(game2 == 2, "Second game id should be 2");

    let g1: Game = world.read_model(game1);
    let g2: Game = world.read_model(game2);
    assert!(g1.player1 == PLAYER1(), "Game 1 player1");
    assert!(g2.player1 == PLAYER1(), "Game 2 player1");
}
