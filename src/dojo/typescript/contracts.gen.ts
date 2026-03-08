import { DOJO_NAMESPACE } from "../../config/namespace";
import { DojoProvider, DojoCall } from "@dojoengine/core";
import { Account, AccountInterface, BigNumberish, CairoOption, CairoCustomEnum } from "starknet";
import * as models from "./models.gen";

export function setupWorld(provider: DojoProvider) {

	const build_game_system_abandonGame_calldata = (gameId: BigNumberish): DojoCall => {
		return {
			contractName: "game_system",
			entrypoint: "abandon_game",
			calldata: [gameId],
		};
	};

	const game_system_abandonGame = async (snAccount: Account | AccountInterface, gameId: BigNumberish) => {
		try {
			return await provider.execute(
				snAccount,
				build_game_system_abandonGame_calldata(gameId),
				DOJO_NAMESPACE,
			);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_game_system_cancelMatchmaking_calldata = (): DojoCall => {
		return {
			contractName: "game_system",
			entrypoint: "cancel_matchmaking",
			calldata: [],
		};
	};

	const game_system_cancelMatchmaking = async (snAccount: Account | AccountInterface) => {
		try {
			return await provider.execute(
				snAccount,
				build_game_system_cancelMatchmaking_calldata(),
				DOJO_NAMESPACE,
			);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_game_system_createFriendlyGame_calldata = (): DojoCall => {
		return {
			contractName: "game_system",
			entrypoint: "create_friendly_game",
			calldata: [],
		};
	};

	const game_system_createFriendlyGame = async (snAccount: Account | AccountInterface) => {
		try {
			return await provider.execute(
				snAccount,
				build_game_system_createFriendlyGame_calldata(),
				DOJO_NAMESPACE,
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
				DOJO_NAMESPACE,
			);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_game_system_executeTurn_calldata = (gameId: BigNumberish, actions: Array<Action>): DojoCall => {
		return {
			contractName: "game_system",
			entrypoint: "execute_turn",
			calldata: [gameId, actions],
		};
	};

	const game_system_executeTurn = async (snAccount: Account | AccountInterface, gameId: BigNumberish, actions: Array<Action>) => {
		try {
			return await provider.execute(
				snAccount,
				build_game_system_executeTurn_calldata(gameId, actions),
				DOJO_NAMESPACE,
			);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_game_system_findMatch_calldata = (): DojoCall => {
		return {
			contractName: "game_system",
			entrypoint: "find_match",
			calldata: [],
		};
	};

	const game_system_findMatch = async (snAccount: Account | AccountInterface) => {
		try {
			return await provider.execute(
				snAccount,
				build_game_system_findMatch_calldata(),
				DOJO_NAMESPACE,
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
			return await provider.call(DOJO_NAMESPACE, build_game_system_gameOver_calldata(tokenId));
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_game_system_gameOverBatch_calldata = (tokenIds: Array<BigNumberish>): DojoCall => {
		return {
			contractName: "game_system",
			entrypoint: "game_over_batch",
			calldata: [tokenIds],
		};
	};

	const game_system_gameOverBatch = async (tokenIds: Array<BigNumberish>) => {
		try {
			return await provider.call(DOJO_NAMESPACE, build_game_system_gameOverBatch_calldata(tokenIds));
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
				DOJO_NAMESPACE,
			);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_game_system_mintGame_calldata = (playerName: CairoOption<BigNumberish>, settingsId: CairoOption<BigNumberish>, start: CairoOption<BigNumberish>, end: CairoOption<BigNumberish>, objectiveId: CairoOption<BigNumberish>, context: CairoOption<GameContextDetails>, clientUrl: CairoOption<string>, rendererAddress: CairoOption<string>, skillsAddress: CairoOption<string>, to: string, soulbound: boolean, paymaster: boolean, salt: BigNumberish, metadata: BigNumberish): DojoCall => {
		return {
			contractName: "game_system",
			entrypoint: "mint_game",
			calldata: [playerName, settingsId, start, end, objectiveId, context, clientUrl, rendererAddress, skillsAddress, to, soulbound, paymaster, salt, metadata],
		};
	};

	const game_system_mintGame = async (playerName: CairoOption<BigNumberish>, settingsId: CairoOption<BigNumberish>, start: CairoOption<BigNumberish>, end: CairoOption<BigNumberish>, objectiveId: CairoOption<BigNumberish>, context: CairoOption<GameContextDetails>, clientUrl: CairoOption<string>, rendererAddress: CairoOption<string>, skillsAddress: CairoOption<string>, to: string, soulbound: boolean, paymaster: boolean, salt: BigNumberish, metadata: BigNumberish) => {
		try {
			return await provider.call(DOJO_NAMESPACE, build_game_system_mintGame_calldata(playerName, settingsId, start, end, objectiveId, context, clientUrl, rendererAddress, skillsAddress, to, soulbound, paymaster, salt, metadata));
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_game_system_mintGameBatch_calldata = (mints: Array<MintGameParams>): DojoCall => {
		return {
			contractName: "game_system",
			entrypoint: "mint_game_batch",
			calldata: [mints],
		};
	};

	const game_system_mintGameBatch = async (mints: Array<MintGameParams>) => {
		try {
			return await provider.call(DOJO_NAMESPACE, build_game_system_mintGameBatch_calldata(mints));
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_game_system_objectivesAddress_calldata = (): DojoCall => {
		return {
			contractName: "game_system",
			entrypoint: "objectives_address",
			calldata: [],
		};
	};

	const game_system_objectivesAddress = async () => {
		try {
			return await provider.call(DOJO_NAMESPACE, build_game_system_objectivesAddress_calldata());
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
			return await provider.call(DOJO_NAMESPACE, build_game_system_score_calldata(tokenId));
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_game_system_scoreBatch_calldata = (tokenIds: Array<BigNumberish>): DojoCall => {
		return {
			contractName: "game_system",
			entrypoint: "score_batch",
			calldata: [tokenIds],
		};
	};

	const game_system_scoreBatch = async (tokenIds: Array<BigNumberish>) => {
		try {
			return await provider.call(DOJO_NAMESPACE, build_game_system_scoreBatch_calldata(tokenIds));
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_game_system_setBeastConfig_calldata = (beastNftAddress: string): DojoCall => {
		return {
			contractName: "game_system",
			entrypoint: "set_beast_config",
			calldata: [beastNftAddress],
		};
	};

	const game_system_setBeastConfig = async (snAccount: Account | AccountInterface, beastNftAddress: string) => {
		try {
			return await provider.execute(
				snAccount,
				build_game_system_setBeastConfig_calldata(beastNftAddress),
				DOJO_NAMESPACE,
			);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_game_system_setTeam_calldata = (gameId: BigNumberish, beast1: BigNumberish, beast2: BigNumberish, beast3: BigNumberish): DojoCall => {
		return {
			contractName: "game_system",
			entrypoint: "set_team",
			calldata: [gameId, beast1, beast2, beast3],
		};
	};

	const game_system_setTeam = async (snAccount: Account | AccountInterface, gameId: BigNumberish, beast1: BigNumberish, beast2: BigNumberish, beast3: BigNumberish) => {
		try {
			return await provider.execute(
				snAccount,
				build_game_system_setTeam_calldata(gameId, beast1, beast2, beast3),
				DOJO_NAMESPACE,
			);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_game_system_settingsAddress_calldata = (): DojoCall => {
		return {
			contractName: "game_system",
			entrypoint: "settings_address",
			calldata: [],
		};
	};

	const game_system_settingsAddress = async () => {
		try {
			return await provider.call(DOJO_NAMESPACE, build_game_system_settingsAddress_calldata());
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_game_system_settingsExist_calldata = (settingsId: BigNumberish): DojoCall => {
		return {
			contractName: "game_system",
			entrypoint: "settings_exist",
			calldata: [settingsId],
		};
	};

	const game_system_settingsExist = async (settingsId: BigNumberish) => {
		try {
			return await provider.call(DOJO_NAMESPACE, build_game_system_settingsExist_calldata(settingsId));
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_game_system_settingsExistBatch_calldata = (settingsIds: Array<BigNumberish>): DojoCall => {
		return {
			contractName: "game_system",
			entrypoint: "settings_exist_batch",
			calldata: [settingsIds],
		};
	};

	const game_system_settingsExistBatch = async (settingsIds: Array<BigNumberish>) => {
		try {
			return await provider.call(DOJO_NAMESPACE, build_game_system_settingsExistBatch_calldata(settingsIds));
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_game_system_supportsInterface_calldata = (interfaceId: BigNumberish): DojoCall => {
		return {
			contractName: "game_system",
			entrypoint: "supports_interface",
			calldata: [interfaceId],
		};
	};

	const game_system_supportsInterface = async (interfaceId: BigNumberish) => {
		try {
			return await provider.call(DOJO_NAMESPACE, build_game_system_supportsInterface_calldata(interfaceId));
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_game_system_tokenAddress_calldata = (): DojoCall => {
		return {
			contractName: "game_system",
			entrypoint: "token_address",
			calldata: [],
		};
	};

	const game_system_tokenAddress = async () => {
		try {
			return await provider.call(DOJO_NAMESPACE, build_game_system_tokenAddress_calldata());
		} catch (error) {
			console.error(error);
			throw error;
		}
	};



	return {
		game_system: {
			abandonGame: game_system_abandonGame,
			buildAbandonGameCalldata: build_game_system_abandonGame_calldata,
			cancelMatchmaking: game_system_cancelMatchmaking,
			buildCancelMatchmakingCalldata: build_game_system_cancelMatchmaking_calldata,
			createFriendlyGame: game_system_createFriendlyGame,
			buildCreateFriendlyGameCalldata: build_game_system_createFriendlyGame_calldata,
			createGame: game_system_createGame,
			buildCreateGameCalldata: build_game_system_createGame_calldata,
			executeTurn: game_system_executeTurn,
			buildExecuteTurnCalldata: build_game_system_executeTurn_calldata,
			findMatch: game_system_findMatch,
			buildFindMatchCalldata: build_game_system_findMatch_calldata,
			gameOver: game_system_gameOver,
			buildGameOverCalldata: build_game_system_gameOver_calldata,
			gameOverBatch: game_system_gameOverBatch,
			buildGameOverBatchCalldata: build_game_system_gameOverBatch_calldata,
			joinGame: game_system_joinGame,
			buildJoinGameCalldata: build_game_system_joinGame_calldata,
			mintGame: game_system_mintGame,
			buildMintGameCalldata: build_game_system_mintGame_calldata,
			mintGameBatch: game_system_mintGameBatch,
			buildMintGameBatchCalldata: build_game_system_mintGameBatch_calldata,
			objectivesAddress: game_system_objectivesAddress,
			buildObjectivesAddressCalldata: build_game_system_objectivesAddress_calldata,
			score: game_system_score,
			buildScoreCalldata: build_game_system_score_calldata,
			scoreBatch: game_system_scoreBatch,
			buildScoreBatchCalldata: build_game_system_scoreBatch_calldata,
			setBeastConfig: game_system_setBeastConfig,
			buildSetBeastConfigCalldata: build_game_system_setBeastConfig_calldata,
			setTeam: game_system_setTeam,
			buildSetTeamCalldata: build_game_system_setTeam_calldata,
			settingsAddress: game_system_settingsAddress,
			buildSettingsAddressCalldata: build_game_system_settingsAddress_calldata,
			settingsExist: game_system_settingsExist,
			buildSettingsExistCalldata: build_game_system_settingsExist_calldata,
			settingsExistBatch: game_system_settingsExistBatch,
			buildSettingsExistBatchCalldata: build_game_system_settingsExistBatch_calldata,
			supportsInterface: game_system_supportsInterface,
			buildSupportsInterfaceCalldata: build_game_system_supportsInterface_calldata,
			tokenAddress: game_system_tokenAddress,
			buildTokenAddressCalldata: build_game_system_tokenAddress_calldata,
		},
	};
}