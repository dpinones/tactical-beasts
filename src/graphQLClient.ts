import { GraphQLClient } from "graphql-request";
import { graphqlUrl } from "./config/cartridgeUrls";

const graphQLClient = new GraphQLClient(graphqlUrl);

export default graphQLClient;
