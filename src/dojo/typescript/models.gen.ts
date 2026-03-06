import type { SchemaType as ISchemaType } from "@dojoengine/sdk";

import { BigNumberish } from 'starknet';

// Type definition for `rock_paper_scissors::models::index::Game` struct
export interface Game {
	game_id: BigNumberish;
	player1: string;
	player2: string;
	status: BigNumberish;
	winner: string;
	player1_move: BigNumberish;
	player2_move: BigNumberish;
	committed_at: BigNumberish;
}

// Type definition for `rock_paper_scissors::models::index::GameConfig` struct
export interface GameConfig {
	id: BigNumberish;
	game_count: BigNumberish;
	timeout_duration: BigNumberish;
}

// Type definition for `rock_paper_scissors::models::index::PlayerCommit` struct
export interface PlayerCommit {
	game_id: BigNumberish;
	player: string;
	commitment: BigNumberish;
	revealed: boolean;
}

// Type definition for `rock_paper_scissors::events::index::GameCreated` struct
export interface GameCreated {
	game_id: BigNumberish;
	player1: string;
	time: BigNumberish;
}

// Type definition for `rock_paper_scissors::events::index::GameFinished` struct
export interface GameFinished {
	game_id: BigNumberish;
	winner: string;
	player1_move: BigNumberish;
	player2_move: BigNumberish;
	time: BigNumberish;
}

// Type definition for `rock_paper_scissors::events::index::MoveCommitted` struct
export interface MoveCommitted {
	game_id: BigNumberish;
	player: string;
	time: BigNumberish;
}

// Type definition for `rock_paper_scissors::events::index::MoveRevealed` struct
export interface MoveRevealed {
	game_id: BigNumberish;
	player: string;
	move_value: BigNumberish;
	time: BigNumberish;
}

// Type definition for `rock_paper_scissors::events::index::PlayerJoined` struct
export interface PlayerJoined {
	game_id: BigNumberish;
	player2: string;
	time: BigNumberish;
}

export interface SchemaType extends ISchemaType {
	rock_paper_scissors: {
		Game: Game,
		GameConfig: GameConfig,
		PlayerCommit: PlayerCommit,
		GameCreated: GameCreated,
		GameFinished: GameFinished,
		MoveCommitted: MoveCommitted,
		MoveRevealed: MoveRevealed,
		PlayerJoined: PlayerJoined,
	},
}
export const schema: SchemaType = {
	rock_paper_scissors: {
		Game: {
			game_id: 0,
			player1: "",
			player2: "",
			status: 0,
			winner: "",
			player1_move: 0,
			player2_move: 0,
			committed_at: 0,
		},
		GameConfig: {
			id: 0,
			game_count: 0,
			timeout_duration: 0,
		},
		PlayerCommit: {
			game_id: 0,
			player: "",
			commitment: 0,
			revealed: false,
		},
		GameCreated: {
			game_id: 0,
			player1: "",
			time: 0,
		},
		GameFinished: {
			game_id: 0,
			winner: "",
			player1_move: 0,
			player2_move: 0,
			time: 0,
		},
		MoveCommitted: {
			game_id: 0,
			player: "",
			time: 0,
		},
		MoveRevealed: {
			game_id: 0,
			player: "",
			move_value: 0,
			time: 0,
		},
		PlayerJoined: {
			game_id: 0,
			player2: "",
			time: 0,
		},
	},
};
export enum ModelsMapping {
	Game = 'rock_paper_scissors-Game',
	GameConfig = 'rock_paper_scissors-GameConfig',
	PlayerCommit = 'rock_paper_scissors-PlayerCommit',
	GameCreated = 'rock_paper_scissors-GameCreated',
	GameFinished = 'rock_paper_scissors-GameFinished',
	MoveCommitted = 'rock_paper_scissors-MoveCommitted',
	MoveRevealed = 'rock_paper_scissors-MoveRevealed',
	PlayerJoined = 'rock_paper_scissors-PlayerJoined',
}