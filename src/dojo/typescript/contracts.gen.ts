import { DojoProvider, DojoCall } from "@dojoengine/core";
import { Account, AccountInterface, BigNumberish, CairoOption, CairoCustomEnum } from "starknet";
import * as models from "./models.gen";

export function setupWorld(provider: DojoProvider) {

	const build_game_system_claimTimeout_calldata = (gameId: BigNumberish): DojoCall => {
		return {
			contractName: "game_system",
			entrypoint: "claim_timeout",
			calldata: [gameId],
		};
	};

	const game_system_claimTimeout = async (snAccount: Account | AccountInterface, gameId: BigNumberish) => {
		try {
			return await provider.execute(
				snAccount,
				build_game_system_claimTimeout_calldata(gameId),
				"RPS",
			);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_game_system_commitMove_calldata = (gameId: BigNumberish, commitment: BigNumberish): DojoCall => {
		return {
			contractName: "game_system",
			entrypoint: "commit_move",
			calldata: [gameId, commitment],
		};
	};

	const game_system_commitMove = async (snAccount: Account | AccountInterface, gameId: BigNumberish, commitment: BigNumberish) => {
		try {
			return await provider.execute(
				snAccount,
				build_game_system_commitMove_calldata(gameId, commitment),
				"RPS",
			);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_game_system_createGame_calldata = (): DojoCall => {
		return {
			contractName: "game_system",
			entrypoint: "create_game",
			calldata: [],
		};
	};

	const game_system_createGame = async (snAccount: Account | AccountInterface) => {
		try {
			return await provider.execute(
				snAccount,
				build_game_system_createGame_calldata(),
				"RPS",
			);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_game_system_gameOver_calldata = (tokenId: BigNumberish): DojoCall => {
		return {
			contractName: "game_system",
			entrypoint: "game_over",
			calldata: [tokenId],
		};
	};

	const game_system_gameOver = async (tokenId: BigNumberish) => {
		try {
			return await provider.call("RPS", build_game_system_gameOver_calldata(tokenId));
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_game_system_joinGame_calldata = (gameId: BigNumberish): DojoCall => {
		return {
			contractName: "game_system",
			entrypoint: "join_game",
			calldata: [gameId],
		};
	};

	const game_system_joinGame = async (snAccount: Account | AccountInterface, gameId: BigNumberish) => {
		try {
			return await provider.execute(
				snAccount,
				build_game_system_joinGame_calldata(gameId),
				"RPS",
			);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_game_system_revealMove_calldata = (gameId: BigNumberish, moveValue: BigNumberish, salt: BigNumberish): DojoCall => {
		return {
			contractName: "game_system",
			entrypoint: "reveal_move",
			calldata: [gameId, moveValue, salt],
		};
	};

	const game_system_revealMove = async (snAccount: Account | AccountInterface, gameId: BigNumberish, moveValue: BigNumberish, salt: BigNumberish) => {
		try {
			return await provider.execute(
				snAccount,
				build_game_system_revealMove_calldata(gameId, moveValue, salt),
				"RPS",
			);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_game_system_score_calldata = (tokenId: BigNumberish): DojoCall => {
		return {
			contractName: "game_system",
			entrypoint: "score",
			calldata: [tokenId],
		};
	};

	const game_system_score = async (tokenId: BigNumberish) => {
		try {
			return await provider.call("RPS", build_game_system_score_calldata(tokenId));
		} catch (error) {
			console.error(error);
			throw error;
		}
	};



	return {
		game_system: {
			claimTimeout: game_system_claimTimeout,
			buildClaimTimeoutCalldata: build_game_system_claimTimeout_calldata,
			commitMove: game_system_commitMove,
			buildCommitMoveCalldata: build_game_system_commitMove_calldata,
			createGame: game_system_createGame,
			buildCreateGameCalldata: build_game_system_createGame_calldata,
			gameOver: game_system_gameOver,
			buildGameOverCalldata: build_game_system_gameOver_calldata,
			joinGame: game_system_joinGame,
			buildJoinGameCalldata: build_game_system_joinGame_calldata,
			revealMove: game_system_revealMove,
			buildRevealMoveCalldata: build_game_system_revealMove_calldata,
			score: game_system_score,
			buildScoreCalldata: build_game_system_score_calldata,
		},
	};
}