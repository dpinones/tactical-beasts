import {
  Box,
  Button,
  Flex,
  Heading,
  Text,
  VStack,
  HStack,
  Spinner,
} from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";
import { useLeaderboard } from "../hooks/useGameQuery";
import type { PlayerProfileModel } from "../domain/types";

const SCORE_WIN = 500;
const SCORE_PER_KILL = 50;
const SCORE_PER_BEAST_ALIVE = 30;

function computeScore(p: PlayerProfileModel): number {
  return p.wins * SCORE_WIN + p.total_kills * SCORE_PER_KILL;
}

function truncateAddr(addr: string): string {
  if (!addr) return "---";
  return addr.slice(0, 6) + "..." + addr.slice(-4);
}

export function LeaderboardPage() {
  const navigate = useNavigate();
  const { players, loading, refetch } = useLeaderboard();

  // Sort by score (same formula as contract: wins*500 + kills*50), filter out 0 games
  const ranked = players
    .filter((p) => p.games_played > 0)
    .sort((a, b) => computeScore(b) - computeScore(a));

  return (
    <Flex direction="column" minH="100vh" p={6} maxW="800px" mx="auto">
      <Flex justify="space-between" align="center" mb={6}>
        <Heading
          size="lg"
          fontFamily="heading"
          color="green.300"
          textTransform="uppercase"
          letterSpacing="0.08em"
        >
          Leaderboard
        </Heading>
        <HStack gap={2}>
          <Button size="sm" variant="secondary" onClick={refetch}>
            Refresh
          </Button>
          <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
            Back
          </Button>
        </HStack>
      </Flex>

      {loading ? (
        <Flex justify="center" py={10}>
          <Spinner color="green.400" size="lg" />
        </Flex>
      ) : ranked.length === 0 ? (
        <Box bg="surface.card" borderRadius="10px" p={6} textAlign="center">
          <Text color="text.muted" fontSize="sm">
            No players yet. Be the first to play!
          </Text>
        </Box>
      ) : (
        <Box
          bg="surface.panel"
          border="1px solid"
          borderColor="surface.border"
          borderRadius="12px"
          overflow="hidden"
        >
          {/* Header row */}
          <Flex
            px={4}
            py={3}
            bg="rgba(0,0,0,0.3)"
            borderBottom="1px solid"
            borderColor="surface.border"
          >
            <Text fontSize="9px" color="text.secondary" textTransform="uppercase" letterSpacing="0.1em" w="50px">
              Rank
            </Text>
            <Text fontSize="9px" color="text.secondary" textTransform="uppercase" letterSpacing="0.1em" flex={1}>
              Player
            </Text>
            <Text fontSize="9px" color="text.secondary" textTransform="uppercase" letterSpacing="0.1em" w="60px" textAlign="right">
              Wins
            </Text>
            <Text fontSize="9px" color="text.secondary" textTransform="uppercase" letterSpacing="0.1em" w="60px" textAlign="right">
              Losses
            </Text>
            <Text fontSize="9px" color="text.secondary" textTransform="uppercase" letterSpacing="0.1em" w="60px" textAlign="right">
              Games
            </Text>
            <Text fontSize="9px" color="text.secondary" textTransform="uppercase" letterSpacing="0.1em" w="70px" textAlign="right">
              Score
            </Text>
          </Flex>

          {/* Rows */}
          {ranked.map((p, i) => (
            <Flex
              key={p.player}
              px={4}
              py={3}
              align="center"
              borderBottom={i < ranked.length - 1 ? "1px solid" : "none"}
              borderColor="surface.border"
              _hover={{ bg: "rgba(135,180,155,0.05)" }}
            >
              <Text
                fontSize="sm"
                fontFamily="mono"
                fontWeight="700"
                w="50px"
                color={i < 3 ? "gold.400" : "text.secondary"}
              >
                #{i + 1}
              </Text>
              <Text fontSize="sm" color="text.primary" flex={1} fontFamily="mono">
                {truncateAddr(p.player)}
              </Text>
              <Text
                fontSize="sm"
                fontFamily="mono"
                fontWeight="700"
                color="green.300"
                w="60px"
                textAlign="right"
              >
                {p.wins}
              </Text>
              <Text
                fontSize="sm"
                fontFamily="mono"
                fontWeight="700"
                color="danger.300"
                w="60px"
                textAlign="right"
              >
                {p.losses}
              </Text>
              <Text
                fontSize="sm"
                fontFamily="mono"
                color="text.gold"
                w="60px"
                textAlign="right"
              >
                {p.games_played}
              </Text>
              <Text
                fontSize="sm"
                fontFamily="mono"
                fontWeight="700"
                color="gold.400"
                w="70px"
                textAlign="right"
              >
                {computeScore(p)}
              </Text>
            </Flex>
          ))}
        </Box>
      )}

      <Text fontSize="xs" color="text.muted" textAlign="center" mt={3}>
        {ranked.length} player{ranked.length !== 1 ? "s" : ""}
      </Text>
    </Flex>
  );
}
