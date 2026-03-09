import {
  Box,
  Button,
  Flex,
  Heading,
  Text,
  VStack,
  HStack,
  Spinner,
  Badge,
} from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "../dojo/WalletContext";
import { usePlayerTokens, usePlayerStats } from "../hooks/useDenshokan";
import { gameAddress } from "../config/denshokan";

function truncateAddr(addr: string): string {
  if (!addr) return "---";
  return addr.slice(0, 6) + "..." + addr.slice(-4);
}

export function MyTokensPage() {
  const navigate = useNavigate();
  const { finalAccount } = useWallet();
  const address = finalAccount?.address;

  const { data: tokensData, isLoading, error } = usePlayerTokens(address);
  const { data: playerStats } = usePlayerStats(address);

  const tokens = tokensData?.data || [];

  return (
    <Flex direction="column" minH="100vh" p={6} maxW="700px" mx="auto">
      <Flex justify="space-between" align="center" mb={6}>
        <Heading
          size="lg"
          fontFamily="heading"
          color="green.300"
          textTransform="uppercase"
          letterSpacing="0.08em"
        >
          My Tokens
        </Heading>
        <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
          Back
        </Button>
      </Flex>

      {/* Player stats summary */}
      {playerStats && (
        <Box
          bg="surface.panel"
          border="1px solid"
          borderColor="surface.border"
          borderRadius="12px"
          p={4}
          mb={4}
        >
          <HStack gap={6} flexWrap="wrap">
            <Box>
              <Text fontSize="9px" color="text.secondary" textTransform="uppercase" letterSpacing="0.1em">
                Total Games
              </Text>
              <Text fontSize="lg" color="text.gold" fontFamily="mono" fontWeight="700">
                {playerStats.totalTokens ?? 0}
              </Text>
            </Box>
            <Box>
              <Text fontSize="9px" color="text.secondary" textTransform="uppercase" letterSpacing="0.1em">
                Active
              </Text>
              <Text fontSize="lg" color="green.300" fontFamily="mono" fontWeight="700">
                {playerStats.activeGames ?? 0}
              </Text>
            </Box>
            <Box>
              <Text fontSize="9px" color="text.secondary" textTransform="uppercase" letterSpacing="0.1em">
                Completed
              </Text>
              <Text fontSize="lg" color="text.muted" fontFamily="mono" fontWeight="700">
                {playerStats.completedGames ?? 0}
              </Text>
            </Box>
          </HStack>
        </Box>
      )}

      {isLoading ? (
        <Flex justify="center" py={10}>
          <Spinner color="green.400" size="lg" />
        </Flex>
      ) : error ? (
        <Box bg="surface.card" borderRadius="10px" p={4}>
          <Text color="danger.300" fontSize="sm">
            Failed to load tokens: {error.message}
          </Text>
        </Box>
      ) : tokens.length === 0 ? (
        <Box bg="surface.card" borderRadius="10px" p={6} textAlign="center">
          <VStack gap={3}>
            <Text color="text.muted" fontSize="sm">
              No game tokens yet. Play a game to mint one.
            </Text>
            <Button variant="primary" size="sm" onClick={() => navigate("/matchmaking")}>
              Play Now
            </Button>
          </VStack>
        </Box>
      ) : (
        <VStack align="stretch" gap={3}>
          {tokens.map((token: any) => {
            const isComplete = token.gameOver;
            const score = token.score != null ? Number(token.score) : null;

            return (
              <Box
                key={token.tokenId}
                bg="surface.panel"
                border="1px solid"
                borderColor={isComplete ? "surface.border" : "green.600"}
                borderRadius="12px"
                p={4}
              >
                <Flex justify="space-between" align="center" mb={2}>
                  <HStack gap={2}>
                    <Text fontSize="sm" fontWeight="700" color="text.primary" fontFamily="mono">
                      Token #{truncateAddr(String(token.tokenId))}
                    </Text>
                    <Badge
                      variant={isComplete ? "brute" : "magical"}
                      fontSize="8px"
                    >
                      {isComplete ? "COMPLETED" : "ACTIVE"}
                    </Badge>
                  </HStack>
                  {score != null && (
                    <Text fontSize="sm" fontFamily="mono" fontWeight="700" color="gold.400">
                      Score: {score}
                    </Text>
                  )}
                </Flex>

                <HStack gap={4} flexWrap="wrap">
                  {token.playerName && (
                    <Box>
                      <Text fontSize="9px" color="text.secondary" textTransform="uppercase">Player</Text>
                      <Text fontSize="xs">{token.playerName}</Text>
                    </Box>
                  )}
                  {token.settingsId != null && (
                    <Box>
                      <Text fontSize="9px" color="text.secondary" textTransform="uppercase">Settings</Text>
                      <Text fontSize="xs" fontFamily="mono">#{token.settingsId}</Text>
                    </Box>
                  )}
                  {token.mintedAt && (
                    <Box>
                      <Text fontSize="9px" color="text.secondary" textTransform="uppercase">Minted</Text>
                      <Text fontSize="xs" color="text.muted">
                        {new Date(token.mintedAt).toLocaleDateString()}
                      </Text>
                    </Box>
                  )}
                </HStack>
              </Box>
            );
          })}
        </VStack>
      )}

      {tokensData && tokensData.total > tokens.length && (
        <Text fontSize="xs" color="text.muted" textAlign="center" mt={3}>
          Showing {tokens.length} of {tokensData.total} tokens
        </Text>
      )}
    </Flex>
  );
}
