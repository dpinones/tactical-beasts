import type { SchemaType as ISchemaType } from "@dojoengine/sdk";

import { BigNumberish } from 'starknet';

// Type definition for `achievement::models::index::AchievementAdvancement` struct
export interface AchievementAdvancement {
	player_id: BigNumberish;
	achievement_id: BigNumberish;
	task_id: BigNumberish;
	count: BigNumberish;
	timestamp: BigNumberish;
}

// Type definition for `achievement::models::index::AchievementAssociation` struct
export interface AchievementAssociation {
	task_id: BigNumberish;
	achievements: Array<BigNumberish>;
}

// Type definition for `achievement::models::index::AchievementCompletion` struct
export interface AchievementCompletion {
	player_id: BigNumberish;
	achievement_id: BigNumberish;
	timestamp: BigNumberish;
	unclaimed: boolean;
}

// Type definition for `achievement::models::index::AchievementDefinition` struct
export interface AchievementDefinition {
	id: BigNumberish;
	rewarder: string;
	start: BigNumberish;
	end: BigNumberish;
	tasks: Array<Task>;
}

// Type definition for `achievement::types::task::Task` struct
export interface Task {
	id: BigNumberish;
	total: BigNumberish;
	description: string;
}

// Type definition for `tactical_beats::models::index::BeastState` struct
export interface BeastState {
	game_id: BigNumberish;
	player_index: BigNumberish;
	beast_index: BigNumberish;
	beast_id: BigNumberish;
	beast_type: BigNumberish;
	tier: BigNumberish;
	level: BigNumberish;
	hp: BigNumberish;
	hp_max: BigNumberish;
	extra_lives: BigNumberish;
	position_row: BigNumberish;
	position_col: BigNumberish;
	alive: boolean;
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
}

// Type definition for `tactical_beats::models::index::GameConfig` struct
export interface GameConfig {
	id: BigNumberish;
	game_count: BigNumberish;
	token_count: BigNumberish;
}

// Type definition for `tactical_beats::models::index::GameToken` struct
export interface GameToken {
	token_id: BigNumberish;
	match_id: BigNumberish;
	player: string;
}

// Type definition for `tactical_beats::models::index::GameTokens` struct
export interface GameTokens {
	match_id: BigNumberish;
	p1_token_id: BigNumberish;
	p2_token_id: BigNumberish;
}

// Type definition for `tactical_beats::models::index::MatchmakingQueue` struct
export interface MatchmakingQueue {
	id: BigNumberish;
	waiting_player: string;
	waiting_game_id: BigNumberish;
}

// Type definition for `tactical_beats::models::index::PlayerState` struct
export interface PlayerState {
	game_id: BigNumberish;
	player: string;
	player_index: BigNumberish;
	beast_1: BigNumberish;
	beast_2: BigNumberish;
	beast_3: BigNumberish;
	potion_used: boolean;
}

// Type definition for `achievement::events::index::AchievementClaimed` struct
export interface AchievementClaimed {
	player_id: BigNumberish;
	achievement_id: BigNumberish;
	time: BigNumberish;
}

// Type definition for `achievement::events::index::AchievementCompleted` struct
export interface AchievementCompleted {
	player_id: BigNumberish;
	achievement_id: BigNumberish;
	time: BigNumberish;
}

// Type definition for `achievement::events::index::TrophyCreation` struct
export interface TrophyCreation {
	id: BigNumberish;
	hidden: boolean;
	index: BigNumberish;
	points: BigNumberish;
	start: BigNumberish;
	end: BigNumberish;
	group: BigNumberish;
	icon: BigNumberish;
	title: BigNumberish;
	description: string;
	tasks: Array<Task>;
	data: string;
}

// Type definition for `achievement::events::index::TrophyProgression` struct
export interface TrophyProgression {
	player_id: BigNumberish;
	task_id: BigNumberish;
	count: BigNumberish;
	time: BigNumberish;
}

// Type definition for `leaderboard::events::index::LeaderboardScore` struct
export interface LeaderboardScore {
	leaderboard_id: BigNumberish;
	game_id: BigNumberish;
	player: BigNumberish;
	score: BigNumberish;
	timestamp: BigNumberish;
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

// Type definition for `collection::components::erc4906::erc4906::ERC4906Component::BatchMetadataUpdate` struct
export interface BatchMetadataUpdate {
	from_token_id: BigNumberish;
	to_token_id: BigNumberish;
}

// Type definition for `collection::components::erc4906::erc4906::ERC4906Component::MetadataUpdate` struct
export interface MetadataUpdate {
	token_id: BigNumberish;
}

// Type definition for `openzeppelin_access::accesscontrol::accesscontrol::AccessControlComponent::RoleAdminChanged` struct
export interface RoleAdminChanged {
	role: BigNumberish;
	previous_admin_role: BigNumberish;
	new_admin_role: BigNumberish;
}

// Type definition for `openzeppelin_access::accesscontrol::accesscontrol::AccessControlComponent::RoleGranted` struct
export interface RoleGranted {
	role: BigNumberish;
	account: string;
	sender: string;
}

// Type definition for `openzeppelin_access::accesscontrol::accesscontrol::AccessControlComponent::RoleGrantedWithDelay` struct
export interface RoleGrantedWithDelay {
	role: BigNumberish;
	account: string;
	sender: string;
	delay: BigNumberish;
}

// Type definition for `openzeppelin_access::accesscontrol::accesscontrol::AccessControlComponent::RoleRevoked` struct
export interface RoleRevoked {
	role: BigNumberish;
	account: string;
	sender: string;
}

// Type definition for `openzeppelin_access::ownable::ownable::OwnableComponent::OwnershipTransferStarted` struct
export interface OwnershipTransferStarted {
	previous_owner: string;
	new_owner: string;
}

// Type definition for `openzeppelin_access::ownable::ownable::OwnableComponent::OwnershipTransferred` struct
export interface OwnershipTransferred {
	previous_owner: string;
	new_owner: string;
}

// Type definition for `openzeppelin_token::erc721::erc721::ERC721Component::Approval` struct
export interface Approval {
	owner: string;
	approved: string;
	token_id: BigNumberish;
}

// Type definition for `openzeppelin_token::erc721::erc721::ERC721Component::ApprovalForAll` struct
export interface ApprovalForAll {
	owner: string;
	operator: string;
	approved: boolean;
}

// Type definition for `openzeppelin_token::erc721::erc721::ERC721Component::Transfer` struct
export interface Transfer {
	from: string;
	to: string;
	token_id: BigNumberish;
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
		AchievementAdvancement: AchievementAdvancement,
		AchievementAssociation: AchievementAssociation,
		AchievementCompletion: AchievementCompletion,
		AchievementDefinition: AchievementDefinition,
		Task: Task,
		BeastState: BeastState,
		Game: Game,
		GameConfig: GameConfig,
		GameToken: GameToken,
		GameTokens: GameTokens,
		MatchmakingQueue: MatchmakingQueue,
		PlayerState: PlayerState,
		AchievementClaimed: AchievementClaimed,
		AchievementCompleted: AchievementCompleted,
		TrophyCreation: TrophyCreation,
		TrophyProgression: TrophyProgression,
		LeaderboardScore: LeaderboardScore,
		GameCreated: GameCreated,
		GameFinished: GameFinished,
		PlayerJoined: PlayerJoined,
		BatchMetadataUpdate: BatchMetadataUpdate,
		MetadataUpdate: MetadataUpdate,
		RoleAdminChanged: RoleAdminChanged,
		RoleGranted: RoleGranted,
		RoleGrantedWithDelay: RoleGrantedWithDelay,
		RoleRevoked: RoleRevoked,
		OwnershipTransferStarted: OwnershipTransferStarted,
		OwnershipTransferred: OwnershipTransferred,
		Approval: Approval,
		ApprovalForAll: ApprovalForAll,
		Transfer: Transfer,
		Action: Action,
	},
}
export const schema: SchemaType = {
	tactical_beats: {
		AchievementAdvancement: {
			player_id: 0,
			achievement_id: 0,
			task_id: 0,
			count: 0,
			timestamp: 0,
		},
		AchievementAssociation: {
			task_id: 0,
			achievements: [0],
		},
		AchievementCompletion: {
			player_id: 0,
			achievement_id: 0,
			timestamp: 0,
			unclaimed: false,
		},
		AchievementDefinition: {
			id: 0,
			rewarder: "",
			start: 0,
			end: 0,
			tasks: [{ id: 0, total: 0, description: "", }],
		},
		Task: {
			id: 0,
			total: 0,
		description: "",
		},
		BeastState: {
			game_id: 0,
			player_index: 0,
			beast_index: 0,
			beast_id: 0,
			beast_type: 0,
			tier: 0,
			level: 0,
			hp: 0,
			hp_max: 0,
			extra_lives: 0,
			position_row: 0,
			position_col: 0,
			alive: false,
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
		},
		GameConfig: {
			id: 0,
			game_count: 0,
			token_count: 0,
		},
		GameToken: {
			token_id: 0,
			match_id: 0,
			player: "",
		},
		GameTokens: {
			match_id: 0,
			p1_token_id: 0,
			p2_token_id: 0,
		},
		MatchmakingQueue: {
			id: 0,
			waiting_player: "",
			waiting_game_id: 0,
		},
		PlayerState: {
			game_id: 0,
			player: "",
			player_index: 0,
			beast_1: 0,
			beast_2: 0,
			beast_3: 0,
			potion_used: false,
		},
		AchievementClaimed: {
			player_id: 0,
			achievement_id: 0,
			time: 0,
		},
		AchievementCompleted: {
			player_id: 0,
			achievement_id: 0,
			time: 0,
		},
		TrophyCreation: {
			id: 0,
			hidden: false,
			index: 0,
			points: 0,
			start: 0,
			end: 0,
			group: 0,
			icon: 0,
			title: 0,
		description: "",
			tasks: [{ id: 0, total: 0, description: "", }],
		data: "",
		},
		TrophyProgression: {
			player_id: 0,
			task_id: 0,
			count: 0,
			time: 0,
		},
		LeaderboardScore: {
			leaderboard_id: 0,
			game_id: 0,
			player: 0,
			score: 0,
			timestamp: 0,
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
		BatchMetadataUpdate: {
		from_token_id: 0,
		to_token_id: 0,
		},
		MetadataUpdate: {
		token_id: 0,
		},
		RoleAdminChanged: {
			role: 0,
			previous_admin_role: 0,
			new_admin_role: 0,
		},
		RoleGranted: {
			role: 0,
			account: "",
			sender: "",
		},
		RoleGrantedWithDelay: {
			role: 0,
			account: "",
			sender: "",
			delay: 0,
		},
		RoleRevoked: {
			role: 0,
			account: "",
			sender: "",
		},
		OwnershipTransferStarted: {
			previous_owner: "",
			new_owner: "",
		},
		OwnershipTransferred: {
			previous_owner: "",
			new_owner: "",
		},
		Approval: {
			owner: "",
			approved: "",
		token_id: 0,
		},
		ApprovalForAll: {
			owner: "",
			operator: "",
			approved: false,
		},
		Transfer: {
			from: "",
			to: "",
		token_id: 0,
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
	AchievementAdvancement = 'achievement-AchievementAdvancement',
	AchievementAssociation = 'achievement-AchievementAssociation',
	AchievementCompletion = 'achievement-AchievementCompletion',
	AchievementDefinition = 'achievement-AchievementDefinition',
	Task = 'achievement-Task',
	BeastState = 'tactical_beats-BeastState',
	Game = 'tactical_beats-Game',
	GameConfig = 'tactical_beats-GameConfig',
	GameToken = 'tactical_beats-GameToken',
	GameTokens = 'tactical_beats-GameTokens',
	MatchmakingQueue = 'tactical_beats-MatchmakingQueue',
	PlayerState = 'tactical_beats-PlayerState',
	AchievementClaimed = 'achievement-AchievementClaimed',
	AchievementCompleted = 'achievement-AchievementCompleted',
	TrophyCreation = 'achievement-TrophyCreation',
	TrophyProgression = 'achievement-TrophyProgression',
	LeaderboardScore = 'leaderboard-LeaderboardScore',
	GameCreated = 'tactical_beats-GameCreated',
	GameFinished = 'tactical_beats-GameFinished',
	PlayerJoined = 'tactical_beats-PlayerJoined',
	BatchMetadataUpdate = 'collection-BatchMetadataUpdate',
	MetadataUpdate = 'collection-MetadataUpdate',
	ContractURIUpdated = 'collection-ContractURIUpdated',
	RoleAdminChanged = 'openzeppelin_access-RoleAdminChanged',
	RoleGranted = 'openzeppelin_access-RoleGranted',
	RoleGrantedWithDelay = 'openzeppelin_access-RoleGrantedWithDelay',
	RoleRevoked = 'openzeppelin_access-RoleRevoked',
	OwnershipTransferStarted = 'openzeppelin_access-OwnershipTransferStarted',
	OwnershipTransferred = 'openzeppelin_access-OwnershipTransferred',
	Approval = 'openzeppelin_token-Approval',
	ApprovalForAll = 'openzeppelin_token-ApprovalForAll',
	Transfer = 'openzeppelin_token-Transfer',
	Action = 'tactical_beats-Action',
}