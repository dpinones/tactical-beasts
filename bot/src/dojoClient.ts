import { DojoProvider, DojoCall } from "@dojoengine/core";
import { Account } from "starknet";
import { config } from "./config.js";
import { GameAction } from "./types.js";

// Minimal manifest for DojoProvider — only the game_system contract
const manifest = {
  world: {
    address: config.worldAddress,
    class_hash: "",
    seed: "tb-sepolia",
  },
  contracts: [
    {
      tag: `${config.dojoNamespace}-game_system`,
      address: "0x6182fc005192efb00c3fa544023e45da690dc4c7668885c6f3e70543cb1728c",
      systems: [],
    },
  ],
  models: [],
};

const provider = new DojoProvider(manifest as any, config.starknetRpcUrl);
const NS = config.dojoNamespace;

export async function joinGame(account: Account, gameId: number) {
  const call: DojoCall = {
    contractName: "game_system",
    entrypoint: "join_game",
    calldata: [gameId],
  };
  return provider.execute(account, call, NS);
}

export async function setTeamDynamic(account: Account, gameId: number, beastIds: number[]) {
  const call: DojoCall = {
    contractName: "game_system",
    entrypoint: "set_team_dynamic",
    calldata: [gameId, beastIds],
  };
  return provider.execute(account, call, NS);
}

export async function executeTurn(account: Account, gameId: number, actions: GameAction[]) {
  const contractActions = actions.map((a) => ({
    beast_index: a.beastIndex,
    action_type: a.actionType,
    target_index: a.targetIndex,
    target_row: a.targetRow,
    target_col: a.targetCol,
  }));
  const call: DojoCall = {
    contractName: "game_system",
    entrypoint: "execute_turn",
    calldata: [gameId, contractActions],
  };
  return provider.execute(account, call, NS);
}

export async function abandonGame(account: Account, gameId: number) {
  const call: DojoCall = {
    contractName: "game_system",
    entrypoint: "abandon_game",
    calldata: [gameId],
  };
  return provider.execute(account, call, NS);
}
