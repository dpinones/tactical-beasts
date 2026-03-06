import { defineComponent, Type as RecsType, World } from "@dojoengine/recs";

export type ContractComponents = Awaited<
  ReturnType<typeof defineContractComponents>
>;

import { DOJO_NAMESPACE } from "../../config/namespace";

export function defineContractComponents(world: World) {
  return {
    Game: (() => {
      return defineComponent(
        world,
        {
          game_id: RecsType.Number,
          player1: RecsType.BigInt,
          player2: RecsType.BigInt,
          status: RecsType.Number,
          winner: RecsType.BigInt,
          player1_move: RecsType.Number,
          player2_move: RecsType.Number,
          committed_at: RecsType.Number,
        },
        {
          metadata: {
            namespace: DOJO_NAMESPACE,
            name: "Game",
            types: [
              "u32",
              "ContractAddress",
              "ContractAddress",
              "u8",
              "ContractAddress",
              "u8",
              "u8",
              "u64",
            ],
            customTypes: [],
          },
        }
      );
    })(),

    PlayerCommit: (() => {
      return defineComponent(
        world,
        {
          game_id: RecsType.Number,
          player: RecsType.BigInt,
          commitment: RecsType.BigInt,
          revealed: RecsType.Boolean,
        },
        {
          metadata: {
            namespace: DOJO_NAMESPACE,
            name: "PlayerCommit",
            types: ["u32", "ContractAddress", "felt252", "bool"],
            customTypes: [],
          },
        }
      );
    })(),

    GameConfig: (() => {
      return defineComponent(
        world,
        {
          id: RecsType.BigInt,
          game_count: RecsType.Number,
          timeout_duration: RecsType.Number,
        },
        {
          metadata: {
            namespace: DOJO_NAMESPACE,
            name: "GameConfig",
            types: ["felt252", "u32", "u64"],
            customTypes: [],
          },
        }
      );
    })(),
  };
}
