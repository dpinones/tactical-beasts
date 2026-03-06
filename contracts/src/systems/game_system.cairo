#[inline]
pub fn NAME() -> ByteArray {
    "game_system"
}

#[starknet::interface]
pub trait IGameSystem<T> {
    fn create_game(ref self: T) -> u32;
    fn join_game(ref self: T, game_id: u32);
    fn commit_move(ref self: T, game_id: u32, commitment: felt252);
    fn reveal_move(ref self: T, game_id: u32, move_value: u8, salt: felt252);
    fn claim_timeout(ref self: T, game_id: u32);
}

#[starknet::interface]
pub trait IMinigameTokenData<T> {
    fn score(self: @T, token_id: u64) -> u32;
    fn game_over(self: @T, token_id: u64) -> bool;
}

#[dojo::contract]
pub mod game_system {
    use core::hash::HashStateTrait;
    use core::poseidon::PoseidonTrait;
    use dojo::event::EventStorage;
    use dojo::model::ModelStorage;
    use starknet::ContractAddress;

    fn zero_address() -> ContractAddress {
        0.try_into().unwrap()
    }
    use crate::constants::{
        DEFAULT_TIMEOUT, GAME_STATUS_COMMITTING, GAME_STATUS_FINISHED, GAME_STATUS_REVEALING, GAME_STATUS_WAITING,
        MOVE_NONE, MOVE_PAPER, MOVE_ROCK, MOVE_SCISSORS, NAMESPACE,
    };
    use crate::events::index::{GameCreated, GameFinished, MoveCommitted, MoveRevealed, PlayerJoined};
    use crate::models::index::{Game, GameConfig, PlayerCommit};
    use super::{IGameSystem, IMinigameTokenData};

    #[storage]
    struct Storage {}

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {}

    fn dojo_init(ref self: ContractState) {
        let mut world = self.world(@NAMESPACE());
        let config = GameConfig { id: 0, game_count: 0, timeout_duration: DEFAULT_TIMEOUT };
        world.write_model(@config);
    }

    #[abi(embed_v0)]
    impl GameSystemImpl of IGameSystem<ContractState> {
        fn create_game(ref self: ContractState) -> u32 {
            let mut world = self.world(@NAMESPACE());
            let caller = starknet::get_caller_address();

            // Read and increment game counter
            let mut config: GameConfig = world.read_model(0);
            config.game_count += 1;
            let game_id = config.game_count;
            world.write_model(@config);

            // Create new game
            let game = Game {
                game_id,
                player1: caller,
                player2: zero_address(),
                status: GAME_STATUS_WAITING,
                winner: zero_address(),
                player1_move: MOVE_NONE,
                player2_move: MOVE_NONE,
                committed_at: 0,
            };
            world.write_model(@game);

            // Emit event
            world.emit_event(@GameCreated { game_id, player1: caller, time: starknet::get_block_timestamp() });

            game_id
        }

        fn join_game(ref self: ContractState, game_id: u32) {
            let mut world = self.world(@NAMESPACE());
            let caller = starknet::get_caller_address();

            let mut game: Game = world.read_model(game_id);
            assert!(game.status == GAME_STATUS_WAITING, "Game is not waiting for players");
            assert!(game.player1 != caller, "Cannot join your own game");

            game.player2 = caller;
            game.status = GAME_STATUS_COMMITTING;
            world.write_model(@game);

            world.emit_event(@PlayerJoined { game_id, player2: caller, time: starknet::get_block_timestamp() });
        }

        fn commit_move(ref self: ContractState, game_id: u32, commitment: felt252) {
            let mut world = self.world(@NAMESPACE());
            let caller = starknet::get_caller_address();

            let game: Game = world.read_model(game_id);
            assert!(game.status == GAME_STATUS_COMMITTING, "Game is not in commit phase");
            assert!(caller == game.player1 || caller == game.player2, "You are not a player in this game");

            // Check player hasn't already committed
            let existing_commit: PlayerCommit = world.read_model((game_id, caller));
            assert!(existing_commit.commitment == 0, "Already committed");

            // Save commitment
            let player_commit = PlayerCommit { game_id, player: caller, commitment, revealed: false };
            world.write_model(@player_commit);

            world.emit_event(@MoveCommitted { game_id, player: caller, time: starknet::get_block_timestamp() });

            // Check if both players have committed
            let other_player = if caller == game.player1 {
                game.player2
            } else {
                game.player1
            };
            let other_commit: PlayerCommit = world.read_model((game_id, other_player));
            if other_commit.commitment != 0 {
                // Both committed, move to reveal phase
                let mut game: Game = world.read_model(game_id);
                game.status = GAME_STATUS_REVEALING;
                game.committed_at = starknet::get_block_timestamp();
                world.write_model(@game);
            }
        }

        fn reveal_move(ref self: ContractState, game_id: u32, move_value: u8, salt: felt252) {
            let mut world = self.world(@NAMESPACE());
            let caller = starknet::get_caller_address();

            let game: Game = world.read_model(game_id);
            assert!(game.status == GAME_STATUS_REVEALING, "Game is not in reveal phase");
            assert!(caller == game.player1 || caller == game.player2, "You are not a player in this game");
            assert!(move_value == MOVE_ROCK || move_value == MOVE_PAPER || move_value == MOVE_SCISSORS, "Invalid move");

            // Verify commitment hash
            let mut player_commit: PlayerCommit = world.read_model((game_id, caller));
            assert!(!player_commit.revealed, "Already revealed");

            let expected = PoseidonTrait::new().update(move_value.into()).update(salt).finalize();
            assert!(player_commit.commitment == expected, "Hash mismatch");

            // Mark as revealed
            player_commit.revealed = true;
            world.write_model(@player_commit);

            // Store the move on the game
            let mut game: Game = world.read_model(game_id);
            if caller == game.player1 {
                game.player1_move = move_value;
            } else {
                game.player2_move = move_value;
            }

            world
                .emit_event(
                    @MoveRevealed { game_id, player: caller, move_value, time: starknet::get_block_timestamp() },
                );

            // Check if both revealed
            let other_player = if caller == game.player1 {
                game.player2
            } else {
                game.player1
            };
            let other_commit: PlayerCommit = world.read_model((game_id, other_player));
            if other_commit.revealed {
                // Both revealed — determine winner
                let winner = determine_winner(game.player1, game.player2, game.player1_move, game.player2_move);
                game.winner = winner;
                game.status = GAME_STATUS_FINISHED;
                world.write_model(@game);

                world
                    .emit_event(
                        @GameFinished {
                            game_id,
                            winner,
                            player1_move: game.player1_move,
                            player2_move: game.player2_move,
                            time: starknet::get_block_timestamp(),
                        },
                    );
            } else {
                world.write_model(@game);
            }
        }

        fn claim_timeout(ref self: ContractState, game_id: u32) {
            let mut world = self.world(@NAMESPACE());
            let caller = starknet::get_caller_address();

            let mut game: Game = world.read_model(game_id);
            assert!(game.status == GAME_STATUS_REVEALING, "Game is not in reveal phase");
            assert!(caller == game.player1 || caller == game.player2, "You are not a player in this game");

            let config: GameConfig = world.read_model(0);
            let now = starknet::get_block_timestamp();
            assert!(now >= game.committed_at + config.timeout_duration, "Timeout not reached");

            // Caller must have revealed, opponent must not have
            let caller_commit: PlayerCommit = world.read_model((game_id, caller));
            assert!(caller_commit.revealed, "You must reveal before claiming timeout");

            let opponent = if caller == game.player1 {
                game.player2
            } else {
                game.player1
            };
            let opponent_commit: PlayerCommit = world.read_model((game_id, opponent));
            assert!(!opponent_commit.revealed, "Opponent already revealed");

            // Caller wins by timeout
            game.winner = caller;
            game.status = GAME_STATUS_FINISHED;
            world.write_model(@game);

            world
                .emit_event(
                    @GameFinished {
                        game_id,
                        winner: caller,
                        player1_move: game.player1_move,
                        player2_move: game.player2_move,
                        time: starknet::get_block_timestamp(),
                    },
                );
        }
    }

    #[abi(embed_v0)]
    impl MinigameTokenDataImpl of IMinigameTokenData<ContractState> {
        fn score(self: @ContractState, token_id: u64) -> u32 {
            let world = self.world(@NAMESPACE());
            let game_id: u32 = token_id.try_into().unwrap();
            let game: Game = world.read_model(game_id);
            if game.status == GAME_STATUS_FINISHED && game.winner != zero_address() {
                1 // Has a winner
            } else {
                0 // Draw or in progress
            }
        }

        fn game_over(self: @ContractState, token_id: u64) -> bool {
            let world = self.world(@NAMESPACE());
            let game_id: u32 = token_id.try_into().unwrap();
            let game: Game = world.read_model(game_id);
            game.status == GAME_STATUS_FINISHED
        }
    }

    fn determine_winner(player1: ContractAddress, player2: ContractAddress, move1: u8, move2: u8) -> ContractAddress {
        if move1 == move2 {
            // Draw
            zero_address()
        } else if (move1 == MOVE_ROCK && move2 == MOVE_SCISSORS)
            || (move1 == MOVE_PAPER && move2 == MOVE_ROCK)
            || (move1 == MOVE_SCISSORS && move2 == MOVE_PAPER) {
            player1
        } else {
            player2
        }
    }
}
