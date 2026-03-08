import {
  Box,
  Button,
  Flex,
  Heading,
  Text,
  VStack,
  HStack,
  Badge,
  Spinner,
  Image,
} from "@chakra-ui/react";
import { useParams, useNavigate } from "react-router-dom";
import { useMemo } from "react";
import { useDojo } from "../dojo/DojoContext";
import { useGameQuery, useBeastStates } from "../hooks/useGameQuery";
import { useGameStore } from "../stores/gameStore";
import { GameStatus, ZERO_ADDR, BeastType } from "../domain/types";
import { getTypeName, getTypeColor } from "../domain/combat";
import { getBeastImagePath } from "../data/beasts";

function normalizeAddr(addr: string): string {
  if (!addr) return ZERO_ADDR;
  const hex = addr.replace("0x", "").toLowerCase();
  return "0x" + hex.padStart(64, "0");
}

function isSameAddress(a: string, b: string): boolean {
  return normalizeAddr(a) === normalizeAddr(b);
}

function truncateAddr(addr: string): string {
  if (!addr) return "---";
  return addr.slice(0, 6) + "..." + addr.slice(-4);
}

const MAX_ROUNDS = 50;
const WIN_BONUS = 100;

export function ResultPage() {
  const { gameId: gameIdParam } = useParams<{ gameId: string }>();
  const gameId = gameIdParam ? parseInt(gameIdParam) : null;
  const navigate = useNavigate();

  const {
    account: { account },
  } = useDojo();
  const { game } = useGameQuery(gameId);
  const { beasts } = useBeastStates(gameId);
  const { clearBattleLog, clearSelectedBeasts, setActiveGameId } =
    useGameStore();

  const myAddress = account?.address || "";

  const isWinner = game
    ? isSameAddress(game.winner, myAddress)
    : false;

  const score = useMemo(() => {
    if (!game || !isWinner) return 0;
    return (MAX_ROUNDS - game.round) * 10 + WIN_BONUS;
  }, [game, isWinner]);

  const myPlayerIndex = useMemo(() => {
    if (!game) return 0;
    if (isSameAddress(game.player1, myAddress)) return 1;
    return 2;
  }, [game, myAddress]);

  const myBeasts = beasts.filter(
    (b) => Number(b.player_index) === myPlayerIndex
  );
  const enemyBeasts = beasts.filter(
    (b) => Number(b.player_index) !== myPlayerIndex
  );

  const myAlive = myBeasts.filter((b) => b.alive).length;
  const enemyAlive = enemyBeasts.filter((b) => b.alive).length;
  const myKOs = enemyBeasts.filter((b) => !b.alive).length;
  const enemyKOs = myBeasts.filter((b) => !b.alive).length;

  const handlePlayAgain = () => {
    clearBattleLog();
    clearSelectedBeasts();
    setActiveGameId(null);
    navigate("/");
  };

  if (!game) {
    return (
      <Flex justify="center" align="center" minH="100vh">
        <Spinner size="xl" color="green.400" />
      </Flex>
    );
  }

  return (
    <Flex
      direction="column"
      align="center"
      justify="center"
      minH="100vh"
      p={6}
      gap={6}
    >
      {/* Result header */}
      <VStack gap={2}>
        <Heading
          size="2xl"
          fontFamily="heading"
          textTransform="uppercase"
          letterSpacing="0.12em"
          color={isWinner ? "green.300" : "danger.300"}
          textShadow={
            isWinner
              ? "0 0 30px rgba(135,180,155,0.38)"
              : "0 0 30px rgba(183,110,110,0.38)"
          }
        >
          {isWinner ? "Victory" : "Defeat"}
        </Heading>
        <Text fontSize="sm" color="text.secondary">
          Game #{gameId} — Round {game.round}
        </Text>
      </VStack>

      {/* Score */}
      {isWinner && (
        <Box
          bg="surface.panel"
          border="1px solid"
          borderColor="gold.600"
          borderRadius="12px"
          px={8}
          py={4}
          textAlign="center"
          boxShadow="glowGold"
        >
          <Text
            fontSize="xs"
            color="text.secondary"
            textTransform="uppercase"
            letterSpacing="0.1em"
            mb={1}
          >
            EGS Score
          </Text>
          <Text
            fontSize="3xl"
            color="gold.400"
            fontFamily="mono"
            fontWeight="700"
          >
            {score}
          </Text>
        </Box>
      )}

      {/* Stats */}
      <Box
        bg="surface.panel"
        border="1px solid"
        borderColor="surface.border"
        borderRadius="12px"
        p={5}
        w="100%"
        maxW="500px"
      >
        <VStack align="stretch" gap={3}>
          <Flex justify="space-between">
            <Text variant="label">Rounds</Text>
            <Text color="text.gold" fontFamily="mono" fontWeight="700">
              {game.round}
            </Text>
          </Flex>

          <Flex justify="space-between">
            <Text variant="label">Winner</Text>
            <Text
              color={isWinner ? "green.300" : "danger.300"}
              fontSize="sm"
            >
              {isSameAddress(game.winner, myAddress)
                ? "You"
                : truncateAddr(game.winner)}
            </Text>
          </Flex>

          <Box h="1px" bg="surface.border" />

          {/* Your team summary */}
          <Text
            fontFamily="heading"
            fontSize="xs"
            color="green.300"
            textTransform="uppercase"
            letterSpacing="0.1em"
          >
            Your Team
          </Text>
          {myBeasts.map((beast) => {
            const bType = Number(beast.beast_type) as BeastType;
            return (
              <Flex
                key={Number(beast.beast_index)}
                justify="space-between"
                align="center"
              >
                <HStack>
                  <Image
                    src={getBeastImagePath(Number(beast.beast_id))}
                    alt={getTypeName(bType)}
                    w="24px"
                    h="24px"
                    objectFit="contain"
                    borderRadius="8px"
                    fallback={<Box w="24px" h="24px" />}
                  />
                  <Text fontSize="xs" color={getTypeColor(bType)}>
                    {getTypeName(bType)}
                  </Text>
                  <Text fontSize="xs" color="text.secondary">
                    T{Number(beast.tier)} Lv{Number(beast.level)}
                  </Text>
                </HStack>
                <HStack>
                  <Text fontSize="xs" color="text.gold" fontFamily="mono">
                    {Number(beast.hp)}/{Number(beast.hp_max)}
                  </Text>
                  <Badge
                    variant={beast.alive ? "magical" : "brute"}
                    fontSize="7px"
                  >
                    {beast.alive ? "ALIVE" : "KO"}
                  </Badge>
                </HStack>
              </Flex>
            );
          })}

          <Box h="1px" bg="surface.border" />

          {/* Summary stats */}
          <HStack justify="space-around">
            <VStack>
              <Text variant="label">Your KOs</Text>
              <Text color="green.300" fontFamily="mono" fontWeight="700">
                {myKOs}
              </Text>
            </VStack>
            <VStack>
              <Text variant="label">Beasts Lost</Text>
              <Text color="danger.300" fontFamily="mono" fontWeight="700">
                {enemyKOs}
              </Text>
            </VStack>
            <VStack>
              <Text variant="label">Beasts Alive</Text>
              <Text color="gold.400" fontFamily="mono" fontWeight="700">
                {myAlive}
              </Text>
            </VStack>
          </HStack>
        </VStack>
      </Box>

      {/* Actions */}
      <HStack gap={4}>
        <Button variant="primary" size="lg" onClick={handlePlayAgain}>
          Play Again
        </Button>
        <Button
          variant="secondary"
          size="lg"
          onClick={() => navigate("/")}
        >
          Home
        </Button>
      </HStack>
    </Flex>
  );
}
