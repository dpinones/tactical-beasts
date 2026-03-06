import {
  Box,
  Button,
  Flex,
  Heading,
  Input,
  Text,
  VStack,
  HStack,
  Spinner,
  Code,
} from "@chakra-ui/react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "../dojo/WalletContext";
import { useOpenGames } from "../hooks/useGameQuery";
import { useGameStore } from "../stores/gameStore";

const CHAIN = import.meta.env.VITE_CHAIN;

function truncateAddr(addr: string): string {
  if (!addr) return "---";
  return addr.slice(0, 6) + "..." + addr.slice(-4);
}

export function HomePage() {
  const {
    finalAccount,
    switchToController,
    connectAsGuest,
    isLoadingWallet,
    connectionStatus,
    setConnectionStatus,
    accountType,
    logout,
  } = useWallet();

  const navigate = useNavigate();
  const allowGuest = CHAIN !== "mainnet" && CHAIN !== "sepolia";
  const isLoggedIn = !!finalAccount;

  const { games: openGames } = useOpenGames();
  const { clearSelectedBeasts } = useGameStore();

  const [joinInput, setJoinInput] = useState("");
  const [statusMsg, setStatusMsg] = useState("");

  const handleCreate = () => {
    clearSelectedBeasts();
    navigate("/team-select/create");
  };

  const handleJoin = (gameId?: number) => {
    const id = gameId || parseInt(joinInput);
    if (!id || isNaN(id)) {
      setStatusMsg("Enter a valid game ID");
      return;
    }
    clearSelectedBeasts();
    navigate(`/team-select/join/${id}`);
  };

  const handleLogout = () => {
    logout();
  };

  // --- Not logged in ---
  if (!isLoggedIn) {
    return (
      <Flex
        direction="column"
        align="center"
        justify="center"
        minH="100vh"
        gap={8}
        p={4}
      >
        {/* Title */}
        <VStack gap={2}>
          <Heading
            size="2xl"
            fontFamily="heading"
            textTransform="uppercase"
            letterSpacing="0.12em"
            color="green.300"
            textShadow="0 0 30px rgba(0,255,68,0.3)"
          >
            Tactical Beasts
          </Heading>
          <Text fontSize="sm" color="text.secondary" textAlign="center" maxW="400px">
            Tactical turn-based PvP combat with Loot Survivor beasts on
            Starknet.
          </Text>
        </VStack>

        {/* Login buttons */}
        <Flex gap={4}>
          {isLoadingWallet && connectionStatus !== "selecting" ? (
            <Spinner size="lg" color="green.400" />
          ) : (
            <>
              <Button
                variant="primary"
                size="lg"
                onClick={() => {
                  setConnectionStatus("connecting_controller");
                  switchToController();
                }}
              >
                Login
              </Button>
              {allowGuest && (
                <Button
                  variant="secondary"
                  size="lg"
                  onClick={connectAsGuest}
                >
                  Guest
                </Button>
              )}
            </>
          )}
        </Flex>

        {/* Version */}
        <Text fontSize="xs" color="text.muted" position="absolute" bottom={4}>
          v0.1.0 MVP
        </Text>
      </Flex>
    );
  }

  // --- Logged in: Lobby ---
  return (
    <Flex direction="column" minH="100vh" p={6} maxW="800px" mx="auto">
      {/* Header */}
      <Flex justify="space-between" align="center" mb={6}>
        <Heading
          size="lg"
          fontFamily="heading"
          color="green.300"
          textTransform="uppercase"
          letterSpacing="0.08em"
        >
          Tactical Beasts
        </Heading>
        <Flex align="center" gap={3}>
          <Text fontSize="xs" color="text.secondary">
            {accountType === "controller" ? "Controller" : "Guest"} |{" "}
            {truncateAddr(finalAccount?.address || "")}
          </Text>
          <Button size="sm" variant="ghost" onClick={handleLogout}>
            Logout
          </Button>
        </Flex>
      </Flex>

      {/* Create Game */}
      <Box
        bg="surface.panel"
        border="1px solid"
        borderColor="surface.border"
        borderRadius="3px"
        p={5}
        mb={4}
      >
        <VStack align="stretch" gap={3}>
          <Text
            fontFamily="heading"
            fontSize="sm"
            fontWeight="600"
            color="green.300"
            textTransform="uppercase"
            letterSpacing="0.1em"
          >
            New Game
          </Text>
          <Text fontSize="xs" color="text.secondary">
            Create a match and share the Game ID with your opponent.
          </Text>
          <Button variant="primary" onClick={handleCreate}>
            Create Game
          </Button>
        </VStack>
      </Box>

      {/* Join Game */}
      <Box
        bg="surface.panel"
        border="1px solid"
        borderColor="surface.border"
        borderRadius="3px"
        p={5}
        mb={4}
      >
        <VStack align="stretch" gap={3}>
          <Text
            fontFamily="heading"
            fontSize="sm"
            fontWeight="600"
            color="green.300"
            textTransform="uppercase"
            letterSpacing="0.1em"
          >
            Join Game
          </Text>
          <HStack>
            <Input
              placeholder="Game ID"
              value={joinInput}
              onChange={(e) => setJoinInput(e.target.value)}
              type="number"
            />
            <Button
              variant="primary"
              onClick={() => handleJoin()}
              minW="100px"
            >
              Join
            </Button>
          </HStack>
        </VStack>
      </Box>

      {/* Open Games */}
      <Box
        bg="surface.panel"
        border="1px solid"
        borderColor="surface.border"
        borderRadius="3px"
        p={5}
        mb={4}
      >
        <VStack align="stretch" gap={3}>
          <Text
            fontFamily="heading"
            fontSize="sm"
            fontWeight="600"
            color="green.300"
            textTransform="uppercase"
            letterSpacing="0.1em"
          >
            Open Games
          </Text>
          {openGames.length === 0 ? (
            <Text fontSize="xs" color="text.muted">
              No open games
            </Text>
          ) : (
            openGames.map((g) => (
              <Flex
                key={g.game_id}
                justify="space-between"
                align="center"
                bg="surface.card"
                p={3}
                borderRadius="3px"
                border="1px solid"
                borderColor="surface.border"
              >
                <Text fontSize="sm">
                  Game #{g.game_id} — {truncateAddr(g.player1)}
                </Text>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => handleJoin(g.game_id)}
                    >
                  Join
                </Button>
              </Flex>
            ))
          )}
        </VStack>
      </Box>

      {/* Status message */}
      {statusMsg && (
        <Code
          p={3}
          borderRadius="3px"
          fontSize="xs"
          bg="surface.card"
          color="text.secondary"
          border="1px solid"
          borderColor="surface.border"
        >
          {statusMsg}
        </Code>
      )}
    </Flex>
  );
}
