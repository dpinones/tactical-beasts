import { DojoProvider, DojoCall } from "@dojoengine/core";
import { Account, AccountInterface, BigNumberish, CairoOption, CairoCustomEnum } from "starknet";
import * as models from "./models.gen";
import { DOJO_NAMESPACE } from "../../config/namespace";

export function setupWorld(provider: DojoProvider) {

	const build_Collection_approve_calldata = (to: string, tokenId: BigNumberish): DojoCall => {
		return {
			contractName: "Collection",
			entrypoint: "approve",
			calldata: [to, tokenId],
		};
	};

	const Collection_approve = async (snAccount: Account | AccountInterface, to: string, tokenId: BigNumberish) => {
		try {
			return await provider.execute(
				snAccount,
				build_Collection_approve_calldata(to, tokenId),
				DOJO_NAMESPACE,
			);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_Collection_assertIsOwner_calldata = (owner: string, tokenId: BigNumberish): DojoCall => {
		return {
			contractName: "Collection",
			entrypoint: "assert_is_owner",
			calldata: [owner, tokenId],
		};
	};

	const Collection_assertIsOwner = async (snAccount: Account | AccountInterface, owner: string, tokenId: BigNumberish) => {
		try {
			return await provider.execute(
				snAccount,
				build_Collection_assertIsOwner_calldata(owner, tokenId),
				DOJO_NAMESPACE,
			);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_Collection_balanceOf_calldata = (account: string): DojoCall => {
		return {
			contractName: "Collection",
			entrypoint: "balance_of",
			calldata: [account],
		};
	};

	const Collection_balanceOf = async (account: string) => {
		try {
			return await provider.call(DOJO_NAMESPACE, build_Collection_balanceOf_calldata(account));
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_Collection_burn_calldata = (tokenId: BigNumberish): DojoCall => {
		return {
			contractName: "Collection",
			entrypoint: "burn",
			calldata: [tokenId],
		};
	};

	const Collection_burn = async (snAccount: Account | AccountInterface, tokenId: BigNumberish) => {
		try {
			return await provider.execute(
				snAccount,
				build_Collection_burn_calldata(tokenId),
				DOJO_NAMESPACE,
			);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_Collection_contractUri_calldata = (): DojoCall => {
		return {
			contractName: "Collection",
			entrypoint: "contract_uri",
			calldata: [],
		};
	};

	const Collection_contractUri = async () => {
		try {
			return await provider.call(DOJO_NAMESPACE, build_Collection_contractUri_calldata());
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_Collection_getApproved_calldata = (tokenId: BigNumberish): DojoCall => {
		return {
			contractName: "Collection",
			entrypoint: "get_approved",
			calldata: [tokenId],
		};
	};

	const Collection_getApproved = async (tokenId: BigNumberish) => {
		try {
			return await provider.call(DOJO_NAMESPACE, build_Collection_getApproved_calldata(tokenId));
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_Collection_getRoleAdmin_calldata = (role: BigNumberish): DojoCall => {
		return {
			contractName: "Collection",
			entrypoint: "get_role_admin",
			calldata: [role],
		};
	};

	const Collection_getRoleAdmin = async (role: BigNumberish) => {
		try {
			return await provider.call(DOJO_NAMESPACE, build_Collection_getRoleAdmin_calldata(role));
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_Collection_grantRole_calldata = (role: BigNumberish, account: string): DojoCall => {
		return {
			contractName: "Collection",
			entrypoint: "grant_role",
			calldata: [role, account],
		};
	};

	const Collection_grantRole = async (snAccount: Account | AccountInterface, role: BigNumberish, account: string) => {
		try {
			return await provider.execute(
				snAccount,
				build_Collection_grantRole_calldata(role, account),
				DOJO_NAMESPACE,
			);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_Collection_hasRole_calldata = (role: BigNumberish, account: string): DojoCall => {
		return {
			contractName: "Collection",
			entrypoint: "has_role",
			calldata: [role, account],
		};
	};

	const Collection_hasRole = async (role: BigNumberish, account: string) => {
		try {
			return await provider.call(DOJO_NAMESPACE, build_Collection_hasRole_calldata(role, account));
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_Collection_isApprovedForAll_calldata = (owner: string, operator: string): DojoCall => {
		return {
			contractName: "Collection",
			entrypoint: "is_approved_for_all",
			calldata: [owner, operator],
		};
	};

	const Collection_isApprovedForAll = async (owner: string, operator: string) => {
		try {
			return await provider.call(DOJO_NAMESPACE, build_Collection_isApprovedForAll_calldata(owner, operator));
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_Collection_mint_calldata = (to: string, soulbound: boolean): DojoCall => {
		return {
			contractName: "Collection",
			entrypoint: "mint",
			calldata: [to, soulbound],
		};
	};

	const Collection_mint = async (snAccount: Account | AccountInterface, to: string, soulbound: boolean) => {
		try {
			return await provider.execute(
				snAccount,
				build_Collection_mint_calldata(to, soulbound),
				DOJO_NAMESPACE,
			);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_Collection_name_calldata = (): DojoCall => {
		return {
			contractName: "Collection",
			entrypoint: "name",
			calldata: [],
		};
	};

	const Collection_name = async () => {
		try {
			return await provider.call(DOJO_NAMESPACE, build_Collection_name_calldata());
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_Collection_owner_calldata = (): DojoCall => {
		return {
			contractName: "Collection",
			entrypoint: "owner",
			calldata: [],
		};
	};

	const Collection_owner = async () => {
		try {
			return await provider.call(DOJO_NAMESPACE, build_Collection_owner_calldata());
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_Collection_ownerOf_calldata = (tokenId: BigNumberish): DojoCall => {
		return {
			contractName: "Collection",
			entrypoint: "owner_of",
			calldata: [tokenId],
		};
	};

	const Collection_ownerOf = async (tokenId: BigNumberish) => {
		try {
			return await provider.call(DOJO_NAMESPACE, build_Collection_ownerOf_calldata(tokenId));
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_Collection_renounceOwnership_calldata = (): DojoCall => {
		return {
			contractName: "Collection",
			entrypoint: "renounce_ownership",
			calldata: [],
		};
	};

	const Collection_renounceOwnership = async (snAccount: Account | AccountInterface) => {
		try {
			return await provider.execute(
				snAccount,
				build_Collection_renounceOwnership_calldata(),
				DOJO_NAMESPACE,
			);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_Collection_renounceRole_calldata = (role: BigNumberish, account: string): DojoCall => {
		return {
			contractName: "Collection",
			entrypoint: "renounce_role",
			calldata: [role, account],
		};
	};

	const Collection_renounceRole = async (snAccount: Account | AccountInterface, role: BigNumberish, account: string) => {
		try {
			return await provider.execute(
				snAccount,
				build_Collection_renounceRole_calldata(role, account),
				DOJO_NAMESPACE,
			);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_Collection_revokeRole_calldata = (role: BigNumberish, account: string): DojoCall => {
		return {
			contractName: "Collection",
			entrypoint: "revoke_role",
			calldata: [role, account],
		};
	};

	const Collection_revokeRole = async (snAccount: Account | AccountInterface, role: BigNumberish, account: string) => {
		try {
			return await provider.execute(
				snAccount,
				build_Collection_revokeRole_calldata(role, account),
				DOJO_NAMESPACE,
			);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_Collection_safeTransferFrom_calldata = (from: string, to: string, tokenId: BigNumberish, data: Array<BigNumberish>): DojoCall => {
		return {
			contractName: "Collection",
			entrypoint: "safe_transfer_from",
			calldata: [from, to, tokenId, data],
		};
	};

	const Collection_safeTransferFrom = async (snAccount: Account | AccountInterface, from: string, to: string, tokenId: BigNumberish, data: Array<BigNumberish>) => {
		try {
			return await provider.execute(
				snAccount,
				build_Collection_safeTransferFrom_calldata(from, to, tokenId, data),
				DOJO_NAMESPACE,
			);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_Collection_setApprovalForAll_calldata = (operator: string, approved: boolean): DojoCall => {
		return {
			contractName: "Collection",
			entrypoint: "set_approval_for_all",
			calldata: [operator, approved],
		};
	};

	const Collection_setApprovalForAll = async (snAccount: Account | AccountInterface, operator: string, approved: boolean) => {
		try {
			return await provider.execute(
				snAccount,
				build_Collection_setApprovalForAll_calldata(operator, approved),
				DOJO_NAMESPACE,
			);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_Collection_symbol_calldata = (): DojoCall => {
		return {
			contractName: "Collection",
			entrypoint: "symbol",
			calldata: [],
		};
	};

	const Collection_symbol = async () => {
		try {
			return await provider.call(DOJO_NAMESPACE, build_Collection_symbol_calldata());
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_Collection_tokenUri_calldata = (tokenId: BigNumberish): DojoCall => {
		return {
			contractName: "Collection",
			entrypoint: "token_uri",
			calldata: [tokenId],
		};
	};

	const Collection_tokenUri = async (tokenId: BigNumberish) => {
		try {
			return await provider.call(DOJO_NAMESPACE, build_Collection_tokenUri_calldata(tokenId));
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_Collection_transferFrom_calldata = (from: string, to: string, tokenId: BigNumberish): DojoCall => {
		return {
			contractName: "Collection",
			entrypoint: "transfer_from",
			calldata: [from, to, tokenId],
		};
	};

	const Collection_transferFrom = async (snAccount: Account | AccountInterface, from: string, to: string, tokenId: BigNumberish) => {
		try {
			return await provider.execute(
				snAccount,
				build_Collection_transferFrom_calldata(from, to, tokenId),
				DOJO_NAMESPACE,
			);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_Collection_transferOwnership_calldata = (newOwner: string): DojoCall => {
		return {
			contractName: "Collection",
			entrypoint: "transfer_ownership",
			calldata: [newOwner],
		};
	};

	const Collection_transferOwnership = async (snAccount: Account | AccountInterface, newOwner: string) => {
		try {
			return await provider.execute(
				snAccount,
				build_Collection_transferOwnership_calldata(newOwner),
				DOJO_NAMESPACE,
			);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_Collection_update_calldata = (tokenId: BigNumberish): DojoCall => {
		return {
			contractName: "Collection",
			entrypoint: "update",
			calldata: [tokenId],
		};
	};

	const Collection_update = async (snAccount: Account | AccountInterface, tokenId: BigNumberish) => {
		try {
			return await provider.execute(
				snAccount,
				build_Collection_update_calldata(tokenId),
				DOJO_NAMESPACE,
			);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

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



	return {
		Collection: {
			approve: Collection_approve,
			buildApproveCalldata: build_Collection_approve_calldata,
			assertIsOwner: Collection_assertIsOwner,
			buildAssertIsOwnerCalldata: build_Collection_assertIsOwner_calldata,
			balanceOf: Collection_balanceOf,
			buildBalanceOfCalldata: build_Collection_balanceOf_calldata,
			burn: Collection_burn,
			buildBurnCalldata: build_Collection_burn_calldata,
			contractUri: Collection_contractUri,
			buildContractUriCalldata: build_Collection_contractUri_calldata,
			getApproved: Collection_getApproved,
			buildGetApprovedCalldata: build_Collection_getApproved_calldata,
			getRoleAdmin: Collection_getRoleAdmin,
			buildGetRoleAdminCalldata: build_Collection_getRoleAdmin_calldata,
			grantRole: Collection_grantRole,
			buildGrantRoleCalldata: build_Collection_grantRole_calldata,
			hasRole: Collection_hasRole,
			buildHasRoleCalldata: build_Collection_hasRole_calldata,
			isApprovedForAll: Collection_isApprovedForAll,
			buildIsApprovedForAllCalldata: build_Collection_isApprovedForAll_calldata,
			mint: Collection_mint,
			buildMintCalldata: build_Collection_mint_calldata,
			name: Collection_name,
			buildNameCalldata: build_Collection_name_calldata,
			owner: Collection_owner,
			buildOwnerCalldata: build_Collection_owner_calldata,
			ownerOf: Collection_ownerOf,
			buildOwnerOfCalldata: build_Collection_ownerOf_calldata,
			renounceOwnership: Collection_renounceOwnership,
			buildRenounceOwnershipCalldata: build_Collection_renounceOwnership_calldata,
			renounceRole: Collection_renounceRole,
			buildRenounceRoleCalldata: build_Collection_renounceRole_calldata,
			revokeRole: Collection_revokeRole,
			buildRevokeRoleCalldata: build_Collection_revokeRole_calldata,
			safeTransferFrom: Collection_safeTransferFrom,
			buildSafeTransferFromCalldata: build_Collection_safeTransferFrom_calldata,
			setApprovalForAll: Collection_setApprovalForAll,
			buildSetApprovalForAllCalldata: build_Collection_setApprovalForAll_calldata,
			symbol: Collection_symbol,
			buildSymbolCalldata: build_Collection_symbol_calldata,
			tokenUri: Collection_tokenUri,
			buildTokenUriCalldata: build_Collection_tokenUri_calldata,
			transferFrom: Collection_transferFrom,
			buildTransferFromCalldata: build_Collection_transferFrom_calldata,
			transferOwnership: Collection_transferOwnership,
			buildTransferOwnershipCalldata: build_Collection_transferOwnership_calldata,
			update: Collection_update,
			buildUpdateCalldata: build_Collection_update_calldata,
		},
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
			joinGame: game_system_joinGame,
			buildJoinGameCalldata: build_game_system_joinGame_calldata,
			score: game_system_score,
			buildScoreCalldata: build_game_system_score_calldata,
			setTeam: game_system_setTeam,
			buildSetTeamCalldata: build_game_system_setTeam_calldata,
		},
	};
}