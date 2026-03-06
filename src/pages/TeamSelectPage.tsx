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
import { useDojo } from "../dojo/DojoContext";
import { useGameActions } from "../hooks/useGameActions";
import { useGameQuery, usePlayerProfile, useMapState, mapStateToObstacles } from "../hooks/useGameQuery";
import { useGameStore } from "../stores/gameStore";
import { loadBeastCatalog } from "../data/beasts";
import { BeastCard } from "../components/BeastCard";
import { HexGrid } from "../components/HexGrid";
import { OBSTACLES } from "../domain/hexGrid";
import { GameStatus, BeastType, ZERO_ADDR } from "../domain/types";
import { updateRecentBeasts } from "../services/supabase";

type Phase = "creating" | "joining" | "lobby" | "select" | "confirming" | "waiting" | "error";

export function TeamSelectPage() {
  const { gameId: gameIdParam } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const isCreateMode = location.pathname === "/team-select/create";
  const isMatchMode = location.pathname.startsWith("/team-select/match");
  const joinGameId = gameIdParam ? parseInt(gameIdParam) : null;

  const { account: { account } } = useDojo();
  const { createGame, joinGame, setTeam, isLoading } = useGameActions();
  const { selectedBeasts, toggleBeast, clearSelectedBeasts, setActiveGameId } = useGameStore();

  const [filter, setFilter] = useState<"all" | "Magical" | "Hunter" | "Brute">("all");
  const [tierFilter, setTierFilter] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [statusMsg, setStatusMsg] = useState("");
  const [phase, setPhase] = useState<Phase>(
    isMatchMode ? "select" : isCreateMode ? "creating" : "joining"
  );
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

  // Match mode: skip create/join, go directly to team select
  useEffect(() => {
    if (isMatchMode && joinGameId) {
      setActiveGameId(joinGameId);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  // Fetch map state (generated on join)
  const { mapState } = useMapState(gameId);
  const obstacles = useMemo(() => {
    if (!mapState) return OBSTACLES;
    return mapStateToObstacles(mapState);
  }, [mapState]);

  // Determine opponent address from polled game
  const myAddress = account?.address || "";
  const opponentAddress = useMemo(() => {
    if (!polledGame) return null;
    const normalize = (a: string) => "0x" + a.replace("0x", "").toLowerCase().padStart(64, "0");
    const me = normalize(myAddress);
    const p1 = normalize(polledGame.player1 || "");
    const p2 = normalize(polledGame.player2 || "");
    if (p1 === me && p2 !== normalize(ZERO_ADDR)) return polledGame.player2;
    if (p2 === me && p1 !== normalize(ZERO_ADDR)) return polledGame.player1;
    return null;
  }, [polledGame, myAddress]);

  const { profile: opponentProfile } = usePlayerProfile(opponentAddress);

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

  // Confirm team: call set_team onchain + save to supabase
  const handleConfirmTeam = async () => {
    if (selectedBeasts.length !== 3 || !gameId) return;
    setPhase("confirming");
    setStatusMsg("Setting team...");
    const res = await setTeam(gameId, selectedBeasts[0], selectedBeasts[1], selectedBeasts[2]);
    if (res) {
      // Save recent beasts to Supabase
      const walletAddress = account?.address || "";
      if (walletAddress) {
        const beastsToSave = selectedBeasts.map((tokenId) => {
          const beast = catalog.find((b) => b.tokenId === tokenId);
          return { id: tokenId, name: beast?.name || `Beast #${tokenId}` };
        });
        updateRecentBeasts(walletAddress, beastsToSave).catch(console.error);
      }
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

  // --- Team selection (2-panel layout) ---
  return (
    <Flex direction="column" minH="100vh" p={4} maxW="1400px" mx="auto">
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

      {/* Two-panel layout */}
      <Flex direction={{ base: "column", lg: "row" }} gap={4} flex={1} minH={0}>
        {/* Left panel: Filters + Beast catalog */}
        <Box flex={3}>
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
            <SimpleGrid columns={{ base: 2, md: 3, lg: 3 }} gap={3}>
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
        </Box>

        {/* Right panel: Opponent profile + Map preview */}
        <Box flex={2}>
          {/* Opponent profile */}
          {opponentProfile && (
            <Box bg="surface.panel" border="1px solid" borderColor="danger.700" borderRadius="3px" p={3} mb={4}>
              <Flex justify="space-between" align="center" mb={2}>
                <Text fontSize="9px" color="danger.300" textTransform="uppercase" letterSpacing="0.1em">
                  Opponent
                </Text>
                <Text fontSize="9px" color="text.muted" fontFamily="mono">
                  {opponentAddress ? opponentAddress.slice(0, 6) + "..." + opponentAddress.slice(-4) : ""}
                </Text>
              </Flex>
              <HStack gap={4} fontSize="xs" fontFamily="mono" color="text.secondary" flexWrap="wrap">
                <Text>Games: <Text as="span" color="text.gold">{opponentProfile.games_played}</Text></Text>
                <Text>W: <Text as="span" color="green.300">{opponentProfile.wins}</Text></Text>
                <Text>L: <Text as="span" color="danger.300">{opponentProfile.losses}</Text></Text>
                <Text>Abandons: <Text as="span" color="text.muted">{opponentProfile.abandons}</Text></Text>
                <Text>K/D: <Text as="span" color="text.primary">
                  {opponentProfile.total_deaths === 0
                    ? opponentProfile.total_kills > 0 ? `${opponentProfile.total_kills}/0` : "--"
                    : `${opponentProfile.total_kills}/${opponentProfile.total_deaths}`}
                </Text></Text>
              </HStack>
            </Box>
          )}

          {/* Map preview */}
          <Box bg="surface.panel" border="1px solid" borderColor="surface.border" borderRadius="3px" p={3}>
            <Text fontSize="9px" color="text.secondary" textTransform="uppercase" letterSpacing="0.1em" mb={2}>
              Arena Map
            </Text>
            <HexGrid
              hexSize={22}
              myBeasts={[]}
              enemyBeasts={[]}
              selectedBeastIndex={null}
              onCellClick={() => {}}
              onBeastClick={() => {}}
              myPlayerIndex={1}
              obstacles={obstacles}
            />
            <HStack gap={4} mt={2} fontSize="9px" color="text.muted" justify="center">
              <HStack gap={1}>
                <Box w="8px" h="8px" bg="rgba(85,102,85,0.5)" />
                <Text>Obstacle</Text>
              </HStack>
              <HStack gap={1}>
                <Box w="8px" h="8px" bg="rgba(0,255,68,0.15)" border="1px solid" borderColor="green.700" />
                <Text>P1 Spawn</Text>
              </HStack>
              <HStack gap={1}>
                <Box w="8px" h="8px" bg="rgba(255,51,51,0.15)" border="1px solid" borderColor="red.700" />
                <Text>P2 Spawn</Text>
              </HStack>
            </HStack>
          </Box>
        </Box>
      </Flex>

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
