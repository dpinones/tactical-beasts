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
          current_attacker: RecsType.Number,
          round: RecsType.Number,
          winner: RecsType.BigInt,
          p1_team_set: RecsType.Boolean,
          p2_team_set: RecsType.Boolean,
          is_friendly: RecsType.Boolean,
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
              "u8",
              "u32",
              "ContractAddress",
              "bool",
              "bool",
              "bool",
            ],
            customTypes: [],
          },
        }
      );
    })(),

    BeastState: (() => {
      return defineComponent(
        world,
        {
          game_id: RecsType.Number,
          player_index: RecsType.Number,
          beast_index: RecsType.Number,
          beast_id: RecsType.Number,
          token_id: RecsType.Number,
          beast_type: RecsType.Number,
          tier: RecsType.Number,
          level: RecsType.Number,
          hp: RecsType.Number,
          hp_max: RecsType.Number,
          extra_lives: RecsType.Number,
          position_row: RecsType.Number,
          position_col: RecsType.Number,
          alive: RecsType.Boolean,
          last_moved: RecsType.Boolean,
        },
        {
          metadata: {
            namespace: DOJO_NAMESPACE,
            name: "BeastState",
            types: [
              "u32", "u8", "u8", "u8", "u32",
              "u8", "u8", "u8",
              "u16", "u16", "u8",
              "u8", "u8",
              "bool", "bool",
            ],
            customTypes: [],
          },
        }
      );
    })(),

    GameConfig: (() => {
      return defineComponent(
        world,
        {
          id: RecsType.Number,
          game_count: RecsType.Number,
          token_count: RecsType.Number,
        },
        {
          metadata: {
            namespace: DOJO_NAMESPACE,
            name: "GameConfig",
            types: ["u32", "u64", "u64"],
            customTypes: [],
          },
        }
      );
    })(),

    GameToken: (() => {
      return defineComponent(
        world,
        {
          token_id: RecsType.BigInt,
          match_id: RecsType.Number,
          player: RecsType.BigInt,
        },
        {
          metadata: {
            namespace: DOJO_NAMESPACE,
            name: "GameToken",
            types: ["felt252", "u64", "ContractAddress"],
            customTypes: [],
          },
        }
      );
    })(),

    GameTokens: (() => {
      return defineComponent(
        world,
        {
          match_id: RecsType.Number,
          p1_token_id: RecsType.BigInt,
          p2_token_id: RecsType.BigInt,
        },
        {
          metadata: {
            namespace: DOJO_NAMESPACE,
            name: "GameTokens",
            types: ["u64", "felt252", "felt252"],
            customTypes: [],
          },
        }
      );
    })(),

    MapState: (() => {
      return defineComponent(
        world,
        {
          game_id: RecsType.Number,
          obstacle_1_row: RecsType.Number,
          obstacle_1_col: RecsType.Number,
          obstacle_2_row: RecsType.Number,
          obstacle_2_col: RecsType.Number,
          obstacle_3_row: RecsType.Number,
          obstacle_3_col: RecsType.Number,
          obstacle_4_row: RecsType.Number,
          obstacle_4_col: RecsType.Number,
          obstacle_5_row: RecsType.Number,
          obstacle_5_col: RecsType.Number,
          obstacle_6_row: RecsType.Number,
          obstacle_6_col: RecsType.Number,
        },
        {
          metadata: {
            namespace: DOJO_NAMESPACE,
            name: "MapState",
            types: [
              "u32",
              "u8", "u8", "u8", "u8", "u8", "u8",
              "u8", "u8", "u8", "u8", "u8", "u8",
            ],
            customTypes: [],
          },
        }
      );
    })(),

    MatchmakingQueue: (() => {
      return defineComponent(
        world,
        {
          id: RecsType.Number,
          waiting_player: RecsType.BigInt,
          waiting_game_id: RecsType.Number,
        },
        {
          metadata: {
            namespace: DOJO_NAMESPACE,
            name: "MatchmakingQueue",
            types: ["u32", "ContractAddress", "u32"],
            customTypes: [],
          },
        }
      );
    })(),

    PlayerProfile: (() => {
      return defineComponent(
        world,
        {
          player: RecsType.BigInt,
          games_played: RecsType.Number,
          wins: RecsType.Number,
          losses: RecsType.Number,
          total_kills: RecsType.Number,
          total_deaths: RecsType.Number,
          abandons: RecsType.Number,
        },
        {
          metadata: {
            namespace: DOJO_NAMESPACE,
            name: "PlayerProfile",
            types: [
              "ContractAddress",
              "u32", "u32", "u32", "u32", "u32", "u32",
            ],
            customTypes: [],
          },
        }
      );
    })(),

    PlayerState: (() => {
      return defineComponent(
        world,
        {
          game_id: RecsType.Number,
          player: RecsType.BigInt,
          player_index: RecsType.Number,
          beast_1: RecsType.Number,
          beast_2: RecsType.Number,
          beast_3: RecsType.Number,
          potion_used: RecsType.Boolean,
        },
        {
          metadata: {
            namespace: DOJO_NAMESPACE,
            name: "PlayerState",
            types: [
              "u32", "ContractAddress", "u8",
              "u8", "u8", "u8",
              "bool",
            ],
            customTypes: [],
          },
        }
      );
    })(),
  };
}
