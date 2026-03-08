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
  Image,
  Select,
} from "@chakra-ui/react";
import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useDojo } from "../dojo/DojoContext";
import { useGameActions } from "../hooks/useGameActions";
import { useGameQuery, usePlayerProfile, useMapState, mapStateToObstacles } from "../hooks/useGameQuery";
import { useGameStore } from "../stores/gameStore";
import { useOwnedBeasts } from "../hooks/useOwnedBeasts";
import { BeastCard } from "../components/BeastCard";
import { HexGrid } from "../components/HexGrid";
import { OBSTACLES } from "../domain/hexGrid";
import { GameStatus, BeastType, Subclass, CatalogBeast, ZERO_ADDR } from "../domain/types";
import { updateRecentBeasts } from "../services/supabase";
import { getSubclass, getSubclassName } from "../data/beasts";

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
  const [subclassFilter, setSubclassFilter] = useState<Subclass | null>(null);
  const [search, setSearch] = useState("");
  const [statusMsg, setStatusMsg] = useState("");
  const [phase, setPhase] = useState<Phase>(
    isMatchMode ? "select" : isCreateMode ? "creating" : "joining"
  );
  const [gameId, setGameId] = useState<number | null>(joinGameId);

  const { beasts: ownedBeasts, isLoading: beastsLoading } = useOwnedBeasts();

  // Convert OwnedBeast to CatalogBeast for BeastCard compatibility
  const catalog = useMemo((): CatalogBeast[] => {
    return ownedBeasts.map((b) => {
      const typeStr = b.type === "Magic" ? "Magical" : b.type;
      const bType = b.type === "Magic" || b.type === "Magical" ? BeastType.Magical
        : b.type === "Hunter" ? BeastType.Hunter
        : BeastType.Brute;
      return {
        tokenId: b.token_id,
        name: `${b.prefix ? `"${b.prefix} ${b.suffix}" ` : ""}${b.name}`,
        beastId: b.id,
        beast: b.name,
        type: bType,
        typeName: typeStr,
        tier: b.tier,
        level: b.level,
        health: b.health,
        power: b.power,
        prefix: b.prefix || "",
        suffix: b.suffix || "",
        adventurersKilled: b.adventurers_killed,
        shiny: b.shiny,
        animated: b.animated,
      };
    });
  }, [ownedBeasts]);

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
    if (subclassFilter !== null) {
      result = result.filter((b) => getSubclass(b.beastId) === subclassFilter);
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
  }, [catalog, filter, tierFilter, subclassFilter, search]);

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
      <Flex direction="column" align="center" justify="center" minH="100vh" bgImage="url('/seleccion%20de%20bestias.png')" bgSize="cover" bgPosition="center" gap={4}>
        <Spinner color="green.400" size="lg" />
        <Text fontSize="sm" color="text.secondary">{statusMsg}</Text>
        <Button variant="ghost" size="sm" onClick={() => navigate("/")}>Cancel</Button>
      </Flex>
    );
  }

  // --- Error ---
  if (phase === "error") {
    return (
      <Flex direction="column" align="center" justify="center" minH="100vh" bgImage="url('/seleccion%20de%20bestias.png')" bgSize="cover" bgPosition="center" gap={4}>
        <Text fontSize="sm" color="danger.300">{statusMsg}</Text>
        <Button variant="secondary" onClick={() => navigate("/")}>Back to Home</Button>
      </Flex>
    );
  }

  // --- Lobby: waiting for opponent ---
  if (phase === "lobby" && gameId) {
    return (
      <Flex direction="column" align="center" justify="center" minH="100vh" bgImage="url('/seleccion%20de%20bestias.png')" bgSize="cover" bgPosition="center" gap={6} p={4}>
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
      <Flex direction="column" align="center" justify="center" minH="100vh" bgImage="url('/seleccion%20de%20bestias.png')" bgSize="cover" bgPosition="center" gap={4}>
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
    <Flex
      direction="column"
      h="100vh"
      w="100vw"
      overflow="hidden"
      p={4}
      bgImage="url('/seleccion%20de%20bestias.png')"
      bgSize="cover"
      bgPosition="center"
    >
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
        <Flex align="center">
          <Text fontSize="xs" color="text.secondary">
            Choose 3 beasts for your team
          </Text>
        </Flex>
      </Box>

      {/* Two-panel layout */}
      <Flex direction={{ base: "column", lg: "row" }} gap={4} flex={1} minH={0} overflow="hidden">
        {/* Left panel: Filters + Beast catalog (only scrollable area) */}
        <Box
          flex={3}
          minH={0}
          overflowY="auto"
          pr={1}
        >
          {/* Filters */}
          <Flex gap={2} mb={3} flexWrap="wrap" align="center">
            <Input
              placeholder="Search beast..."
              size="sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              maxW="180px"
            />
            <Select
              size="sm"
              maxW="130px"
              value={filter}
              onChange={(e) => {
                setFilter(e.target.value as any);
                setSubclassFilter(null);
              }}
              bg="surface.panel"
              borderColor="surface.border"
              fontSize="xs"
            >
              <option value="all">All Types</option>
              <option value="Magical">Magical</option>
              <option value="Hunter">Hunter</option>
              <option value="Brute">Brute</option>
            </Select>
            <Select
              size="sm"
              maxW="140px"
              value={subclassFilter === null ? "all" : String(subclassFilter)}
              onChange={(e) => setSubclassFilter(e.target.value === "all" ? null : Number(e.target.value) as Subclass)}
              bg="surface.panel"
              borderColor="surface.border"
              fontSize="xs"
            >
              <option value="all">All Subclasses</option>
              {filter === "all" || filter === "Magical" ? (
                <>
                  <option value={String(Subclass.Warlock)}>Warlock</option>
                  <option value={String(Subclass.Enchanter)}>Enchanter</option>
                </>
              ) : null}
              {filter === "all" || filter === "Hunter" ? (
                <>
                  <option value={String(Subclass.Stalker)}>Stalker</option>
                  <option value={String(Subclass.Ranger)}>Ranger</option>
                </>
              ) : null}
              {filter === "all" || filter === "Brute" ? (
                <>
                  <option value={String(Subclass.Juggernaut)}>Juggernaut</option>
                  <option value={String(Subclass.Berserker)}>Berserker</option>
                </>
              ) : null}
            </Select>
            <Select
              size="sm"
              maxW="100px"
              value={tierFilter === null ? "all" : String(tierFilter)}
              onChange={(e) => setTierFilter(e.target.value === "all" ? null : Number(e.target.value))}
              bg="surface.panel"
              borderColor="surface.border"
              fontSize="xs"
            >
              <option value="all">All Tiers</option>
              <option value="2">T2</option>
              <option value="3">T3</option>
              <option value="4">T4</option>
            </Select>
          </Flex>

          {/* Beast catalog */}
          <Box mb={4}>
            {beastsLoading ? (
              <Flex justify="center" py={8}>
                <Spinner color="green.400" size="lg" />
              </Flex>
            ) : catalog.length === 0 ? (
              <Flex direction="column" align="center" py={8} gap={2}>
                <Text color="text.secondary" fontSize="sm">No beasts found</Text>
                <Text color="text.muted" fontSize="xs">Play Loot Survivor to earn beast NFTs</Text>
              </Flex>
            ) : (
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
            )}
          </Box>
        </Box>

        {/* Right panel: Opponent profile + Map preview */}
        <Box flex={2} minH={0} overflow="hidden">
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
          <Box bg="surface.panel" border="1px solid" borderColor="surface.border" borderRadius="3px" p={2}>
            <Text fontSize="9px" color="text.secondary" textTransform="uppercase" letterSpacing="0.1em" mb={2}>
              Arena Map
            </Text>
            <HexGrid
              hexSize={17}
              myBeasts={[]}
              enemyBeasts={[]}
              selectedBeastIndex={null}
              onCellClick={() => {}}
              onBeastClick={() => {}}
              myPlayerIndex={1}
              obstacles={obstacles}
            />
          </Box>

          {/* Selected beasts */}
          <Box mt={4} bg="surface.panel" border="1px solid" borderColor="surface.border" borderRadius="3px" p={2}>
            <Flex align="center" justify="space-between" mb={2}>
              <Text fontSize="9px" color="text.secondary" textTransform="uppercase" letterSpacing="0.1em">
                Your Team
              </Text>
              <Badge
                bg="rgba(255,215,0,0.2)"
                border="1px solid"
                borderColor="rgba(255,215,0,0.55)"
                color="#FFD94A"
                fontSize="10px"
                px={2}
                py={0.5}
                borderRadius="3px"
              >
                {selectedBeasts.length}/3
              </Badge>
            </Flex>
            <Flex direction="column" gap={1.5}>
              {Array.from({ length: 3 }, (_, i) => {
                const tokenId = selectedBeasts[i];
                const beast = tokenId ? catalog.find((b) => b.tokenId === tokenId) : null;
                if (!beast || !tokenId) {
                  return (
                    <Flex
                      key={`empty-slot-${i}`}
                      border="1px dashed"
                      borderColor="surface.border"
                      borderRadius="3px"
                      p={1.5}
                      align="center"
                      gap={3}
                      h="44px"
                      bg="rgba(0, 0, 0, 0.14)"
                    >
                      <Text fontSize="xs" color="text.muted" fontWeight="bold" w="16px">
                        {i + 1}
                      </Text>
                      <Text fontSize="xs" color="text.muted">
                        Empty slot
                      </Text>
                    </Flex>
                  );
                }
                const subclass = getSubclass(beast.beastId);
                return (
                  <Flex
                    key={tokenId}
                    bg="rgba(0, 255, 68, 0.08)"
                    border="1px solid"
                    borderColor="green.700"
                    borderRadius="3px"
                    p={1.5}
                    align="center"
                    gap={3}
                  >
                    <Text fontSize="xs" color="green.400" fontWeight="bold" w="16px">
                      {i + 1}
                    </Text>
                    <Image
                      src={`/beasts/${beast.beast.toLowerCase()}.png`}
                      alt={beast.beast}
                      w="34px"
                      h="34px"
                      objectFit="contain"
                      borderRadius="3px"
                      bg="surface.card"
                    />
                    <Box flex={1} minW={0}>
                      <Text fontSize="xs" fontWeight="600" color="text.primary" noOfLines={1}>
                        {beast.beast}
                      </Text>
                      <HStack gap={1.5} fontSize="8px" color="text.secondary">
                        <Badge variant={beast.type === BeastType.Magical ? "magical" : beast.type === BeastType.Hunter ? "hunter" : "brute"} fontSize="8px">
                          {beast.typeName}
                        </Badge>
                        <Text>{getSubclassName(subclass)}</Text>
                        <Text>T{beast.tier}</Text>
                      </HStack>
                    </Box>
                    <Flex direction="column" align="flex-end" gap={0.5}>
                      <Text fontSize="8px" color="text.gold" fontFamily="mono">
                        Lv{beast.level} · HP {beast.health}
                      </Text>
                      <Text fontSize="8px" color="text.muted" fontFamily="mono">
                        #{beast.tokenId}
                      </Text>
                    </Flex>
                    <Button
                      size="xs"
                      variant="ghost"
                      color="danger.300"
                      onClick={() => toggleBeast(tokenId)}
                      px={1}
                    >
                      ✕
                    </Button>
                  </Flex>
                );
              })}
            </Flex>
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
