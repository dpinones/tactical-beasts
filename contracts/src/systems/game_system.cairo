#[inline]
pub fn NAME() -> ByteArray {
    "game_system"
}
use starknet::ContractAddress;

#[starknet::interface]
pub trait IGameSystem<T> {
    fn create_game(ref self: T) -> u32;
    fn create_game_with_settings(ref self: T, settings_id: u32) -> u32;
    fn create_friendly_game(ref self: T) -> u32;
    fn join_game(ref self: T, game_id: u32);
    fn set_team(ref self: T, game_id: u32, beast_1: u32, beast_2: u32, beast_3: u32);
    fn set_team_dynamic(ref self: T, game_id: u32, beasts: Array<u32>);
    fn set_beast_config(ref self: T, beast_nft_address: ContractAddress);
    fn execute_turn(ref self: T, game_id: u32, actions: Array<crate::types::Action>);
    fn find_match(ref self: T) -> u32;
    fn cancel_matchmaking(ref self: T);
    fn abandon_game(ref self: T, game_id: u32);
    fn create_settings(
        ref self: T,
        name: ByteArray,
        description: ByteArray,
        min_tier: u8,
        max_tier: u8,
        max_t2_per_team: u8,
        max_t3_per_team: u8,
        beasts_per_player: u8,
    ) -> u32;
    fn settings_count(self: @T) -> u32;
    fn settings_details(self: @T, settings_id: u32) -> crate::models::index::GameSettings;
}

#[dojo::contract]
pub mod game_system {
    use core::hash::HashStateTrait;
    use core::poseidon::PoseidonTrait;
    use dojo::event::EventStorage;
    use dojo::model::ModelStorage;
    use dojo::world::{WorldStorage, WorldStorageTrait};
    use game_components_embeddable_game_standard::minigame::extensions::settings::interface::IMinigameSettings;
    use game_components_embeddable_game_standard::minigame::interface::IMinigameTokenData;
    use game_components_embeddable_game_standard::minigame::minigame::{
        assert_token_ownership, mint, post_action, pre_action,
    };
    use game_components_embeddable_game_standard::minigame::minigame_component::MinigameComponent;
    use openzeppelin_introspection::src5::SRC5Component;
    use starknet::ContractAddress;
    use starknet::storage::{StoragePointerReadAccess, StoragePointerWriteAccess};
    use crate::constants::{
        ACTION_ATTACK, ACTION_CONSUMABLE_ATTACK, ACTION_MOVE, BEASTS_PER_PLAYER, BEAST_NFT_ADDRESS,
        COUNTER_ATTACK_PCT, DEFAULT_BEAST_TOKEN_MIN, DEFAULT_EXTRA_LIVES, DEFAULT_MAX_T2_PER_TEAM,
        DEFAULT_MAX_T3_PER_TEAM, GAME_STATUS_FINISHED, GAME_STATUS_PLAYING, GAME_STATUS_WAITING,
        MAINNET_CHAIN_ID, MAX_BEASTS_PER_PLAYER, MIN_DAMAGE, MIN_TIER, MAX_TIER, NAMESPACE,
        PASSIVE_EXPOSED_PENALTY, PASSIVE_FIRST_STRIKE_BONUS, PASSIVE_FORTIFY_REDUCTION,
        PASSIVE_RAGE_BONUS, PASSIVE_REGEN_BONUS_HP, PASSIVE_SIPHON_HEAL, SUBCLASS_BERSERKER,
        SUBCLASS_ENCHANTER, SUBCLASS_JUGGERNAUT, SUBCLASS_RANGER, SUBCLASS_STALKER, SUBCLASS_WARLOCK,
    };
    use crate::events::index::{GameCreated, GameFinished, PlayerJoined};
    use crate::interfaces::{IBeastsDispatcher, IBeastsDispatcherTrait, IERC721Dispatcher, IERC721DispatcherTrait};
    use crate::logic::{beast, board, combat};
    use crate::models::index::{
        BeastConfig, BeastState, Game, GameConfig, GameSettings, GameToken, GameTokens, MapState, MatchmakingQueue,
        PlayerProfile, PlayerState, TokenScore,
    };
    use crate::types::Action;
    use super::IGameSystem;

    fn zero_address() -> ContractAddress {
        0.try_into().unwrap()
    }

    /// Resolves settings_id to GameSettings. settings_id=0 maps to default (1).
    fn get_settings(ref world: WorldStorage, settings_id: u32) -> GameSettings {
        let resolved = if settings_id == 0 { 1 } else { settings_id };
        world.read_model(resolved)
    }

    // Components

    component!(path: MinigameComponent, storage: minigame, event: MinigameEvent);
    #[abi(embed_v0)]
    impl MinigameImpl = MinigameComponent::MinigameImpl<ContractState>;
    impl MinigameInternalImpl = MinigameComponent::InternalImpl<ContractState>;

    component!(path: SRC5Component, storage: src5, event: SRC5Event);
    #[abi(embed_v0)]
    impl SRC5Impl = SRC5Component::SRC5Impl<ContractState>;

    #[storage]
    struct Storage {
        #[substorage(v0)]
        minigame: MinigameComponent::Storage,
        #[substorage(v0)]
        src5: SRC5Component::Storage,
        denshokan_address: ContractAddress,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        #[flat]
        MinigameEvent: MinigameComponent::Event,
        #[flat]
        SRC5Event: SRC5Component::Event,
    }

    fn dojo_init(
        ref self: ContractState,
        creator_address: ContractAddress,
        denshokan_address: ContractAddress,
    ) {
        self.denshokan_address.write(denshokan_address);

        // Initialize MinigameComponent only when Denshokan is deployed
        if denshokan_address != zero_address() {
            self
                .minigame
                .initializer(
                    creator_address,
                    "Tactical Beasts",
                    "Tactical turn-based grid combat game on Starknet",
                    "Provable Games",
                    "Provable Games",
                    "Strategy",
                    "",
                    Option::None,
                    Option::None,
                    Option::None,
                    Option::None,
                    Option::None,
                    denshokan_address,
                    Option::None,
                    Option::None,
                    1,
                );
        }

        let mut world = self.world(@NAMESPACE());
        let config = GameConfig { id: 0, game_count: 0, token_count: 0, settings_count: 1 };
        world.write_model(@config);

        // Write default settings (settings_id=1)
        let default_settings = GameSettings {
            settings_id: 1,
            min_tier: MIN_TIER,
            max_tier: MAX_TIER,
            max_t2_per_team: DEFAULT_MAX_T2_PER_TEAM,
            max_t3_per_team: DEFAULT_MAX_T3_PER_TEAM,
            beasts_per_player: BEASTS_PER_PLAYER,
        };
        world.write_model(@default_settings);
    }

    #[abi(embed_v0)]
    impl GameSystemImpl of IGameSystem<ContractState> {
        fn create_game(ref self: ContractState) -> u32 {
            let mut world = self.world(@NAMESPACE());
            let denshokan = self.denshokan_address.read();
            let caller = starknet::get_caller_address();
            _create_game(ref world, denshokan, caller, false, 1)
        }

        fn create_game_with_settings(ref self: ContractState, settings_id: u32) -> u32 {
            let mut world = self.world(@NAMESPACE());
            let denshokan = self.denshokan_address.read();
            let caller = starknet::get_caller_address();
            let resolved = if settings_id == 0 { 1 } else { settings_id };
            let config: GameConfig = world.read_model(0);
            assert!(resolved <= config.settings_count, "Settings do not exist");
            _create_game(ref world, denshokan, caller, false, resolved)
        }

        fn create_friendly_game(ref self: ContractState) -> u32 {
            let mut world = self.world(@NAMESPACE());
            let denshokan = self.denshokan_address.read();
            let caller = starknet::get_caller_address();
            _create_game(ref world, denshokan, caller, true, 1)
        }

        fn join_game(ref self: ContractState, game_id: u32) {
            let mut world = self.world(@NAMESPACE());
            let denshokan = self.denshokan_address.read();
            let caller = starknet::get_caller_address();
            _join_game(ref world, denshokan, caller, game_id);
        }

        fn find_match(ref self: ContractState) -> u32 {
            let mut world = self.world(@NAMESPACE());
            let denshokan = self.denshokan_address.read();
            let caller = starknet::get_caller_address();

            let queue: MatchmakingQueue = world.read_model(0);

            if queue.waiting_player == zero_address() {
                let game_id = _create_game(ref world, denshokan, caller, false, 1);
                world.write_model(@MatchmakingQueue { id: 0, waiting_player: caller, waiting_game_id: game_id });
                game_id
            } else {
                assert!(queue.waiting_player != caller, "Already in queue");
                let game_id = queue.waiting_game_id;
                _join_game(ref world, denshokan, caller, game_id);
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
            let denshokan = self.denshokan_address.read();

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

            // Post-action on caller's token (sync game_over state)
            let game_tokens: GameTokens = world.read_model(game_id);
            let caller_token = if caller == game.player1 {
                game_tokens.p1_token_id
            } else {
                game_tokens.p2_token_id
            };
            if denshokan != zero_address() {
                post_action(denshokan, caller_token);
            }

            // Skip profile/score updates for friendly matches
            if !game.is_friendly {
                let settings = get_settings(ref world, game.settings_id);
                let bpp = settings.beasts_per_player;

                let mut abandoner_profile: PlayerProfile = world.read_model(caller);
                abandoner_profile.abandons += 1;
                abandoner_profile.losses += 1;
                world.write_model(@abandoner_profile);

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
                    }, bpp);
                    let winner_deaths = count_dead_beasts(ref world, game_id, winner_index, bpp);

                    let mut winner_profile: PlayerProfile = world.read_model(winner);
                    winner_profile.wins += 1;
                    winner_profile.total_kills += winner_kills;
                    winner_profile.total_deaths += winner_deaths;
                    world.write_model(@winner_profile);

                    let abandoner_index: u8 = if winner_index == 1 {
                        2
                    } else {
                        1
                    };
                    let abandoner_kills = count_dead_beasts(ref world, game_id, winner_index, bpp);
                    let abandoner_deaths = count_dead_beasts(ref world, game_id, abandoner_index, bpp);
                    let mut ap: PlayerProfile = world.read_model(caller);
                    ap.total_kills += abandoner_kills;
                    ap.total_deaths += abandoner_deaths;
                    world.write_model(@ap);

                    // Update token scores
                    let (winner_token, loser_token) = if winner == game.player1 {
                        (game_tokens.p1_token_id, game_tokens.p2_token_id)
                    } else {
                        (game_tokens.p2_token_id, game_tokens.p1_token_id)
                    };
                    update_token_scores(
                        ref world, game_id, winner, caller, winner_index, winner_token, loser_token, bpp,
                    );
                }
            }
        }

        fn set_beast_config(ref self: ContractState, beast_nft_address: ContractAddress) {
            let mut world = self.world(@NAMESPACE());
            world.write_model(@BeastConfig { id: 0, beast_nft_address });
        }

        fn create_settings(
            ref self: ContractState,
            name: ByteArray,
            description: ByteArray,
            min_tier: u8,
            max_tier: u8,
            max_t2_per_team: u8,
            max_t3_per_team: u8,
            beasts_per_player: u8,
        ) -> u32 {
            let mut world = self.world(@NAMESPACE());
            // Validate parameters
            assert!(min_tier >= 1 && min_tier <= 5, "Invalid min_tier");
            assert!(max_tier >= min_tier && max_tier <= 5, "Invalid max_tier");
            assert!(beasts_per_player >= 1 && beasts_per_player <= MAX_BEASTS_PER_PLAYER, "Invalid beasts_per_player");

            let mut config: GameConfig = world.read_model(0);
            config.settings_count += 1;
            let settings_id = config.settings_count;
            world.write_model(@config);

            let settings = GameSettings { settings_id, min_tier, max_tier, max_t2_per_team, max_t3_per_team, beasts_per_player };
            world.write_model(@settings);

            settings_id
        }

        fn settings_count(self: @ContractState) -> u32 {
            let world = self.world(@NAMESPACE());
            let config: GameConfig = world.read_model(0);
            config.settings_count
        }

        fn settings_details(self: @ContractState, settings_id: u32) -> GameSettings {
            let world = self.world(@NAMESPACE());
            let config: GameConfig = world.read_model(0);
            assert!(settings_id >= 1 && settings_id <= config.settings_count, "Settings do not exist");
            world.read_model(settings_id)
        }

        fn set_team(ref self: ContractState, game_id: u32, beast_1: u32, beast_2: u32, beast_3: u32) {
            self.set_team_dynamic(game_id, array![beast_1, beast_2, beast_3]);
        }

        fn set_team_dynamic(ref self: ContractState, game_id: u32, beasts: Array<u32>) {
            let mut world = self.world(@NAMESPACE());
            let caller = starknet::get_caller_address();

            let mut game: Game = world.read_model(game_id);
            assert!(game.status == GAME_STATUS_WAITING, "Game is not waiting");

            let settings = get_settings(ref world, game.settings_id);

            assert!(beasts.len() == settings.beasts_per_player.into(), "Wrong number of beasts");

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

            let beast_1 = if beasts.len() > 0 { *beasts.at(0) } else { 0 };
            let beast_2 = if beasts.len() > 1 { *beasts.at(1) } else { 0 };
            let beast_3 = if beasts.len() > 2 { *beasts.at(2) } else { 0 };
            let beast_4 = if beasts.len() > 3 { *beasts.at(3) } else { 0 };

            let player_state = PlayerState {
                game_id, player: caller, player_index, beast_1, beast_2, beast_3, beast_4, potion_used: false,
            };
            world.write_model(@player_state);

            let mut i: u32 = 0;
            while i < beasts.len() {
                create_beast(ref world, game_id, player_index, i.try_into().unwrap(), *beasts.at(i), caller, @settings);
                i += 1;
            };

            validate_team_tiers(ref world, game_id, player_index, @settings);

            try_start_game(ref world, game_id);
        }

        fn execute_turn(ref self: ContractState, game_id: u32, actions: Array<Action>) {
            let mut world = self.world(@NAMESPACE());
            let caller = starknet::get_caller_address();
            let denshokan = self.denshokan_address.read();

            let mut game: Game = world.read_model(game_id);
            assert!(game.status == GAME_STATUS_PLAYING, "Game is not active");

            let attacker_addr = if game.current_attacker == 1 {
                game.player1
            } else {
                game.player2
            };
            assert!(caller == attacker_addr, "Not your turn");

            // EGS lifecycle: validate token ownership + playability
            if denshokan != zero_address() {
                let game_tokens: GameTokens = world.read_model(game_id);
                let caller_token = if caller == game.player1 {
                    game_tokens.p1_token_id
                } else {
                    game_tokens.p2_token_id
                };
                assert_token_ownership(denshokan, caller_token);
                pre_action(denshokan, caller_token);
            }

            let attacker_index = game.current_attacker;
            let defender_index: u8 = if attacker_index == 1 {
                2
            } else {
                1
            };

            let settings = get_settings(ref world, game.settings_id);

            // Count alive beasts for attacker
            let alive_count = count_alive_beasts(ref world, game_id, attacker_index, settings.beasts_per_player);

            assert!(actions.len() <= alive_count, "Too many actions");

            // Validate no duplicate beast_index
            let mut j: u32 = 0;
            loop {
                if j >= actions.len() {
                    break;
                }
                let mut k: u32 = j + 1;
                loop {
                    if k >= actions.len() {
                        break;
                    }
                    assert!(
                        (*actions.at(j)).beast_index != (*actions.at(k)).beast_index,
                        "Duplicate beast action",
                    );
                    k += 1;
                };
                j += 1;
            };

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

            // Reset last_moved for beasts that didn't act this turn
            let acted_beasts = @actions;
            let mut bi: u8 = 0;
            while bi < settings.beasts_per_player {
                let mut beast_s: BeastState = world.read_model((game_id, attacker_index, bi));
                if beast_s.alive {
                    let mut acted = false;
                    let mut ai: u32 = 0;
                    while ai < acted_beasts.len() {
                        if (*acted_beasts.at(ai)).beast_index == bi {
                            acted = true;
                        }
                        ai += 1;
                    };
                    if !acted {
                        beast_s.last_moved = false;
                        world.write_model(@beast_s);
                    }
                }
                bi += 1;
            };

            // Check victory
            let winner = check_victory(ref world, game_id, settings.beasts_per_player);
            if winner != zero_address() {
                game.status = GAME_STATUS_FINISHED;
                game.winner = winner;
                world.write_model(@game);

                let time = starknet::get_block_timestamp();
                world.emit_event(@GameFinished { game_id, winner, rounds: game.round, time });

                // EGS: post_action on winner's token to sync game_over
                if denshokan != zero_address() {
                    let game_tokens: GameTokens = world.read_model(game_id);
                    let winner_token = if winner == game.player1 {
                        game_tokens.p1_token_id
                    } else {
                        game_tokens.p2_token_id
                    };
                    post_action(denshokan, winner_token);
                }

                // Update player profiles and token scores (skip for friendly matches)
                if !game.is_friendly {
                    let winner_index: u8 = if winner == game.player1 {
                        1
                    } else {
                        2
                    };
                    let loser = if winner == game.player1 {
                        game.player2
                    } else {
                        game.player1
                    };
                    let bpp = settings.beasts_per_player;
                    update_profiles(ref world, game_id, winner, loser, winner_index, bpp);

                    let game_tokens: GameTokens = world.read_model(game_id);
                    let (winner_token, loser_token) = if winner == game.player1 {
                        (game_tokens.p1_token_id, game_tokens.p2_token_id)
                    } else {
                        (game_tokens.p2_token_id, game_tokens.p1_token_id)
                    };
                    update_token_scores(
                        ref world, game_id, winner, loser, winner_index, winner_token, loser_token, bpp,
                    );
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

    // --- EGS: IMinigameTokenData ---
    //
    // A token represents a player's full tournament participation.
    // score() returns accumulated stats across all non-friendly matches.
    // game_over() is true when the tournament end_time has passed (or for
    // non-tournament tokens, when the single match finishes).

    #[abi(embed_v0)]
    impl TokenDataImpl of IMinigameTokenData<ContractState> {
        fn score(self: @ContractState, token_id: felt252) -> u64 {
            let world = self.world(@NAMESPACE());
            let ts: TokenScore = world.read_model(token_id);
            compute_score(ts)
        }

        fn game_over(self: @ContractState, token_id: felt252) -> bool {
            let world = self.world(@NAMESPACE());
            let game_token: GameToken = world.read_model(token_id);

            // Tournament token: game_over when time expires
            if game_token.end_time > 0 {
                return starknet::get_block_timestamp() >= game_token.end_time;
            }

            // Non-tournament token (dev/casual): game_over when match finishes
            if game_token.match_id > 0 {
                let game: Game = world.read_model(game_token.match_id);
                return game.status == GAME_STATUS_FINISHED;
            }

            false
        }

        fn score_batch(self: @ContractState, token_ids: Span<felt252>) -> Array<u64> {
            let mut scores = array![];
            for id in token_ids {
                scores.append(self.score(*id));
            };
            scores
        }

        fn game_over_batch(self: @ContractState, token_ids: Span<felt252>) -> Array<bool> {
            let mut results = array![];
            for id in token_ids {
                results.append(self.game_over(*id));
            };
            results
        }
    }

    // --- EGS: IMinigameSettings ---

    #[abi(embed_v0)]
    impl SettingsImpl of IMinigameSettings<ContractState> {
        fn settings_exist(self: @ContractState, settings_id: u32) -> bool {
            if settings_id == 0 {
                return true; // 0 means "use default"
            }
            let world = self.world(@NAMESPACE());
            let config: GameConfig = world.read_model(0);
            settings_id <= config.settings_count
        }

        fn settings_exist_batch(self: @ContractState, settings_ids: Span<u32>) -> Array<bool> {
            let mut results = array![];
            for settings_id in settings_ids {
                results.append(self.settings_exist(*settings_id));
            };
            results
        }
    }

    // --- Internal helpers ---

    fn _create_game(
        ref world: WorldStorage, denshokan: ContractAddress, caller: ContractAddress, is_friendly: bool, settings_id: u32,
    ) -> u32 {
        let mut config: GameConfig = world.read_model(0);
        config.game_count += 1;
        let game_id = config.game_count;

        // Mint game token via Denshokan (or fallback for dev/test)
        let token_id: felt252 = if denshokan != zero_address() {
            mint(
                denshokan,
                starknet::get_contract_address(),
                Option::None,
                Option::None,
                Option::Some(starknet::get_block_timestamp()),
                Option::None,
                Option::None,
                Option::None,
                Option::None,
                Option::None,
                Option::None,
                caller,
                false,
                false,
                0,
                0,
            )
        } else {
            // Dev/test fallback: generate token_id from counter
            config.token_count += 1;
            config.token_count.into()
        };

        world.write_model(@config);

        // Map token to match/player (PvP: 2 tokens per battle)
        world.write_model(@GameToken { token_id, match_id: game_id, player: caller, end_time: 0 });
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
            settings_id,
        };
        world.write_model(@game);

        world.emit_event(@GameCreated { game_id, player1: caller, time: starknet::get_block_timestamp() });

        game_id
    }

    fn _join_game(
        ref world: WorldStorage, denshokan: ContractAddress, caller: ContractAddress, game_id: u32,
    ) {
        let mut game: Game = world.read_model(game_id);
        assert!(game.status == GAME_STATUS_WAITING, "Game is not waiting");
        assert!(game.player1 != caller, "Cannot join your own game");
        assert!(game.player2 == zero_address(), "Game already has two players");

        // Mint game token for player2
        let mut config: GameConfig = world.read_model(0);
        let token_id: felt252 = if denshokan != zero_address() {
            mint(
                denshokan,
                starknet::get_contract_address(),
                Option::None,
                Option::None,
                Option::Some(starknet::get_block_timestamp()),
                Option::None,
                Option::None,
                Option::None,
                Option::None,
                Option::None,
                Option::None,
                caller,
                false,
                false,
                0,
                0,
            )
        } else {
            config.token_count += 1;
            config.token_count.into()
        };

        world.write_model(@config);

        // Map token to match/player
        world.write_model(@GameToken { token_id, match_id: game_id, player: caller, end_time: 0 });
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
        settings: @GameSettings,
    ) {
        let config: BeastConfig = world.read_model(0);
        let beast_nft_addr = if config.beast_nft_address != zero_address() {
            config.beast_nft_address
        } else {
            let chain_id = starknet::get_tx_info().unbox().chain_id;
            if chain_id == MAINNET_CHAIN_ID {
                let addr: ContractAddress = BEAST_NFT_ADDRESS.try_into().unwrap();
                addr
            } else {
                zero_address()
            }
        };

        let is_default_beast = beast_id >= DEFAULT_BEAST_TOKEN_MIN;
        let (species_id, beast_type, tier, level, hp) = if !is_default_beast
            && beast_nft_addr != zero_address() {
            let beast_dispatcher = IBeastsDispatcher { contract_address: beast_nft_addr };
            let erc721_dispatcher = IERC721Dispatcher { contract_address: beast_nft_addr };

            let chain_id = starknet::get_tx_info().unbox().chain_id;
            if chain_id == MAINNET_CHAIN_ID {
                let owner = erc721_dispatcher.owner_of(beast_id.into());
                assert!(owner == caller, "Not beast owner");
            }

            let packable = beast_dispatcher.get_beast(beast_id.into());
            let beast_type = beast::get_beast_type(packable.id.into());
            let tier = beast::derive_tier(packable.id);
            (packable.id, beast_type, tier, packable.level, packable.health)
        } else {
            let (species, tier, level, hp) = beast::get_beast_stats_by_token(beast_id);
            assert!(species > 0, "Unknown token_id");
            (species, beast::get_beast_type(species.into()), tier, level, hp)
        };

        let tier_val = beast::derive_tier(species_id);
        assert!(tier_val >= *settings.min_tier && tier_val <= *settings.max_tier, "Beast tier not allowed");

        let subclass = beast::get_subclass(species_id.into());
        let (final_hp, final_hp_max) = if subclass == SUBCLASS_ENCHANTER {
            let hp_u32: u32 = hp.into();
            let bonus: u16 = (hp_u32 * PASSIVE_REGEN_BONUS_HP / 100).try_into().unwrap();
            (hp + bonus, hp + bonus)
        } else {
            (hp, hp)
        };

        let beast_state = BeastState {
            game_id,
            player_index,
            beast_index,
            beast_id: species_id.into(),
            token_id: beast_id,
            beast_type,
            tier,
            level,
            hp: final_hp,
            hp_max: final_hp_max,
            extra_lives: DEFAULT_EXTRA_LIVES,
            position_row: 0,
            position_col: 0,
            alive: true,
            last_moved: false,
        };
        world.write_model(@beast_state);
    }

    fn validate_team_tiers(ref world: WorldStorage, game_id: u32, player_index: u8, settings: @GameSettings) {
        let mut t2_count: u8 = 0;
        let mut t3_count: u8 = 0;
        let mut i: u8 = 0;
        while i < *settings.beasts_per_player {
            let bs: BeastState = world.read_model((game_id, player_index, i));
            if bs.tier == 2 {
                t2_count += 1;
            } else if bs.tier == 3 {
                t3_count += 1;
            }
            i += 1;
        };
        assert!(t2_count <= *settings.max_t2_per_team, "Too many T2 beasts per team");
        assert!(t3_count <= *settings.max_t3_per_team, "Too many T3 beasts per team");
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
            attacker_beast.last_moved = true;
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

            let seed = PoseidonTrait::new()
                .update(game_id.into())
                .update(round.into())
                .update(action.beast_index.into())
                .update(starknet::get_block_timestamp().into())
                .finalize();

            let is_crit = combat::roll_crit(beast::get_luck(attacker_beast.beast_id), seed);
            let mut damage = combat::calculate_damage(
                attacker_beast.level,
                attacker_beast.tier,
                attacker_beast.beast_type,
                defender_beast.beast_type,
                use_potion,
                is_crit,
            );

            let atk_subclass = beast::get_subclass(attacker_beast.beast_id);

            if atk_subclass == SUBCLASS_BERSERKER && attacker_beast.hp * 2 < attacker_beast.hp_max {
                damage = combat::apply_passive_bonus(damage, PASSIVE_RAGE_BONUS);
            }

            if atk_subclass == SUBCLASS_STALKER && defender_beast.hp == defender_beast.hp_max {
                damage = combat::apply_passive_bonus(damage, PASSIVE_FIRST_STRIKE_BONUS);
            }

            let def_subclass = beast::get_subclass(defender_beast.beast_id);

            if def_subclass == SUBCLASS_JUGGERNAUT && !defender_beast.last_moved {
                damage = combat::apply_passive_reduction(damage, PASSIVE_FORTIFY_REDUCTION);
            }

            if def_subclass == SUBCLASS_RANGER && dist <= 1 {
                damage = combat::apply_passive_bonus(damage, PASSIVE_EXPOSED_PENALTY);
            }

            apply_damage(ref defender_beast, damage);
            world.write_model(@defender_beast);

            if atk_subclass == SUBCLASS_WARLOCK {
                let heal: u16 = (damage.into() * PASSIVE_SIPHON_HEAL / 100).try_into().unwrap();
                if heal > 0 {
                    attacker_beast.hp = if attacker_beast.hp + heal > attacker_beast.hp_max {
                        attacker_beast.hp_max
                    } else {
                        attacker_beast.hp + heal
                    };
                }
            }

            attacker_beast.last_moved = false;

            if defender_beast.alive {
                let counter_seed = PoseidonTrait::new().update(seed).update('counter').finalize();

                let counter_crit = combat::roll_crit(beast::get_luck(defender_beast.beast_id), counter_seed);
                let full_counter: u32 = combat::calculate_damage(
                    defender_beast.level,
                    defender_beast.tier,
                    defender_beast.beast_type,
                    attacker_beast.beast_type,
                    false,
                    counter_crit,
                ).into();
                let counter_damage: u16 = ((full_counter * COUNTER_ATTACK_PCT) / 100)
                    .try_into().unwrap();
                let counter_damage = if counter_damage < MIN_DAMAGE { MIN_DAMAGE } else { counter_damage };

                apply_damage(ref attacker_beast, counter_damage);
            }
            world.write_model(@attacker_beast);
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
        let mut player: u8 = 1;
        loop {
            if player > 2 {
                break false;
            }
            let mut i: u8 = 0;
            let result = loop {
                if i >= MAX_BEASTS_PER_PLAYER {
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

    fn check_victory(ref world: WorldStorage, game_id: u32, beasts_per_player: u8) -> ContractAddress {
        let game: Game = world.read_model(game_id);

        let p1_alive = has_alive_beasts(ref world, game_id, 1, beasts_per_player);
        let p2_alive = has_alive_beasts(ref world, game_id, 2, beasts_per_player);

        if !p1_alive {
            game.player2
        } else if !p2_alive {
            game.player1
        } else {
            zero_address()
        }
    }

    fn has_alive_beasts(ref world: WorldStorage, game_id: u32, player_index: u8, beasts_per_player: u8) -> bool {
        let mut i: u8 = 0;
        loop {
            if i >= beasts_per_player {
                break false;
            }
            let b: BeastState = world.read_model((game_id, player_index, i));
            if b.alive {
                break true;
            }
            i += 1;
        }
    }

    // Score formula: accumulated across all non-friendly matches for this token.
    // win: +500, kill: +50, beast_alive at end: +30
    const SCORE_WIN: u64 = 500;
    const SCORE_PER_KILL: u64 = 50;
    const SCORE_PER_BEAST_ALIVE: u64 = 30;

    fn compute_score(ts: TokenScore) -> u64 {
        let wins: u64 = ts.wins.into();
        let kills: u64 = ts.kills.into();
        let alive: u64 = ts.beasts_alive.into();
        wins * SCORE_WIN + kills * SCORE_PER_KILL + alive * SCORE_PER_BEAST_ALIVE
    }

    fn count_alive_beasts(ref world: WorldStorage, game_id: u32, player_index: u8, beasts_per_player: u8) -> u32 {
        let mut alive: u32 = 0;
        let mut i: u8 = 0;
        while i < beasts_per_player {
            let b: BeastState = world.read_model((game_id, player_index, i));
            if b.alive {
                alive += 1;
            }
            i += 1;
        };
        alive
    }

    fn update_token_scores(
        ref world: WorldStorage,
        game_id: u32,
        winner: ContractAddress,
        loser: ContractAddress,
        winner_index: u8,
        winner_token: felt252,
        loser_token: felt252,
        beasts_per_player: u8,
    ) {
        let loser_index: u8 = if winner_index == 1 { 2 } else { 1 };

        let winner_kills = count_dead_beasts(ref world, game_id, loser_index, beasts_per_player);
        let winner_deaths = count_dead_beasts(ref world, game_id, winner_index, beasts_per_player);
        let winner_alive = count_alive_beasts(ref world, game_id, winner_index, beasts_per_player);
        let loser_kills = count_dead_beasts(ref world, game_id, winner_index, beasts_per_player);
        let loser_deaths = count_dead_beasts(ref world, game_id, loser_index, beasts_per_player);
        let loser_alive = count_alive_beasts(ref world, game_id, loser_index, beasts_per_player);

        let mut wts: TokenScore = world.read_model(winner_token);
        wts.wins += 1;
        wts.kills += winner_kills;
        wts.deaths += winner_deaths;
        wts.beasts_alive += winner_alive;
        wts.matches_played += 1;
        world.write_model(@wts);

        let mut lts: TokenScore = world.read_model(loser_token);
        lts.losses += 1;
        lts.kills += loser_kills;
        lts.deaths += loser_deaths;
        lts.beasts_alive += loser_alive;
        lts.matches_played += 1;
        world.write_model(@lts);
    }

    fn all_beasts_alive(ref world: WorldStorage, game_id: u32, player_index: u8, beasts_per_player: u8) -> bool {
        let mut i: u8 = 0;
        loop {
            if i >= beasts_per_player {
                break true;
            }
            let b: BeastState = world.read_model((game_id, player_index, i));
            if !b.alive {
                break false;
            }
            i += 1;
        }
    }

    fn try_start_game(ref world: WorldStorage, game_id: u32) {
        let mut game: Game = world.read_model(game_id);
        if game.player2 != zero_address() && game.p1_team_set && game.p2_team_set {
            game.status = GAME_STATUS_PLAYING;
            game.round = 1;
            game.current_attacker = 1;

            let settings = get_settings(ref world, game.settings_id);
            assign_spawn_positions(ref world, game_id, settings.beasts_per_player);

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

    fn count_dead_beasts(ref world: WorldStorage, game_id: u32, player_index: u8, beasts_per_player: u8) -> u32 {
        let mut dead: u32 = 0;
        let mut i: u8 = 0;
        while i < beasts_per_player {
            let b: BeastState = world.read_model((game_id, player_index, i));
            if !b.alive {
                dead += 1;
            }
            i += 1;
        };
        dead
    }

    fn update_profiles(
        ref world: WorldStorage, game_id: u32, winner: ContractAddress, loser: ContractAddress, winner_index: u8, beasts_per_player: u8,
    ) {
        let loser_index: u8 = if winner_index == 1 {
            2
        } else {
            1
        };

        let winner_kills = count_dead_beasts(ref world, game_id, loser_index, beasts_per_player);
        let winner_deaths = count_dead_beasts(ref world, game_id, winner_index, beasts_per_player);
        let loser_kills = count_dead_beasts(ref world, game_id, winner_index, beasts_per_player);
        let loser_deaths = count_dead_beasts(ref world, game_id, loser_index, beasts_per_player);

        let mut wp: PlayerProfile = world.read_model(winner);
        wp.wins += 1;
        wp.total_kills += winner_kills;
        wp.total_deaths += winner_deaths;
        world.write_model(@wp);

        let mut lp: PlayerProfile = world.read_model(loser);
        lp.losses += 1;
        lp.total_kills += loser_kills;
        lp.total_deaths += loser_deaths;
        world.write_model(@lp);
    }

    fn assign_spawn_positions(ref world: WorldStorage, game_id: u32, beasts_per_player: u8) {
        let mut player: u8 = 1;
        loop {
            if player > 2 {
                break;
            }
            let mut i: u8 = 0;
            loop {
                if i >= beasts_per_player {
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
