import { GraphQLClient, gql } from "graphql-request";
import { config } from "./config.js";
import { GameModel, BeastStateModel, MapStateModel } from "./types.js";

const client = new GraphQLClient(config.toriiGraphqlUrl);
const NS = config.dojoNamespace.toLowerCase();

const GET_GAME = gql`
  query GetGame($gameId: u32!) {
    ${NS}GameModels(where: { game_id: $gameId }) {
      edges {
        node {
          game_id
          player1
          player2
          status
          current_attacker
          round
          winner
          p1_team_set
          p2_team_set
          is_friendly
          settings_id
        }
      }
    }
  }
`;

const GET_ALL_BEAST_STATES = gql`
  query GetAllBeastStates($gameId: u32!) {
    ${NS}BeastStateModels(where: { game_id: $gameId }, first: 6) {
      edges {
        node {
          game_id
          player_index
          beast_index
          beast_id
          token_id
          beast_type
          tier
          level
          hp
          hp_max
          extra_lives
          position_row
          position_col
          alive
          last_moved
        }
      }
    }
  }
`;

const GET_MAP_STATE = gql`
  query GetMapState($gameId: u32!) {
    ${NS}MapStateModels(where: { game_id: $gameId }) {
      edges {
        node {
          game_id
          obstacle_1_row
          obstacle_1_col
          obstacle_2_row
          obstacle_2_col
          obstacle_3_row
          obstacle_3_col
          obstacle_4_row
          obstacle_4_col
          obstacle_5_row
          obstacle_5_col
          obstacle_6_row
          obstacle_6_col
        }
      }
    }
  }
`;

function extractEdges(data: any, modelKey: string): any[] {
  const key = `${NS}${modelKey}`;
  return (data?.[key]?.edges || []).map((e: any) => e.node);
}

export async function fetchGame(gameId: number): Promise<GameModel | null> {
  const data = await client.request(GET_GAME, { gameId });
  const nodes = extractEdges(data, "GameModels");
  return nodes[0] || null;
}

export async function fetchBeastStates(gameId: number): Promise<BeastStateModel[]> {
  const data = await client.request(GET_ALL_BEAST_STATES, { gameId });
  return extractEdges(data, "BeastStateModels");
}

export async function fetchMapState(gameId: number): Promise<MapStateModel | null> {
  const data = await client.request(GET_MAP_STATE, { gameId });
  const nodes = extractEdges(data, "MapStateModels");
  return nodes[0] || null;
}
