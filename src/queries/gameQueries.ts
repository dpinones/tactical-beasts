import { gql } from "graphql-tag";
import { DOJO_NAMESPACE_LOWER as NS } from "../config/namespace";

export const GET_LEADERBOARD = gql`
  query GetLeaderboard {
    ${NS}PlayerProfileModels(first: 50, order: { field: WINS, direction: DESC }) {
      edges {
        node {
          player
          games_played
          wins
          losses
          total_kills
          total_deaths
          abandons
        }
      }
    }
  }
`;
