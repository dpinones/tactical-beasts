import type { SchemaType as ISchemaType } from "@dojoengine/sdk";

import { CairoOption, CairoOptionVariant, BigNumberish } from 'starknet';

// Type definition for `tactical_beats::models::index::BeastConfig` struct
export interface BeastConfig {
	id: BigNumberish;
	beast_nft_address: string;
}

// Type definition for `tactical_beats::models::index::BeastState` struct
export interface BeastState {
	game_id: BigNumberish;
	player_index: BigNumberish;
	beast_index: BigNumberish;
	beast_id: BigNumberish;
	token_id: BigNumberish;
	beast_type: BigNumberish;
	tier: BigNumberish;
	level: BigNumberish;
	hp: BigNumberish;
	hp_max: BigNumberish;
	extra_lives: BigNumberish;
	position_row: BigNumberish;
	position_col: BigNumberish;
	alive: boolean;
	last_moved: boolean;
}

// Type definition for `tactical_beats::models::index::Game` struct
export interface Game {
	game_id: BigNumberish;
	player1: string;
	player2: string;
	status: BigNumberish;
	current_attacker: BigNumberish;
	round: BigNumberish;
	winner: string;
	p1_team_set: boolean;
	p2_team_set: boolean;
	is_friendly: boolean;
	settings_id: BigNumberish;
}

// Type definition for `tactical_beats::models::index::GameConfig` struct
export interface GameConfig {
	id: BigNumberish;
	game_count: BigNumberish;
	token_count: BigNumberish;
	settings_count: BigNumberish;
}

// Type definition for `tactical_beats::models::index::GameSettings` struct
export interface GameSettings {
	settings_id: BigNumberish;
	min_tier: BigNumberish;
	max_tier: BigNumberish;
	max_t2_per_team: BigNumberish;
	max_t3_per_team: BigNumberish;
	beasts_per_player: BigNumberish;
}

// Type definition for `tactical_beats::models::index::GameToken` struct
export interface GameToken {
	token_id: BigNumberish;
	match_id: BigNumberish;
	player: string;
	end_time: BigNumberish;
}

// Type definition for `tactical_beats::models::index::GameTokens` struct
export interface GameTokens {
	match_id: BigNumberish;
	p1_token_id: BigNumberish;
	p2_token_id: BigNumberish;
}

// Type definition for `tactical_beats::models::index::MapState` struct
export interface MapState {
	game_id: BigNumberish;
	obstacle_1_row: BigNumberish;
	obstacle_1_col: BigNumberish;
	obstacle_2_row: BigNumberish;
	obstacle_2_col: BigNumberish;
	obstacle_3_row: BigNumberish;
	obstacle_3_col: BigNumberish;
	obstacle_4_row: BigNumberish;
	obstacle_4_col: BigNumberish;
	obstacle_5_row: BigNumberish;
	obstacle_5_col: BigNumberish;
	obstacle_6_row: BigNumberish;
	obstacle_6_col: BigNumberish;
}

// Type definition for `tactical_beats::models::index::MatchmakingQueue` struct
export interface MatchmakingQueue {
	id: BigNumberish;
	waiting_player: string;
	waiting_game_id: BigNumberish;
}

// Type definition for `tactical_beats::models::index::PlayerProfile` struct
export interface PlayerProfile {
	player: string;
	games_played: BigNumberish;
	wins: BigNumberish;
	losses: BigNumberish;
	total_kills: BigNumberish;
	total_deaths: BigNumberish;
	abandons: BigNumberish;
}

// Type definition for `tactical_beats::models::index::PlayerState` struct
export interface PlayerState {
	game_id: BigNumberish;
	player: string;
	player_index: BigNumberish;
	beast_1: BigNumberish;
	beast_2: BigNumberish;
	beast_3: BigNumberish;
	beast_4: BigNumberish;
	potion_used: boolean;
}

// Type definition for `tactical_beats::models::index::TokenScore` struct
export interface TokenScore {
	token_id: BigNumberish;
	wins: BigNumberish;
	losses: BigNumberish;
	kills: BigNumberish;
	deaths: BigNumberish;
	beasts_alive: BigNumberish;
	matches_played: BigNumberish;
}

// Type definition for `tactical_beats::events::index::GameCreated` struct
export interface GameCreated {
	game_id: BigNumberish;
	player1: string;
	time: BigNumberish;
}

// Type definition for `tactical_beats::events::index::GameFinished` struct
export interface GameFinished {
	game_id: BigNumberish;
	winner: string;
	rounds: BigNumberish;
	time: BigNumberish;
}

// Type definition for `tactical_beats::events::index::PlayerJoined` struct
export interface PlayerJoined {
	game_id: BigNumberish;
	player2: string;
	time: BigNumberish;
}

// Type definition for `game_components_interfaces::structs::metagame::GameContext` struct
export interface GameContext {
	name: BigNumberish;
	value: BigNumberish;
}

// Type definition for `game_components_interfaces::structs::metagame::GameContextDetails` struct
export interface GameContextDetails {
	name: string;
	description: string;
	id: CairoOption<BigNumberish>;
	context: Array<GameContext>;
}

// Type definition for `game_components_interfaces::structs::minigame::MintGameParams` struct
export interface MintGameParams {
	player_name: CairoOption<BigNumberish>;
	settings_id: CairoOption<BigNumberish>;
	start: CairoOption<BigNumberish>;
	end: CairoOption<BigNumberish>;
	objective_id: CairoOption<BigNumberish>;
	context: CairoOption<GameContextDetails>;
	client_url: CairoOption<string>;
	renderer_address: CairoOption<string>;
	skills_address: CairoOption<string>;
	to: string;
	soulbound: boolean;
	paymaster: boolean;
	salt: BigNumberish;
	metadata: BigNumberish;
}

// Type definition for `tactical_beats::types::Action` struct
export interface Action {
	beast_index: BigNumberish;
	action_type: BigNumberish;
	target_index: BigNumberish;
	target_row: BigNumberish;
	target_col: BigNumberish;
}

export interface SchemaType extends ISchemaType {
	tactical_beats: {
		BeastConfig: BeastConfig,
		BeastState: BeastState,
		Game: Game,
		GameConfig: GameConfig,
		GameSettings: GameSettings,
		GameToken: GameToken,
		GameTokens: GameTokens,
		MapState: MapState,
		MatchmakingQueue: MatchmakingQueue,
		PlayerProfile: PlayerProfile,
		PlayerState: PlayerState,
		TokenScore: TokenScore,
		GameCreated: GameCreated,
		GameFinished: GameFinished,
		PlayerJoined: PlayerJoined,
		GameContext: GameContext,
		GameContextDetails: GameContextDetails,
		MintGameParams: MintGameParams,
		Action: Action,
	},
}
export const schema: SchemaType = {
	tactical_beats: {
		BeastConfig: {
			id: 0,
			beast_nft_address: "",
		},
		BeastState: {
			game_id: 0,
			player_index: 0,
			beast_index: 0,
			beast_id: 0,
			token_id: 0,
			beast_type: 0,
			tier: 0,
			level: 0,
			hp: 0,
			hp_max: 0,
			extra_lives: 0,
			position_row: 0,
			position_col: 0,
			alive: false,
			last_moved: false,
		},
		Game: {
			game_id: 0,
			player1: "",
			player2: "",
			status: 0,
			current_attacker: 0,
			round: 0,
			winner: "",
			p1_team_set: false,
			p2_team_set: false,
			is_friendly: false,
			settings_id: 0,
		},
		GameConfig: {
			id: 0,
			game_count: 0,
			token_count: 0,
			settings_count: 0,
		},
		GameSettings: {
			settings_id: 0,
			min_tier: 0,
			max_tier: 0,
			max_t2_per_team: 0,
			max_t3_per_team: 0,
			beasts_per_player: 0,
		},
		GameToken: {
			token_id: 0,
			match_id: 0,
			player: "",
			end_time: 0,
		},
		GameTokens: {
			match_id: 0,
			p1_token_id: 0,
			p2_token_id: 0,
		},
		MapState: {
			game_id: 0,
			obstacle_1_row: 0,
			obstacle_1_col: 0,
			obstacle_2_row: 0,
			obstacle_2_col: 0,
			obstacle_3_row: 0,
			obstacle_3_col: 0,
			obstacle_4_row: 0,
			obstacle_4_col: 0,
			obstacle_5_row: 0,
			obstacle_5_col: 0,
			obstacle_6_row: 0,
			obstacle_6_col: 0,
		},
		MatchmakingQueue: {
			id: 0,
			waiting_player: "",
			waiting_game_id: 0,
		},
		PlayerProfile: {
			player: "",
			games_played: 0,
			wins: 0,
			losses: 0,
			total_kills: 0,
			total_deaths: 0,
			abandons: 0,
		},
		PlayerState: {
			game_id: 0,
			player: "",
			player_index: 0,
			beast_1: 0,
			beast_2: 0,
			beast_3: 0,
			beast_4: 0,
			potion_used: false,
		},
		TokenScore: {
			token_id: 0,
			wins: 0,
			losses: 0,
			kills: 0,
			deaths: 0,
			beasts_alive: 0,
			matches_played: 0,
		},
		GameCreated: {
			game_id: 0,
			player1: "",
			time: 0,
		},
		GameFinished: {
			game_id: 0,
			winner: "",
			rounds: 0,
			time: 0,
		},
		PlayerJoined: {
			game_id: 0,
			player2: "",
			time: 0,
		},
		GameContext: {
			name: 0,
			value: 0,
		},
		GameContextDetails: {
		name: "",
		description: "",
			id: new CairoOption(CairoOptionVariant.None),
			context: [{ name: 0, value: 0, }],
		},
		MintGameParams: {
			player_name: new CairoOption(CairoOptionVariant.None),
			settings_id: new CairoOption(CairoOptionVariant.None),
			start: new CairoOption(CairoOptionVariant.None),
			end: new CairoOption(CairoOptionVariant.None),
			objective_id: new CairoOption(CairoOptionVariant.None),
			context: new CairoOption(CairoOptionVariant.None),
			client_url: new CairoOption(CairoOptionVariant.None),
			renderer_address: new CairoOption(CairoOptionVariant.None),
			skills_address: new CairoOption(CairoOptionVariant.None),
			to: "",
			soulbound: false,
			paymaster: false,
			salt: 0,
			metadata: 0,
		},
		Action: {
			beast_index: 0,
			action_type: 0,
			target_index: 0,
			target_row: 0,
			target_col: 0,
		},
	},
};
export enum ModelsMapping {
	BeastConfig = 'tactical_beats-BeastConfig',
	BeastState = 'tactical_beats-BeastState',
	Game = 'tactical_beats-Game',
	GameConfig = 'tactical_beats-GameConfig',
	GameSettings = 'tactical_beats-GameSettings',
	GameToken = 'tactical_beats-GameToken',
	GameTokens = 'tactical_beats-GameTokens',
	MapState = 'tactical_beats-MapState',
	MatchmakingQueue = 'tactical_beats-MatchmakingQueue',
	PlayerProfile = 'tactical_beats-PlayerProfile',
	PlayerState = 'tactical_beats-PlayerState',
	TokenScore = 'tactical_beats-TokenScore',
	GameCreated = 'tactical_beats-GameCreated',
	GameFinished = 'tactical_beats-GameFinished',
	PlayerJoined = 'tactical_beats-PlayerJoined',
	GameContext = 'game_components_interfaces-GameContext',
	GameContextDetails = 'game_components_interfaces-GameContextDetails',
	MintGameParams = 'game_components_interfaces-MintGameParams',
	Action = 'tactical_beats-Action',
}