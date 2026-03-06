import { gql } from "graphql-tag";

const NS = (import.meta.env.VITE_DOJO_NAMESPACE || "TB").toLowerCase();

export const GET_GAME = gql`
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
        }
      }
    }
  }
`;

export const GET_OPEN_GAMES = gql`
  query GetOpenGames {
    ${NS}GameModels(where: { status: 0 }, first: 20) {
      edges {
        node {
          game_id
          player1
          player2
          status
          p1_team_set
          p2_team_set
        }
      }
    }
  }
`;

export const GET_BEAST_STATES = gql`
  query GetBeastStates($gameId: u32!, $playerIndex: u8!) {
    ${NS}BeastStateModels(
      where: { game_id: $gameId, player_index: $playerIndex }
      first: 3
    ) {
      edges {
        node {
          game_id
          player_index
          beast_index
          beast_id
          beast_type
          tier
          level
          hp
          hp_max
          extra_lives
          position_row
          position_col
          alive
        }
      }
    }
  }
`;

export const GET_ALL_BEAST_STATES = gql`
  query GetAllBeastStates($gameId: u32!) {
    ${NS}BeastStateModels(
      where: { game_id: $gameId }
      first: 6
    ) {
      edges {
        node {
          game_id
          player_index
          beast_index
          beast_id
          beast_type
          tier
          level
          hp
          hp_max
          extra_lives
          position_row
          position_col
          alive
        }
      }
    }
  }
`;

export const GET_PLAYER_STATE = gql`
  query GetPlayerState($gameId: u32!, $player: ContractAddress!) {
    ${NS}PlayerStateModels(
      where: { game_id: $gameId, player: $player }
    ) {
      edges {
        node {
          game_id
          player
          player_index
          beast_1
          beast_2
          beast_3
          potion_used
        }
      }
    }
  }
`;
