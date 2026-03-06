import {
  Box,
  Button,
  Code,
  Flex,
  Heading,
  Input,
  Text,
  VStack,
  HStack,
  Badge,
  Spinner,
} from "@chakra-ui/react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDojo } from "../dojo/DojoContext";
import { useWallet } from "../dojo/WalletContext";
import { useGameActions } from "../hooks/useGameActions";
import { useGameQuery, useOpenGames } from "../hooks/useGameQuery";
import { useGameStore } from "../stores/gameStore";
import { GameStatus, Move } from "../dojo/constants";

const ZERO_ADDR =
  "0x0000000000000000000000000000000000000000000000000000000000000000";

function moveName(m: number): string {
  switch (m) {
    case Move.ROCK:
      return "Rock";
    case Move.PAPER:
      return "Paper";
    case Move.SCISSORS:
      return "Scissors";
    default:
      return "None";
  }
}

function statusLabel(s: number): string {
  switch (s) {
    case GameStatus.WAITING:
      return "Waiting for opponent";
    case GameStatus.COMMITTING:
      return "Commit your move";
    case GameStatus.REVEALING:
      return "Reveal phase";
    case GameStatus.FINISHED:
      return "Finished";
    default:
      return "Unknown";
  }
}

function truncateAddr(addr: string): string {
  if (!addr || addr === ZERO_ADDR) return "---";
  return addr.slice(0, 6) + "..." + addr.slice(-4);
}

function normalizeAddr(addr: string): string {
  if (!addr) return ZERO_ADDR;
  const hex = addr.replace("0x", "").toLowerCase();
  return "0x" + hex.padStart(64, "0");
}

function isSameAddress(a: string, b: string): boolean {
  return normalizeAddr(a) === normalizeAddr(b);
}

export function GamePage() {
  const {
    account: { account, accountDisplay },
  } = useDojo();
  const { accountType, logout } = useWallet();
  const navigate = useNavigate();

  const {
    createGame,
    joinGame,
    commitMove,
    revealMove,
    claimTimeout,
    isLoading,
  } = useGameActions();

  const [activeGameId, setActiveGameId] = useState<number | null>(null);
  const [joinInput, setJoinInput] = useState("");
  const [statusMsg, setStatusMsg] = useState("");

  const { game, refetch: refetchGame } = useGameQuery(activeGameId);
  const { games: openGames } = useOpenGames();
  const { getCommit } = useGameStore();

  // Cleanup old commits on mount
  const { cleanupOldCommits } = useGameStore();
  useEffect(() => {
    cleanupOldCommits();
  }, [cleanupOldCommits]);

  const myAddress = account?.address || "";
  const isPlayer1 = game ? isSameAddress(game.player1, myAddress) : false;
  const isPlayer2 = game ? isSameAddress(game.player2, myAddress) : false;
  const isMyGame = isPlayer1 || isPlayer2;

  const pendingCommit = activeGameId
    ? getCommit(activeGameId, myAddress)
    : undefined;

  const handleCreate = async () => {
    setStatusMsg("Creating game...");
    const gameId = await createGame();
    if (gameId) {
      setActiveGameId(gameId);
      setStatusMsg(`Game #${gameId} created!`);
    } else {
      setStatusMsg("Failed to create game");
    }
  };

  const handleJoin = async (gameId?: number) => {
    const id = gameId || parseInt(joinInput);
    if (!id || isNaN(id)) {
      setStatusMsg("Enter a valid game ID");
      return;
    }
    setStatusMsg(`Joining game #${id}...`);
    const res = await joinGame(id);
    if (res) {
      setActiveGameId(id);
      setStatusMsg(`Joined game #${id}!`);
    } else {
      setStatusMsg("Failed to join game");
    }
  };

  const handleCommit = async (moveValue: number) => {
    if (!activeGameId) return;
    setStatusMsg(`Committing ${moveName(moveValue)}...`);
    const res = await commitMove(activeGameId, moveValue);
    if (res) {
      setStatusMsg("Move committed! Waiting for opponent...");
      refetchGame();
    } else {
      setStatusMsg("Failed to commit move");
    }
  };

  const handleReveal = async () => {
    if (!activeGameId) return;
    setStatusMsg("Revealing move...");
    const res = await revealMove(activeGameId);
    if (res) {
      setStatusMsg("Move revealed!");
      refetchGame();
    } else {
      setStatusMsg("Failed to reveal move");
    }
  };

  const handleClaimTimeout = async () => {
    if (!activeGameId) return;
    setStatusMsg("Claiming timeout...");
    const res = await claimTimeout(activeGameId);
    if (res) {
      setStatusMsg("Timeout claimed!");
      refetchGame();
    } else {
      setStatusMsg("Failed to claim timeout");
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const backToLobby = () => {
    setActiveGameId(null);
    setStatusMsg("");
  };

  const getResult = () => {
    if (!game || game.status !== GameStatus.FINISHED) return null;
    if (game.winner === ZERO_ADDR || normalizeAddr(game.winner) === ZERO_ADDR) {
      return "Draw!";
    }
    if (isSameAddress(game.winner, myAddress)) {
      return "You Win!";
    }
    return "You Lose";
  };

  // --- RENDER ---

  // Lobby view
  if (activeGameId === null) {
    return (
      <Flex direction="column" p={8} maxW="700px" mx="auto" gap={6}>
        <Flex justify="space-between" align="center">
          <Heading size="lg">Rock Paper Scissors</Heading>
          <Flex align="center" gap={4}>
            <Text fontSize="sm" color="gray.400">
              {accountType === "controller" ? "Controller" : "Guest"} |{" "}
              {accountDisplay}
            </Text>
            <Button size="sm" variant="outline" onClick={handleLogout}>
              Logout
            </Button>
          </Flex>
        </Flex>

        {/* Create */}
        <Box bg="gray.800" p={6} borderRadius="md">
          <VStack align="stretch" gap={3}>
            <Heading size="md">New Game</Heading>
            <Button
              colorScheme="blue"
              onClick={handleCreate}
              isLoading={isLoading}
            >
              Create Game
            </Button>
          </VStack>
        </Box>

        {/* Join */}
        <Box bg="gray.800" p={6} borderRadius="md">
          <VStack align="stretch" gap={3}>
            <Heading size="md">Join Game</Heading>
            <HStack>
              <Input
                placeholder="Game ID"
                value={joinInput}
                onChange={(e) => setJoinInput(e.target.value)}
                type="number"
              />
              <Button
                colorScheme="green"
                onClick={() => handleJoin()}
                isLoading={isLoading}
                minW="100px"
              >
                Join
              </Button>
            </HStack>
          </VStack>
        </Box>

        {/* Open games */}
        <Box bg="gray.800" p={6} borderRadius="md">
          <VStack align="stretch" gap={3}>
            <Heading size="md">Open Games</Heading>
            {openGames.length === 0 ? (
              <Text color="gray.500">No open games</Text>
            ) : (
              openGames.map((g) => (
                <Flex
                  key={g.game_id}
                  justify="space-between"
                  align="center"
                  bg="gray.700"
                  p={3}
                  borderRadius="md"
                >
                  <Text>
                    Game #{g.game_id} - {truncateAddr(g.player1)}
                  </Text>
                  <Button
                    size="sm"
                    colorScheme="green"
                    onClick={() => handleJoin(g.game_id)}
                    isLoading={isLoading}
                  >
                    Join
                  </Button>
                </Flex>
              ))
            )}
          </VStack>
        </Box>

        {statusMsg && (
          <Code p={3} borderRadius="md" fontSize="sm">
            {statusMsg}
          </Code>
        )}
      </Flex>
    );
  }

  // Game view
  return (
    <Flex direction="column" p={8} maxW="700px" mx="auto" gap={6}>
      <Flex justify="space-between" align="center">
        <HStack>
          <Button size="sm" variant="ghost" onClick={backToLobby}>
            Back
          </Button>
          <Heading size="lg">Game #{activeGameId}</Heading>
        </HStack>
        <Text fontSize="sm" color="gray.400">
          {accountDisplay}
        </Text>
      </Flex>

      {!game ? (
        <Flex justify="center" p={8}>
          <Spinner size="lg" />
        </Flex>
      ) : (
        <>
          {/* Game info */}
          <Box bg="gray.800" p={6} borderRadius="md">
            <VStack align="stretch" gap={2}>
              <Flex justify="space-between">
                <Text fontWeight="bold">Status</Text>
                <Badge
                  colorScheme={
                    game.status === GameStatus.FINISHED
                      ? "purple"
                      : game.status === GameStatus.WAITING
                        ? "yellow"
                        : "blue"
                  }
                >
                  {statusLabel(game.status)}
                </Badge>
              </Flex>
              <Flex justify="space-between">
                <Text>Player 1</Text>
                <Text fontSize="sm" color={isPlayer1 ? "green.300" : "gray.400"}>
                  {truncateAddr(game.player1)} {isPlayer1 && "(you)"}
                </Text>
              </Flex>
              <Flex justify="space-between">
                <Text>Player 2</Text>
                <Text fontSize="sm" color={isPlayer2 ? "green.300" : "gray.400"}>
                  {game.player2 && normalizeAddr(game.player2) !== ZERO_ADDR
                    ? `${truncateAddr(game.player2)} ${isPlayer2 ? "(you)" : ""}`
                    : "---"}
                </Text>
              </Flex>
            </VStack>
          </Box>

          {/* WAITING: show game ID to share */}
          {game.status === GameStatus.WAITING && isPlayer1 && (
            <Box bg="gray.800" p={6} borderRadius="md" textAlign="center">
              <Text color="gray.400" mb={2}>
                Share this Game ID with your opponent:
              </Text>
              <Heading size="xl" color="blue.300">
                {game.game_id}
              </Heading>
              <Text color="gray.500" mt={2}>
                Waiting for opponent to join...
              </Text>
            </Box>
          )}

          {/* COMMITTING: select move */}
          {game.status === GameStatus.COMMITTING && isMyGame && !pendingCommit && (
            <Box bg="gray.800" p={6} borderRadius="md">
              <VStack gap={4}>
                <Heading size="md">Choose your move</Heading>
                <HStack gap={4}>
                  {[Move.ROCK, Move.PAPER, Move.SCISSORS].map((m) => (
                    <Button
                      key={m}
                      size="lg"
                      colorScheme={
                        m === Move.ROCK
                          ? "orange"
                          : m === Move.PAPER
                            ? "blue"
                            : "green"
                      }
                      onClick={() => handleCommit(m)}
                      isLoading={isLoading}
                      minW="120px"
                      h="80px"
                      fontSize="lg"
                    >
                      {moveName(m)}
                    </Button>
                  ))}
                </HStack>
              </VStack>
            </Box>
          )}

          {/* COMMITTING: already committed */}
          {game.status === GameStatus.COMMITTING && pendingCommit && (
            <Box bg="gray.800" p={6} borderRadius="md" textAlign="center">
              <Text color="green.300" fontWeight="bold">
                Move committed ({moveName(pendingCommit.moveValue)})
              </Text>
              <Text color="gray.500" mt={2}>
                Waiting for opponent to commit...
              </Text>
            </Box>
          )}

          {/* REVEALING: reveal button */}
          {game.status === GameStatus.REVEALING && isMyGame && pendingCommit && (
            <Box bg="gray.800" p={6} borderRadius="md">
              <VStack gap={4}>
                <Heading size="md">Reveal Phase</Heading>
                <Text color="gray.400">
                  Your move: {moveName(pendingCommit.moveValue)}
                </Text>
                <Button
                  colorScheme="purple"
                  size="lg"
                  onClick={handleReveal}
                  isLoading={isLoading}
                >
                  Reveal Move
                </Button>
              </VStack>
            </Box>
          )}

          {/* REVEALING: already revealed */}
          {game.status === GameStatus.REVEALING && isMyGame && !pendingCommit && (
            <Box bg="gray.800" p={6} borderRadius="md" textAlign="center">
              <Text color="green.300" fontWeight="bold">
                Move revealed!
              </Text>
              <Text color="gray.500" mt={2}>
                Waiting for opponent to reveal...
              </Text>
              <Button
                mt={4}
                colorScheme="red"
                variant="outline"
                size="sm"
                onClick={handleClaimTimeout}
                isLoading={isLoading}
              >
                Claim Timeout
              </Button>
            </Box>
          )}

          {/* FINISHED: result */}
          {game.status === GameStatus.FINISHED && (
            <Box bg="gray.800" p={6} borderRadius="md" textAlign="center">
              <Heading
                size="xl"
                color={
                  getResult() === "You Win!"
                    ? "green.300"
                    : getResult() === "Draw!"
                      ? "yellow.300"
                      : "red.300"
                }
                mb={4}
              >
                {getResult()}
              </Heading>
              <HStack justify="center" gap={8}>
                <VStack>
                  <Text color="gray.400">Player 1</Text>
                  <Text fontSize="xl" fontWeight="bold">
                    {moveName(game.player1_move)}
                  </Text>
                </VStack>
                <Text fontSize="2xl" color="gray.500">
                  vs
                </Text>
                <VStack>
                  <Text color="gray.400">Player 2</Text>
                  <Text fontSize="xl" fontWeight="bold">
                    {moveName(game.player2_move)}
                  </Text>
                </VStack>
              </HStack>
              <Button mt={6} colorScheme="blue" onClick={backToLobby}>
                Play Again
              </Button>
            </Box>
          )}
        </>
      )}

      {statusMsg && (
        <Code p={3} borderRadius="md" fontSize="sm">
          {statusMsg}
        </Code>
      )}
    </Flex>
  );
}
