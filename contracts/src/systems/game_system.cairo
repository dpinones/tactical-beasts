#[inline]
pub fn NAME() -> ByteArray {
    "game_system"
}
use starknet::ContractAddress;

#[starknet::interface]
pub trait IGameSystem<T> {
    fn create_game(ref self: T) -> u32;
    fn create_friendly_game(ref self: T) -> u32;
    fn join_game(ref self: T, game_id: u32);
    fn set_team(ref self: T, game_id: u32, beast_1: u32, beast_2: u32, beast_3: u32);
    fn set_beast_config(ref self: T, beast_nft_address: ContractAddress);
    fn execute_turn(ref self: T, game_id: u32, actions: Array<crate::types::Action>);
    fn find_match(ref self: T) -> u32;
    fn cancel_matchmaking(ref self: T);
    fn abandon_game(ref self: T, game_id: u32);
}

#[starknet::interface]
pub trait IMinigameTokenData<T> {
    fn score(self: @T, token_id: u64) -> u64;
    fn game_over(self: @T, token_id: u64) -> bool;
}

#[dojo::contract]
pub mod game_system {
    use achievement::components::achievable::AchievableComponent;
    use core::hash::HashStateTrait;
    use core::poseidon::PoseidonTrait;
    use dojo::event::EventStorage;
    use dojo::model::ModelStorage;
    use dojo::world::{WorldStorage, WorldStorageTrait};
    use leaderboard::components::rankable::RankableComponent;
    use starknet::ContractAddress;
    use crate::constants::{
        ACTION_ATTACK, ACTION_CONSUMABLE_ATTACK, ACTION_MOVE, ACTION_WAIT, BEASTS_PER_PLAYER, BEAST_NFT_ADDRESS,
        DEFAULT_EXTRA_LIVES, GAME_STATUS_FINISHED, GAME_STATUS_PLAYING, GAME_STATUS_WAITING, LEADERBOARD_ID,
        MAINNET_CHAIN_ID, MAX_ROUNDS, NAMESPACE, TASK_FLAWLESS, TASK_WINNER, WIN_BONUS,
    };
    use crate::elements::achievements::{ACHIEVEMENT_COUNT, Achievement, AchievementTrait};
    use crate::events::index::{GameCreated, GameFinished, PlayerJoined};
    use crate::interfaces::{IBeastsDispatcher, IBeastsDispatcherTrait, IERC721Dispatcher, IERC721DispatcherTrait};
    use crate::logic::{beast, board, combat};
    use crate::models::index::{
        BeastConfig, BeastState, Game, GameConfig, GameToken, GameTokens, MapState, MatchmakingQueue, PlayerProfile,
        PlayerState,
    };
    use crate::systems::collection::{ICollectionDispatcher, ICollectionDispatcherTrait, NAME as COLLECTION_NAME};
    use crate::types::Action;
    use super::{IGameSystem, IMinigameTokenData};

    fn zero_address() -> ContractAddress {
        0.try_into().unwrap()
    }

    // Components

    component!(path: RankableComponent, storage: rankable, event: RankableEvent);
    impl RankableInternalImpl = RankableComponent::InternalImpl<ContractState>;
    component!(path: AchievableComponent, storage: achievable, event: AchievableEvent);
    impl AchievableInternalImpl = AchievableComponent::InternalImpl<ContractState>;

    #[storage]
    struct Storage {
        #[substorage(v0)]
        rankable: RankableComponent::Storage,
        #[substorage(v0)]
        achievable: AchievableComponent::Storage,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        #[flat]
        RankableEvent: RankableComponent::Event,
        #[flat]
        AchievableEvent: AchievableComponent::Event,
    }

    fn dojo_init(ref self: ContractState) {
        let mut world = self.world(@NAMESPACE());
        let config = GameConfig { id: 0, game_count: 0, token_count: 0 };
        world.write_model(@config);

        // Initialize leaderboard (top 100)
        self.rankable.set(LEADERBOARD_ID, 100);

        // Register achievements
        let mut achievement_id: u8 = ACHIEVEMENT_COUNT;
        while achievement_id > 0 {
            let achievement: Achievement = achievement_id.into();
            self
                .achievable
                .create(
                    world,
                    id: achievement.identifier(),
                    rewarder: 0.try_into().unwrap(),
                    start: 0,
                    end: 0,
                    tasks: achievement.tasks(),
                    metadata: achievement.metadata(),
                    to_store: true,
                );
            achievement_id -= 1;
        };
    }

    #[abi(embed_v0)]
    impl GameSystemImpl of IGameSystem<ContractState> {
        fn create_game(ref self: ContractState) -> u32 {
            let mut world = self.world(@NAMESPACE());
            let caller = starknet::get_caller_address();
            _create_game(ref world, caller, false)
        }

        fn create_friendly_game(ref self: ContractState) -> u32 {
            let mut world = self.world(@NAMESPACE());
            let caller = starknet::get_caller_address();
            _create_game(ref world, caller, true)
        }

        fn join_game(ref self: ContractState, game_id: u32) {
            let mut world = self.world(@NAMESPACE());
            let caller = starknet::get_caller_address();
            _join_game(ref world, caller, game_id);
        }

        fn find_match(ref self: ContractState) -> u32 {
            let mut world = self.world(@NAMESPACE());
            let caller = starknet::get_caller_address();

            let queue: MatchmakingQueue = world.read_model(0);

            if queue.waiting_player == zero_address() {
                // No one waiting — create game and enter queue
                let game_id = _create_game(ref world, caller, false);
                world.write_model(@MatchmakingQueue { id: 0, waiting_player: caller, waiting_game_id: game_id });
                game_id
            } else {
                assert!(queue.waiting_player != caller, "Already in queue");
                // Match with waiting player
                let game_id = queue.waiting_game_id;
                _join_game(ref world, caller, game_id);
                // Clear queue
                world.write_model(@MatchmakingQueue { id: 0, waiting_player: zero_address(), waiting_game_id: 0 });
                game_id
            }
        }

        fn cancel_matchmaking(ref self: ContractState) {
            let mut world = self.world(@NAMESPACE());
            let caller = starknet::get_caller_address();

            let queue: MatchmakingQueue = world.read_model(0);
            assert!(queue.waiting_player == caller, "Not in queue");

            world.write_model(@MatchmakingQueue { id: 0, waiting_player: zero_address(), waiting_game_id: 0 });
        }

        fn abandon_game(ref self: ContractState, game_id: u32) {
            let mut world = self.world(@NAMESPACE());
            let caller = starknet::get_caller_address();

            let mut game: Game = world.read_model(game_id);
            assert!(
                game.status == GAME_STATUS_WAITING || game.status == GAME_STATUS_PLAYING, "Game is already finished",
            );
            assert!(caller == game.player1 || caller == game.player2, "Not a player in this game");

            let winner = if caller == game.player1 {
                game.player2
            } else {
                game.player1
            };

            game.status = GAME_STATUS_FINISHED;
            game.winner = winner;
            world.write_model(@game);

            let time = starknet::get_block_timestamp();
            world.emit_event(@GameFinished { game_id, winner, rounds: game.round, time });

            // Skip profile updates for friendly matches
            if !game.is_friendly {
                // Track abandon
                let mut abandoner_profile: PlayerProfile = world.read_model(caller);
                abandoner_profile.abandons += 1;
                abandoner_profile.losses += 1;
                world.write_model(@abandoner_profile);

                // Update winner profile only if opponent exists
                if winner != zero_address() {
                    let winner_index: u8 = if winner == game.player1 {
                        1
                    } else {
                        2
                    };
                    let winner_kills = count_dead_beasts(ref world, game_id, if winner_index == 1 {
                        2
                    } else {
                        1
                    });
                    let winner_deaths = count_dead_beasts(ref world, game_id, winner_index);

                    let mut winner_profile: PlayerProfile = world.read_model(winner);
                    winner_profile.wins += 1;
                    winner_profile.total_kills += winner_kills;
                    winner_profile.total_deaths += winner_deaths;
                    world.write_model(@winner_profile);

                    // Also count kills/deaths for abandoner
                    let abandoner_index: u8 = if winner_index == 1 {
                        2
                    } else {
                        1
                    };
                    let abandoner_kills = count_dead_beasts(ref world, game_id, winner_index);
                    let abandoner_deaths = count_dead_beasts(ref world, game_id, abandoner_index);
                    let mut ap: PlayerProfile = world.read_model(caller);
                    ap.total_kills += abandoner_kills;
                    ap.total_deaths += abandoner_deaths;
                    world.write_model(@ap);
                }
            }
        }

        fn set_beast_config(ref self: ContractState, beast_nft_address: ContractAddress) {
            let mut world = self.world(@NAMESPACE());
            // TODO: add owner check
            world.write_model(@BeastConfig { id: 0, beast_nft_address });
        }

        fn set_team(ref self: ContractState, game_id: u32, beast_1: u32, beast_2: u32, beast_3: u32) {
            let mut world = self.world(@NAMESPACE());
            let caller = starknet::get_caller_address();

            let mut game: Game = world.read_model(game_id);
            assert!(game.status == GAME_STATUS_WAITING, "Game is not waiting");

            let player_index: u8 = if caller == game.player1 {
                assert!(!game.p1_team_set, "Team already set");
                game.p1_team_set = true;
                1
            } else if caller == game.player2 {
                assert!(!game.p2_team_set, "Team already set");
                game.p2_team_set = true;
                2
            } else {
                panic!("Not a player in this game");
                0
            };

            world.write_model(@game);

            let player_state = PlayerState {
                game_id, player: caller, player_index, beast_1, beast_2, beast_3, potion_used: false,
            };
            world.write_model(@player_state);
            create_beast(ref world, game_id, player_index, 0, beast_1, caller);
            create_beast(ref world, game_id, player_index, 1, beast_2, caller);
            create_beast(ref world, game_id, player_index, 2, beast_3, caller);

            try_start_game(ref world, game_id);
        }

        fn execute_turn(ref self: ContractState, game_id: u32, actions: Array<Action>) {
            let mut world = self.world(@NAMESPACE());
            let caller = starknet::get_caller_address();

            let mut game: Game = world.read_model(game_id);
            assert!(game.status == GAME_STATUS_PLAYING, "Game is not active");

            let attacker_addr = if game.current_attacker == 1 {
                game.player1
            } else {
                game.player2
            };
            assert!(caller == attacker_addr, "Not your turn");

            let attacker_index = game.current_attacker;
            let defender_index: u8 = if attacker_index == 1 {
                2
            } else {
                1
            };

            // Count alive beasts for attacker
            let mut alive_count: u32 = 0;
            let b0: BeastState = world.read_model((game_id, attacker_index, 0_u8));
            let b1: BeastState = world.read_model((game_id, attacker_index, 1_u8));
            let b2: BeastState = world.read_model((game_id, attacker_index, 2_u8));
            if b0.alive {
                alive_count += 1;
            }
            if b1.alive {
                alive_count += 1;
            }
            if b2.alive {
                alive_count += 1;
            }

            assert!(actions.len() == alive_count, "Must provide action for each alive beast");

            // Resolve actions in order
            let mut i: u32 = 0;
            loop {
                if i >= actions.len() {
                    break;
                }
                let action = *actions.at(i);
                resolve_action(ref world, game_id, attacker_index, defender_index, action, game.round, caller);
                i += 1;
            }

            // Check victory
            let winner = check_victory(ref world, game_id);
            if winner != zero_address() {
                game.status = GAME_STATUS_FINISHED;
                game.winner = winner;
                world.write_model(@game);

                let time = starknet::get_block_timestamp();
                world.emit_event(@GameFinished { game_id, winner, rounds: game.round, time });

                // Skip ranking, achievements, and profile updates for friendly matches
                if !game.is_friendly {
                    // Calculate composite score and submit to leaderboard
                    let game_tokens: GameTokens = world.read_model(game_id);
                    let winner_token_id = if winner == game.player1 {
                        game_tokens.p1_token_id
                    } else {
                        game_tokens.p2_token_id
                    };
                    let score = compute_score(game.round);
                    let player_id: felt252 = winner.into();
                    self.rankable.submit(world, LEADERBOARD_ID, winner_token_id, player_id, score, time, true);

                    // Update collection metadata
                    let collection = get_collection(world);
                    collection.update(winner_token_id.into());

                    // Progress achievements — Winner task
                    self.achievable.progress(world, player_id, TASK_WINNER, 1, true);

                    // Check flawless victory (all 3 beasts alive)
                    let winner_index: u8 = if winner == game.player1 {
                        1
                    } else {
                        2
                    };
                    if all_beasts_alive(ref world, game_id, winner_index) {
                        self.achievable.progress(world, player_id, TASK_FLAWLESS, 1, true);
                    }

                    // Update player profiles
                    let loser = if winner == game.player1 {
                        game.player2
                    } else {
                        game.player1
                    };
                    update_profiles(ref world, game_id, winner, loser, winner_index);
                }
            } else {
                // Switch turn
                if game.current_attacker == 1 {
                    game.current_attacker = 2;
                } else {
                    game.current_attacker = 1;
                    game.round += 1;
                }
                world.write_model(@game);
            }
        }
    }

    #[abi(embed_v0)]
    impl MinigameTokenDataImpl of IMinigameTokenData<ContractState> {
        fn score(self: @ContractState, token_id: u64) -> u64 {
            let world = self.world(@NAMESPACE());
            let game_token: GameToken = world.read_model(token_id);
            let game: Game = world.read_model(game_token.match_id);
            if game.status == GAME_STATUS_FINISHED && game.winner == game_token.player {
                compute_score(game.round)
            } else {
                0
            }
        }

        fn game_over(self: @ContractState, token_id: u64) -> bool {
            let world = self.world(@NAMESPACE());
            let game_token: GameToken = world.read_model(token_id);
            let game: Game = world.read_model(game_token.match_id);
            game.status == GAME_STATUS_FINISHED
        }
    }

    // --- Internal helpers ---

    fn _create_game(ref world: WorldStorage, caller: ContractAddress, is_friendly: bool) -> u32 {
        let mut config: GameConfig = world.read_model(0);
        config.game_count += 1;
        let game_id = config.game_count;

        // Mint NFT for player1
        let collection = get_collection(world);
        let token_id = collection.mint(caller, false);
        config.token_count = token_id;
        world.write_model(@config);

        // Map token to match/player
        world.write_model(@GameToken { token_id, match_id: game_id, player: caller });
        world.write_model(@GameTokens { match_id: game_id, p1_token_id: token_id, p2_token_id: 0 });

        let game = Game {
            game_id,
            player1: caller,
            player2: zero_address(),
            status: GAME_STATUS_WAITING,
            current_attacker: 0,
            round: 0,
            winner: zero_address(),
            p1_team_set: false,
            p2_team_set: false,
            is_friendly,
        };
        world.write_model(@game);

        world.emit_event(@GameCreated { game_id, player1: caller, time: starknet::get_block_timestamp() });

        game_id
    }

    fn _join_game(ref world: WorldStorage, caller: ContractAddress, game_id: u32) {
        let mut game: Game = world.read_model(game_id);
        assert!(game.status == GAME_STATUS_WAITING, "Game is not waiting");
        assert!(game.player1 != caller, "Cannot join your own game");
        assert!(game.player2 == zero_address(), "Game already has two players");

        // Mint NFT for player2
        let collection = get_collection(world);
        let token_id = collection.mint(caller, false);

        let mut config: GameConfig = world.read_model(0);
        config.token_count = token_id;
        world.write_model(@config);

        // Map token to match/player
        world.write_model(@GameToken { token_id, match_id: game_id, player: caller });
        let mut game_tokens: GameTokens = world.read_model(game_id);
        game_tokens.p2_token_id = token_id;
        world.write_model(@game_tokens);

        game.player2 = caller;
        world.write_model(@game);

        // Generate dynamic obstacles for this match
        let map_state = board::generate_obstacles(game_id, game.player1, caller, starknet::get_block_timestamp());
        world.write_model(@map_state);

        world.emit_event(@PlayerJoined { game_id, player2: caller, time: starknet::get_block_timestamp() });
    }

    fn create_beast(
        ref world: WorldStorage,
        game_id: u32,
        player_index: u8,
        beast_index: u8,
        beast_id: u32,
        caller: ContractAddress,
    ) {
        let config: BeastConfig = world.read_model(0);
        let beast_nft_addr = if config.beast_nft_address != zero_address() {
            config.beast_nft_address
        } else {
            // Only use the hardcoded NFT address on mainnet; on local/testnet use zero (hardcoded mode)
            let chain_id = starknet::get_tx_info().unbox().chain_id;
            if chain_id == MAINNET_CHAIN_ID {
                let addr: ContractAddress = BEAST_NFT_ADDRESS.try_into().unwrap();
                addr
            } else {
                zero_address()
            }
        };

        let (beast_type, tier, level, hp) = if beast_nft_addr != zero_address() {
            // Real beasts mode: read from NFT contract
            let beast_dispatcher = IBeastsDispatcher { contract_address: beast_nft_addr };
            let erc721_dispatcher = IERC721Dispatcher { contract_address: beast_nft_addr };

            // Validate ownership on mainnet only
            let chain_id = starknet::get_tx_info().unbox().chain_id;
            if chain_id == MAINNET_CHAIN_ID {
                let owner = erc721_dispatcher.owner_of(beast_id.into());
                assert!(owner == caller, "Not beast owner");
            }

            // Read beast stats from NFT contract
            let packable = beast_dispatcher.get_beast(beast_id.into());
            let beast_type = beast::get_beast_type(packable.id.into());
            let tier = beast::derive_tier(packable.id);
            (beast_type, tier, packable.level, packable.health)
        } else {
            // Hardcoded mode (local dev / no config set)
            (
                beast::get_beast_type(beast_id),
                beast::get_beast_tier(beast_id),
                beast::get_beast_level(beast_id),
                beast::get_beast_hp(beast_id),
            )
        };

        let beast_state = BeastState {
            game_id,
            player_index,
            beast_index,
            beast_id,
            beast_type,
            tier,
            level,
            hp,
            hp_max: hp,
            extra_lives: DEFAULT_EXTRA_LIVES,
            position_row: 0,
            position_col: 0,
            alive: true,
        };
        world.write_model(@beast_state);
    }

    fn resolve_action(
        ref world: WorldStorage,
        game_id: u32,
        attacker_index: u8,
        defender_index: u8,
        action: Action,
        round: u16,
        caller: ContractAddress,
    ) {
        let mut attacker_beast: BeastState = world.read_model((game_id, attacker_index, action.beast_index));
        assert!(attacker_beast.alive, "Beast is not alive");

        if action.action_type == ACTION_WAIT {
            // Do nothing
            return;
        }

        if action.action_type == ACTION_MOVE {
            assert!(board::is_valid_cell(action.target_row, action.target_col), "Invalid cell");
            let map_state: MapState = world.read_model(game_id);
            assert!(!board::is_obstacle_in_map(map_state, action.target_row, action.target_col), "Cell is obstacle");

            let dist = board::hex_distance(
                attacker_beast.position_row, attacker_beast.position_col, action.target_row, action.target_col,
            );
            assert!(dist > 0, "Must move to a different cell");
            assert!(dist <= beast::get_move_range(attacker_beast.beast_id), "Out of move range");
            assert!(!is_cell_occupied(ref world, game_id, action.target_row, action.target_col), "Cell is occupied");

            attacker_beast.position_row = action.target_row;
            attacker_beast.position_col = action.target_col;
            world.write_model(@attacker_beast);
            return;
        }

        if action.action_type == ACTION_ATTACK || action.action_type == ACTION_CONSUMABLE_ATTACK {
            let use_potion = action.action_type == ACTION_CONSUMABLE_ATTACK;
            if use_potion {
                let mut ps: PlayerState = world.read_model((game_id, caller));
                assert!(!ps.potion_used, "Potion already used");
                ps.potion_used = true;
                world.write_model(@ps);
            }

            let mut defender_beast: BeastState = world.read_model((game_id, defender_index, action.target_index));
            assert!(defender_beast.alive, "Target is not alive");

            let dist = board::hex_distance(
                attacker_beast.position_row,
                attacker_beast.position_col,
                defender_beast.position_row,
                defender_beast.position_col,
            );
            assert!(dist <= beast::get_attack_range(attacker_beast.beast_id), "Out of attack range");

            // Calculate attack damage
            let seed = PoseidonTrait::new()
                .update(game_id.into())
                .update(round.into())
                .update(action.beast_index.into())
                .update(starknet::get_block_timestamp().into())
                .finalize();

            let is_crit = combat::roll_crit(beast::get_luck(attacker_beast.beast_id), seed);
            let damage = combat::calculate_damage(
                attacker_beast.level,
                attacker_beast.tier,
                attacker_beast.beast_type,
                defender_beast.beast_type,
                use_potion,
                is_crit,
            );

            apply_damage(ref defender_beast, damage);
            world.write_model(@defender_beast);

            // Counter-attack if defender survives
            if defender_beast.alive {
                let counter_seed = PoseidonTrait::new().update(seed).update('counter').finalize();

                let counter_crit = combat::roll_crit(beast::get_luck(defender_beast.beast_id), counter_seed);
                let counter_damage = combat::calculate_damage(
                    defender_beast.level,
                    defender_beast.tier,
                    defender_beast.beast_type,
                    attacker_beast.beast_type,
                    false,
                    counter_crit,
                );

                apply_damage(ref attacker_beast, counter_damage);
                world.write_model(@attacker_beast);
            }
            return;
        }

        panic!("Invalid action type");
    }

    fn apply_damage(ref beast_state: BeastState, damage: u16) {
        if damage >= beast_state.hp {
            if beast_state.extra_lives > 0 {
                beast_state.extra_lives -= 1;
                beast_state.hp = beast_state.hp_max;
            } else {
                beast_state.hp = 0;
                beast_state.alive = false;
            }
        } else {
            beast_state.hp -= damage;
        }
    }

    fn is_cell_occupied(ref world: WorldStorage, game_id: u32, row: u8, col: u8) -> bool {
        // Check all 6 beasts (3 per player)
        let mut player: u8 = 1;
        loop {
            if player > 2 {
                break false;
            }
            let mut i: u8 = 0;
            let result = loop {
                if i >= BEASTS_PER_PLAYER {
                    break false;
                }
                let b: BeastState = world.read_model((game_id, player, i));
                if b.alive && b.position_row == row && b.position_col == col {
                    break true;
                }
                i += 1;
            };
            if result {
                break true;
            }
            player += 1;
        }
    }

    fn check_victory(ref world: WorldStorage, game_id: u32) -> ContractAddress {
        let game: Game = world.read_model(game_id);

        let p1_alive = has_alive_beasts(ref world, game_id, 1);
        let p2_alive = has_alive_beasts(ref world, game_id, 2);

        if !p1_alive {
            game.player2
        } else if !p2_alive {
            game.player1
        } else {
            zero_address()
        }
    }

    fn has_alive_beasts(ref world: WorldStorage, game_id: u32, player_index: u8) -> bool {
        let b0: BeastState = world.read_model((game_id, player_index, 0_u8));
        if b0.alive {
            return true;
        }
        let b1: BeastState = world.read_model((game_id, player_index, 1_u8));
        if b1.alive {
            return true;
        }
        let b2: BeastState = world.read_model((game_id, player_index, 2_u8));
        b2.alive
    }

    fn compute_score(round: u16) -> u64 {
        let rounds_used: u64 = round.into();
        let max: u64 = MAX_ROUNDS.into();
        let bonus: u64 = WIN_BONUS.into();
        let round_score = if rounds_used < max {
            (max - rounds_used) * 10
        } else {
            0
        };
        round_score + bonus
    }

    fn all_beasts_alive(ref world: WorldStorage, game_id: u32, player_index: u8) -> bool {
        let b0: BeastState = world.read_model((game_id, player_index, 0_u8));
        let b1: BeastState = world.read_model((game_id, player_index, 1_u8));
        let b2: BeastState = world.read_model((game_id, player_index, 2_u8));
        b0.alive && b1.alive && b2.alive
    }

    fn get_collection(world: WorldStorage) -> ICollectionDispatcher {
        let (collection_address, _) = world.dns(@COLLECTION_NAME()).expect('Collection not found!');
        ICollectionDispatcher { contract_address: collection_address }
    }

    fn try_start_game(ref world: WorldStorage, game_id: u32) {
        let mut game: Game = world.read_model(game_id);
        if game.player2 != zero_address() && game.p1_team_set && game.p2_team_set {
            game.status = GAME_STATUS_PLAYING;
            game.round = 1;

            // TODO: randomize first attacker (e.g. VRF or commit-reveal)
            // Hardcoded to player 1 for now to keep tests deterministic
            game.current_attacker = 1;

            // Assign spawn positions
            assign_spawn_positions(ref world, game_id);

            // Increment games_played only for ranked matches
            if !game.is_friendly {
                let mut p1_profile: PlayerProfile = world.read_model(game.player1);
                p1_profile.games_played += 1;
                world.write_model(@p1_profile);

                let mut p2_profile: PlayerProfile = world.read_model(game.player2);
                p2_profile.games_played += 1;
                world.write_model(@p2_profile);
            }

            world.write_model(@game);
        }
    }

    fn count_dead_beasts(ref world: WorldStorage, game_id: u32, player_index: u8) -> u32 {
        let mut dead: u32 = 0;
        let b0: BeastState = world.read_model((game_id, player_index, 0_u8));
        let b1: BeastState = world.read_model((game_id, player_index, 1_u8));
        let b2: BeastState = world.read_model((game_id, player_index, 2_u8));
        if !b0.alive {
            dead += 1;
        }
        if !b1.alive {
            dead += 1;
        }
        if !b2.alive {
            dead += 1;
        }
        dead
    }

    fn update_profiles(
        ref world: WorldStorage, game_id: u32, winner: ContractAddress, loser: ContractAddress, winner_index: u8,
    ) {
        let loser_index: u8 = if winner_index == 1 {
            2
        } else {
            1
        };

        // Kills = enemy beasts dead, Deaths = own beasts dead
        let winner_kills = count_dead_beasts(ref world, game_id, loser_index);
        let winner_deaths = count_dead_beasts(ref world, game_id, winner_index);
        let loser_kills = count_dead_beasts(ref world, game_id, winner_index);
        let loser_deaths = count_dead_beasts(ref world, game_id, loser_index);

        // Winner profile
        let mut wp: PlayerProfile = world.read_model(winner);
        wp.wins += 1;
        wp.total_kills += winner_kills;
        wp.total_deaths += winner_deaths;
        world.write_model(@wp);

        // Loser profile
        let mut lp: PlayerProfile = world.read_model(loser);
        lp.losses += 1;
        lp.total_kills += loser_kills;
        lp.total_deaths += loser_deaths;
        world.write_model(@lp);
    }

    fn assign_spawn_positions(ref world: WorldStorage, game_id: u32) {
        let mut player: u8 = 1;
        loop {
            if player > 2 {
                break;
            }
            let mut i: u8 = 0;
            loop {
                if i >= BEASTS_PER_PLAYER {
                    break;
                }
                let mut beast_state: BeastState = world.read_model((game_id, player, i));
                let (row, col) = board::get_spawn_position(player, i);
                beast_state.position_row = row;
                beast_state.position_col = col;
                world.write_model(@beast_state);
                i += 1;
            }
            player += 1;
        };
    }
}
