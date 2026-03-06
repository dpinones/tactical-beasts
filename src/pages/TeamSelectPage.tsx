import {
  Box,
  Button,
  Flex,
  Heading,
  Text,
  HStack,
  Input,
  Spinner,
  Badge,
  SimpleGrid,
} from "@chakra-ui/react";
import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useGameActions } from "../hooks/useGameActions";
import { useGameQuery } from "../hooks/useGameQuery";
import { useGameStore } from "../stores/gameStore";
import { loadBeastCatalog } from "../data/beasts";
import { BeastCard } from "../components/BeastCard";
import { GameStatus, BeastType } from "../domain/types";

type Phase = "creating" | "joining" | "lobby" | "select" | "confirming" | "waiting" | "error";

export function TeamSelectPage() {
  const { gameId: gameIdParam } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const isCreateMode = location.pathname === "/team-select/create";
  const joinGameId = gameIdParam ? parseInt(gameIdParam) : null;

  const { createGame, joinGame, setTeam, isLoading } = useGameActions();
  const { selectedBeasts, toggleBeast, clearSelectedBeasts, setActiveGameId } = useGameStore();

  const [filter, setFilter] = useState<"all" | "Magical" | "Hunter" | "Brute">("all");
  const [tierFilter, setTierFilter] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [statusMsg, setStatusMsg] = useState("");
  const [phase, setPhase] = useState<Phase>(isCreateMode ? "creating" : "joining");
  const [gameId, setGameId] = useState<number | null>(joinGameId);

  const catalog = useMemo(() => loadBeastCatalog(), []);

  const filteredBeasts = useMemo(() => {
    let result = catalog;
    if (filter !== "all") {
      const typeMap: Record<string, BeastType> = {
        Magical: BeastType.Magical,
        Hunter: BeastType.Hunter,
        Brute: BeastType.Brute,
      };
      result = result.filter((b) => b.type === typeMap[filter]);
    }
    if (tierFilter !== null) {
      result = result.filter((b) => b.tier === tierFilter);
    }
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(
        (b) =>
          b.beast.toLowerCase().includes(s) ||
          b.name.toLowerCase().includes(s) ||
          b.prefix.toLowerCase().includes(s) ||
          b.suffix.toLowerCase().includes(s)
      );
    }
    return result.slice(0, 50);
  }, [catalog, filter, tierFilter, search]);

  // Step 1: Create game onchain (no beasts)
  useEffect(() => {
    if (phase !== "creating") return;
    let cancelled = false;
    (async () => {
      setStatusMsg("Creating game...");
      const id = await createGame();
      if (cancelled) return;
      if (id) {
        setGameId(id);
        setActiveGameId(id);
        setPhase("lobby");
        setStatusMsg("");
      } else {
        setPhase("error");
        setStatusMsg("Failed to create game");
      }
    })();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Step 1b: Join game onchain (no beasts)
  useEffect(() => {
    if (phase !== "joining" || !joinGameId) return;
    let cancelled = false;
    (async () => {
      setStatusMsg("Joining game...");
      const res = await joinGame(joinGameId);
      if (cancelled) return;
      if (res) {
        setGameId(joinGameId);
        setActiveGameId(joinGameId);
        setPhase("select");
        setStatusMsg("");
      } else {
        setPhase("error");
        setStatusMsg("Failed to join game");
      }
    })();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Poll game state to detect when opponent joins (lobby) or when game starts (after set_team)
  const { game: polledGame } = useGameQuery(gameId);

  // Lobby: wait for opponent to join, then move to team select
  useEffect(() => {
    if (phase === "lobby" && polledGame && polledGame.player2 && polledGame.player2 !== "0x0") {
      setPhase("select");
    }
  }, [phase, polledGame]);

  // After confirming team: poll until game starts (both teams set)
  useEffect(() => {
    if (phase === "waiting" && polledGame && polledGame.status === GameStatus.PLAYING && gameId) {
      navigate(`/battle/${gameId}`);
    }
  }, [phase, polledGame, gameId, navigate]);

  // Confirm team: call set_team onchain
  const handleConfirmTeam = async () => {
    if (selectedBeasts.length !== 3 || !gameId) return;
    setPhase("confirming");
    setStatusMsg("Setting team...");
    const res = await setTeam(gameId, selectedBeasts[0], selectedBeasts[1], selectedBeasts[2]);
    if (res) {
      setPhase("waiting");
      setStatusMsg("");
    } else {
      setPhase("error");
      setStatusMsg("Failed to set team");
    }
  };

  // --- Creating / Joining ---
  if (phase === "creating" || phase === "joining") {
    return (
      <Flex direction="column" align="center" justify="center" minH="100vh" gap={4}>
        <Spinner color="green.400" size="lg" />
        <Text fontSize="sm" color="text.secondary">{statusMsg}</Text>
        <Button variant="ghost" size="sm" onClick={() => navigate("/")}>Cancel</Button>
      </Flex>
    );
  }

  // --- Error ---
  if (phase === "error") {
    return (
      <Flex direction="column" align="center" justify="center" minH="100vh" gap={4}>
        <Text fontSize="sm" color="danger.300">{statusMsg}</Text>
        <Button variant="secondary" onClick={() => navigate("/")}>Back to Home</Button>
      </Flex>
    );
  }

  // --- Lobby: waiting for opponent ---
  if (phase === "lobby" && gameId) {
    return (
      <Flex direction="column" align="center" justify="center" minH="100vh" gap={6} p={4}>
        <Heading size="lg" fontFamily="heading" color="green.300" textTransform="uppercase">
          Game Created
        </Heading>
        <Box
          bg="surface.panel"
          border="1px solid"
          borderColor="green.700"
          borderRadius="3px"
          p={8}
          textAlign="center"
        >
          <Text fontSize="xs" color="text.secondary" mb={3}>
            Share this Game ID with your opponent
          </Text>
          <Badge
            variant="magical"
            fontSize="2xl"
            px={6}
            py={2}
            cursor="pointer"
            onClick={() => {
              navigator.clipboard.writeText(String(gameId));
              setStatusMsg("Copied!");
              setTimeout(() => setStatusMsg(""), 2000);
            }}
          >
            {gameId}
          </Badge>
          <Text fontSize="xs" color="text.muted" mt={2}>Click to copy</Text>
        </Box>
        <Spinner color="green.400" size="lg" />
        <Text fontSize="sm" color="text.secondary">Waiting for opponent to join...</Text>
        {statusMsg && <Text fontSize="xs" color="text.secondary">{statusMsg}</Text>}
        <Button variant="ghost" size="sm" onClick={() => navigate("/")}>Cancel</Button>
      </Flex>
    );
  }

  // --- Waiting for opponent's team ---
  if (phase === "waiting") {
    return (
      <Flex direction="column" align="center" justify="center" minH="100vh" gap={4}>
        <Heading size="md" fontFamily="heading" color="green.300" textTransform="uppercase">
          Team Confirmed
        </Heading>
        <Spinner color="green.400" size="lg" />
        <Text fontSize="sm" color="text.secondary">Waiting for opponent to select their team...</Text>
        <Button variant="ghost" size="sm" onClick={() => navigate("/")}>Cancel</Button>
      </Flex>
    );
  }

  // --- Team selection ---
  return (
    <Flex direction="column" minH="100vh" p={4} maxW="1100px" mx="auto">
      {/* Header */}
      <Flex justify="space-between" align="center" mb={4}>
        <Flex align="center" gap={3}>
          <Button size="sm" variant="ghost" onClick={() => navigate("/")}>Back</Button>
          <Heading size="md" fontFamily="heading" color="green.300" textTransform="uppercase">
            Select Your Team — Game #{gameId}
          </Heading>
        </Flex>
      </Flex>

      {/* Status bar */}
      <Box bg="surface.panel" border="1px solid" borderColor="surface.border" borderRadius="3px" p={3} mb={4}>
        <Flex justify="space-between" align="center">
          <Text fontSize="xs" color="text.secondary">
            Choose 3 beasts for your team
          </Text>
          <Text fontSize="xs" color="text.gold" fontFamily="mono">
            Team: {selectedBeasts.length}/3
          </Text>
        </Flex>
      </Box>

      {/* Filters */}
      <Flex gap={2} mb={3} flexWrap="wrap">
        <Input
          placeholder="Search beast..."
          size="sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          maxW="200px"
        />
        {(["all", "Magical", "Hunter", "Brute"] as const).map((f) => (
          <Button
            key={f}
            size="sm"
            variant={filter === f ? "primary" : "secondary"}
            onClick={() => setFilter(f)}
            fontSize="xs"
          >
            {f === "all" ? "All" : f}
          </Button>
        ))}
        {[1, 2, 3, 4, 5].map((t) => (
          <Button
            key={t}
            size="sm"
            variant={tierFilter === t ? "gold" : "secondary"}
            onClick={() => setTierFilter(tierFilter === t ? null : t)}
            fontSize="xs"
          >
            T{t}
          </Button>
        ))}
      </Flex>

      {/* Beast catalog */}
      <Box flex={1} overflowY="auto" mb={4}>
        <SimpleGrid columns={{ base: 2, md: 3, lg: 4 }} gap={3}>
          {filteredBeasts.map((beast) => (
            <BeastCard
              key={beast.tokenId}
              beast={beast}
              isSelected={selectedBeasts.includes(beast.tokenId)}
              onToggle={toggleBeast}
              disabled={selectedBeasts.length >= 3 && !selectedBeasts.includes(beast.tokenId)}
            />
          ))}
        </SimpleGrid>
      </Box>

      {/* Confirm button */}
      <Box position="sticky" bottom={0} bg="surface.bg" pt={3} pb={2} borderTop="1px solid" borderColor="surface.border">
        <Flex gap={3} align="center">
          <Button
            variant="primary"
            size="lg"
            onClick={handleConfirmTeam}
            isDisabled={selectedBeasts.length !== 3}
            isLoading={phase === "confirming"}
            flex={1}
          >
            Confirm Team ({selectedBeasts.length}/3)
          </Button>
          <Button variant="ghost" size="sm" onClick={clearSelectedBeasts}>Clear</Button>
        </Flex>
      </Box>

      {statusMsg && (
        <Text fontSize="xs" color="text.secondary" mt={2} textAlign="center">{statusMsg}</Text>
      )}
    </Flex>
  );
}
