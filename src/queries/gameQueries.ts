import { gql } from "graphql-tag";

// Torii uses camelCase for namespace in GraphQL schema (RPS -> rps)
const DOJO_NAMESPACE = (import.meta.env.VITE_DOJO_NAMESPACE || "RPS").toLowerCase();

export const GET_GAME = gql`
  query GetGame($gameId: u32!) {
    ${DOJO_NAMESPACE}GameModels(where: { game_id: $gameId }) {
      edges {
        node {
          game_id
          player1
          player2
          status
          winner
          player1_move
          player2_move
          committed_at
        }
      }
    }
  }
`;

export const GET_OPEN_GAMES = gql`
  query GetOpenGames {
    ${DOJO_NAMESPACE}GameModels(where: { status: 0 }, first: 20) {
      edges {
        node {
          game_id
          player1
          player2
          status
        }
      }
    }
  }
`;

export const GET_PLAYER_COMMIT = gql`
  query GetPlayerCommit($gameId: u32!, $player: ContractAddress!) {
    ${DOJO_NAMESPACE}PlayerCommitModels(
      where: { game_id: $gameId, player: $player }
    ) {
      edges {
        node {
          game_id
          player
          commitment
          revealed
        }
      }
    }
  }
`;
