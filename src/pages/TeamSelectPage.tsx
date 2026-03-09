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
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  useDisclosure,
} from "@chakra-ui/react";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useDojo } from "../dojo/DojoContext";
import { useGameActions } from "../hooks/useGameActions";
import { useGameQuery, useGameSettings, usePlayerProfile, useMapState, mapStateToObstacles } from "../hooks/useGameQuery";
import { useGameStore } from "../stores/gameStore";
import { useOwnedBeasts } from "../hooks/useOwnedBeasts";
import { BeastCard } from "../components/BeastCard";
import { HexGrid } from "../components/HexGrid";
import { CoinFlipIntro } from "../components/CoinFlipIntro";
import { OBSTACLES } from "../domain/hexGrid";
import { GameStatus, BeastType, Subclass, CatalogBeast, ZERO_ADDR } from "../domain/types";
import { updateRecentBeasts, getProfile } from "../services/supabase";
import { getSubclass, getSubclassName, DEFAULT_BEASTS } from "../data/beasts";
import { MAX_T2_PER_TEAM, MAX_T3_PER_TEAM } from "../domain/combat";
import { toast } from "sonner";

type Phase = "creating" | "joining" | "lobby" | "select" | "confirming" | "coin" | "waiting" | "error";

function normalizeAddr(addr: string): string {
  if (!addr) return "";
  const hex = addr.replace("0x", "").toLowerCase();
  return "0x" + hex.padStart(64, "0");
}

export function TeamSelectPage() {
  const { gameId: gameIdParam } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const isCreateMode = location.pathname === "/team-select/create";
  const isMatchMode = location.pathname.startsWith("/team-select/match");
  const isFromMatchmaking = !!(location.state as any)?.fromMatchmaking;
  const joinGameId = gameIdParam ? parseInt(gameIdParam) : null;

  const { account: { account } } = useDojo();
  const { createGame, joinGame, setTeam, setTeamDynamic, abandonGame, isLoading } = useGameActions();
  const leaveModal = useDisclosure();
  const { selectedBeasts, toggleBeast, clearSelectedBeasts, setSelectedBeasts, setActiveGameId } = useGameStore();

  const [filter, setFilter] = useState<"all" | "Magical" | "Hunter" | "Brute" | "default">("all");
  const [timer, setTimer] = useState(30);
  const timerRef = useRef<number | null>(null);
  const [tierFilter, setTierFilter] = useState<number | null>(null);
  const [subclassFilter, setSubclassFilter] = useState<Subclass | null>(null);
  const [search, setSearch] = useState("");
  const [statusMsg, setStatusMsg] = useState("");
  const [coinResultVisible, setCoinResultVisible] = useState(false);
  const [coinIGoFirst, setCoinIGoFirst] = useState(false);
  const [coinMyName, setCoinMyName] = useState("You");
  const [coinEnemyName, setCoinEnemyName] = useState("Opponent");
  const [phase, setPhase] = useState<Phase>(
    isMatchMode ? "select" : isCreateMode ? "creating" : "joining"
  );
  const [gameId, setGameId] = useState<number | null>(joinGameId);

  // On mount: load recent beasts for matchmaking, clear for friend invite
  useEffect(() => {
    if (isFromMatchmaking && account?.address) {
      getProfile(account.address).then((profile) => {
        if (profile?.recent_beasts?.length) {
          setSelectedBeasts(profile.recent_beasts.map((b) => b.id));
        } else {
          clearSelectedBeasts();
        }
      });
    } else {
      clearSelectedBeasts();
    }
  }, []);

  const { beasts: ownedBeasts, isLoading: beastsLoading } = useOwnedBeasts();

  // Convert OwnedBeast to CatalogBeast for BeastCard compatibility, merge defaults
  const ownedCatalog = useMemo((): CatalogBeast[] => {
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

  // Merge defaults into catalog (avoid duplicates by tokenId)
  const catalog = useMemo((): CatalogBeast[] => {
    const ownedIds = new Set(ownedCatalog.map((b) => b.tokenId));
    const defaults = DEFAULT_BEASTS.filter((b) => !ownedIds.has(b.tokenId));
    return [...ownedCatalog, ...defaults];
  }, [ownedCatalog]);

  const defaultTokenIds = new Set(DEFAULT_BEASTS.map((b) => b.tokenId));

  // Poll game state to detect when opponent joins (lobby) or when game starts (after set_team)
  const { game: polledGame } = useGameQuery(gameId);

  // Fetch game settings to know beasts_per_player
  const { settings: allSettings } = useGameSettings();
  const beatsPerPlayer = useMemo(() => {
    const sid = polledGame?.settings_id ?? 1;
    const s = allSettings.find((gs) => gs.settings_id === sid);
    return s?.beasts_per_player ?? 3;
  }, [polledGame, allSettings]);
  const maxT2 = useMemo(() => {
    const sid = polledGame?.settings_id ?? 1;
    const s = allSettings.find((gs) => gs.settings_id === sid);
    return s?.max_t2_per_team ?? MAX_T2_PER_TEAM;
  }, [polledGame, allSettings]);
  const maxT3 = useMemo(() => {
    const sid = polledGame?.settings_id ?? 1;
    const s = allSettings.find((gs) => gs.settings_id === sid);
    return s?.max_t3_per_team ?? MAX_T3_PER_TEAM;
  }, [polledGame, allSettings]);

  // Tier-limited toggle: respect settings for max per tier and team size
  const handleToggleBeast = useCallback((tokenId: number) => {
    // Always allow deselecting
    if (selectedBeasts.includes(tokenId)) {
      toggleBeast(tokenId);
      return;
    }
    // Enforce team size limit
    if (selectedBeasts.length >= beatsPerPlayer) {
      toast.error(`Max ${beatsPerPlayer} beasts per team`);
      return;
    }
    const beast = catalog.find((b) => b.tokenId === tokenId);
    if (!beast) return;
    const currentTiers = selectedBeasts
      .map((id) => catalog.find((b) => b.tokenId === id))
      .filter(Boolean)
      .map((b) => b!.tier);
    if (beast.tier === 2 && currentTiers.filter((t) => t === 2).length >= maxT2) {
      toast.error(`Max ${maxT2} T2 beast(s) per team`);
      return;
    }
    if (beast.tier === 3 && currentTiers.filter((t) => t === 3).length >= maxT3) {
      toast.error(`Max ${maxT3} T3 beast(s) per team`);
      return;
    }
    toggleBeast(tokenId);
  }, [selectedBeasts, catalog, toggleBeast, beatsPerPlayer, maxT2, maxT3]);

  // Check if a beast's tier slot is full (for disabling cards)
  const isTierFull = useCallback((tier: number): boolean => {
    const currentTiers = selectedBeasts
      .map((id) => catalog.find((b) => b.tokenId === id))
      .filter(Boolean)
      .map((b) => b!.tier);
    if (tier === 2) return currentTiers.filter((t) => t === 2).length >= maxT2;
    if (tier === 3) return currentTiers.filter((t) => t === 3).length >= maxT3;
    return false;
  }, [selectedBeasts, catalog, maxT2, maxT3]);

  // Apply filters to a beast list
  const applyFilters = useCallback((beasts: CatalogBeast[], skipTypeFilter = false): CatalogBeast[] => {
    let result = beasts;
    if (!skipTypeFilter) {
      if (filter === "default") {
        result = result.filter((b) => defaultTokenIds.has(b.tokenId));
      } else if (filter !== "all") {
        const typeMap: Record<string, BeastType> = {
          Magical: BeastType.Magical,
          Hunter: BeastType.Hunter,
          Brute: BeastType.Brute,
        };
        result = result.filter((b) => b.type === typeMap[filter]);
      }
    }
    if (tierFilter !== null) {
      result = result.filter((b) => b.tier === tierFilter);
    }
    if (subclassFilter !== null) {
      result = result.filter((b) => getSubclass(b.beastId) === subclassFilter);
    }
    if (search) {
      result = result.filter((b) => String(b.tokenId).startsWith(search));
    }
    return result;
  }, [filter, tierFilter, subclassFilter, search]);

  // Defaults always shown at top (unless filter hides them)
  const filteredDefaults = useMemo(() => {
    if (filter === "default") return applyFilters(DEFAULT_BEASTS, true);
    if (filter !== "all") {
      const typeMap: Record<string, BeastType> = {
        Magical: BeastType.Magical,
        Hunter: BeastType.Hunter,
        Brute: BeastType.Brute,
      };
      return DEFAULT_BEASTS.filter((b) => b.type === typeMap[filter]);
    }
    return DEFAULT_BEASTS;
  }, [filter, applyFilters]);

  // Owned beasts filtered (exclude defaults from this list)
  const filteredOwned = useMemo(() => {
    if (filter === "default") return [];
    return applyFilters(ownedCatalog).slice(0, 50);
  }, [ownedCatalog, applyFilters, filter]);

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

  // Navigate to result if game finishes (opponent abandoned)
  useEffect(() => {
    if (polledGame && polledGame.status === GameStatus.FINISHED && gameId) {
      navigate(`/result/${gameId}`);
    }
  }, [polledGame, gameId, navigate]);

  // After confirming team: wait until both teams are set, then show coin toss
  useEffect(() => {
    if (phase === "waiting" && polledGame && polledGame.status === GameStatus.PLAYING && gameId) {
      // Determine who goes first
      const myAddr = normalizeAddr(account?.address || "");
      const isPlayer1 = normalizeAddr(polledGame.player1) === myAddr;
      const myIndex = isPlayer1 ? 1 : 2;
      setCoinIGoFirst(polledGame.current_attacker === myIndex);

      // Resolve usernames
      const enemyAddr = isPlayer1 ? polledGame.player2 : polledGame.player1;
      getProfile(account?.address || "").then((p) => {
        if (p?.display_name) setCoinMyName(p.display_name);
      });
      getProfile(enemyAddr).then((p) => {
        if (p?.display_name) setCoinEnemyName(p.display_name);
      });

      setPhase("coin");
    }
  }, [phase, polledGame, gameId, account]);

  // Coin toss intro before entering waiting/battle
  useEffect(() => {
    if (phase !== "coin") return;
    setCoinResultVisible(false);

    const revealTimer = window.setTimeout(() => {
      setCoinResultVisible(true);
    }, 3000);

    const finishTimer = window.setTimeout(() => {
      if (gameId) {
        navigate(`/battle/${gameId}`);
      } else {
        setPhase("waiting");
      }
    }, 8000);

    return () => {
      window.clearTimeout(revealTimer);
      window.clearTimeout(finishTimer);
    };
  }, [phase, gameId, navigate]);

  // Auto-fill empty team slots with default beasts
  const getAutoFilledTeam = useCallback((current: number[]): number[] => {
    if (current.length >= beatsPerPlayer) return current.slice(0, beatsPerPlayer);
    const team = [...current];
    for (const def of DEFAULT_BEASTS) {
      if (team.length >= beatsPerPlayer) break;
      if (!team.includes(def.tokenId)) {
        team.push(def.tokenId);
      }
    }
    return team;
  }, [beatsPerPlayer]);

  // Confirm team: call set_team or set_team_dynamic onchain + save to supabase
  const handleConfirmTeam = useCallback(async (overrideBeasts?: number[]) => {
    const team = overrideBeasts || selectedBeasts;
    if (team.length !== beatsPerPlayer || !gameId) return;
    // Stop timer
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setPhase("confirming");
    setStatusMsg("Setting team...");
    const res = beatsPerPlayer === 3
      ? await setTeam(gameId, team[0], team[1], team[2])
      : await setTeamDynamic(gameId, team);
    if (res) {
      // Save recent beasts to Supabase (only for matchmaking)
      if (isFromMatchmaking) {
        const walletAddress = account?.address || "";
        if (walletAddress) {
          const beastsToSave = team.map((tokenId) => {
            const beast = catalog.find((b) => b.tokenId === tokenId);
            return { id: tokenId, name: beast?.name || `Beast #${tokenId}` };
          });
          updateRecentBeasts(walletAddress, beastsToSave).catch(console.error);
        }
      }
      setPhase("waiting");
      setStatusMsg("");
    } else {
      setPhase("error");
      setStatusMsg("Failed to set team");
    }
  }, [selectedBeasts, gameId, setTeam, setTeamDynamic, beatsPerPlayer, account, catalog]);

  // 30-second countdown timer during selection phase
  useEffect(() => {
    if (phase !== "select") {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }
    setTimer(30);
    timerRef.current = window.setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          if (timerRef.current) {
            window.clearInterval(timerRef.current);
            timerRef.current = null;
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [phase]);

  // Auto-confirm when timer expires
  useEffect(() => {
    if (timer !== 0 || phase !== "select") return;
    const team = getAutoFilledTeam(selectedBeasts);
    setSelectedBeasts(team);
    handleConfirmTeam(team);
  }, [timer, phase]);

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
          borderRadius="12px"
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

  // --- Coin toss intro ---
  if (phase === "coin") {
    return <CoinFlipIntro revealResult={coinResultVisible} iGoFirst={coinIGoFirst} myName={coinMyName} enemyName={coinEnemyName} />;
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
        <Heading size="md" fontFamily="heading" color="green.300" textTransform="uppercase">
          Select Your Team — Game #{gameId}
        </Heading>
        <Button size="sm" variant="ghost" onClick={leaveModal.onOpen}>Leave</Button>
      </Flex>


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
              placeholder="Token ID..."
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
              <option value="default">Default</option>
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
            ) : filteredDefaults.length === 0 && filteredOwned.length === 0 ? (
              <Flex direction="column" align="center" py={8} gap={2}>
                <Text color="text.secondary" fontSize="sm">No beasts match filters</Text>
                <Text color="text.muted" fontSize="xs">Try changing your filters or use Default beasts</Text>
              </Flex>
            ) : (
              <>
                {/* Default Beasts section */}
                {filteredDefaults.length > 0 && (
                  <Box mb={4}>
                    <Text fontSize="10px" color="text.muted" textTransform="uppercase" letterSpacing="0.1em" mb={2}>
                      Default Beasts
                    </Text>
                    <SimpleGrid columns={{ base: 2, md: 3, lg: 3 }} gap={3}>
                      {filteredDefaults.map((beast) => (
                        <BeastCard
                          key={beast.tokenId}
                          beast={beast}
                          isSelected={selectedBeasts.includes(beast.tokenId)}
                          onToggle={handleToggleBeast}
                          disabled={!selectedBeasts.includes(beast.tokenId) && (selectedBeasts.length >= beatsPerPlayer || isTierFull(beast.tier))}
                          isDefault={true}
                        />
                      ))}
                    </SimpleGrid>
                  </Box>
                )}

                {/* Owned Beasts section */}
                {filteredOwned.length > 0 && (
                  <Box>
                    <Text fontSize="10px" color="text.muted" textTransform="uppercase" letterSpacing="0.1em" mb={2}>
                      Your Beasts
                    </Text>
                    <SimpleGrid columns={{ base: 2, md: 3, lg: 3 }} gap={3}>
                      {filteredOwned.map((beast) => (
                        <BeastCard
                          key={beast.tokenId}
                          beast={beast}
                          isSelected={selectedBeasts.includes(beast.tokenId)}
                          onToggle={handleToggleBeast}
                          disabled={!selectedBeasts.includes(beast.tokenId) && (selectedBeasts.length >= beatsPerPlayer || isTierFull(beast.tier))}
                          isDefault={false}
                        />
                      ))}
                    </SimpleGrid>
                  </Box>
                )}
              </>
            )}
          </Box>
        </Box>

        {/* Right panel: Opponent profile + Map preview */}
        <Box flex={2} minH={0} overflow="hidden">
          {/* Opponent profile */}
          {opponentProfile && (
            <Box bg="surface.panel" border="1px solid" borderColor="danger.700" borderRadius="12px" p={3} mb={4}>
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
          <Box bg="surface.panel" border="1px solid" borderColor="surface.border" borderRadius="12px" p={2}>
            <Text fontSize="9px" color="text.secondary" textTransform="uppercase" letterSpacing="0.1em" mb={2}>
              Arena Map
            </Text>
            <Box pointerEvents="none">
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
          </Box>

          {/* Timer */}
          {phase === "select" && (
            <Box mt={4} mb={2}>
              <Flex justify="space-between" align="center" mb={1}>
                <Text fontSize="9px" color={timer <= 10 ? "danger.300" : "text.secondary"} textTransform="uppercase" letterSpacing="0.1em">
                  Time Remaining
                </Text>
                <Text fontSize="sm" fontFamily="mono" fontWeight="bold" color={timer <= 10 ? "danger.300" : "green.300"}>
                  {timer}s
                </Text>
              </Flex>
              <Box
                h="4px"
                bg="rgba(255,255,255,0.1)"
                borderRadius="6px"
                overflow="hidden"
              >
                <Box
                  h="100%"
                  w={`${(timer / 30) * 100}%`}
                  bg={timer <= 10 ? "danger.400" : "green.400"}
                  borderRadius="6px"
                  transition="width 1s linear"
                />
              </Box>
            </Box>
          )}

          {/* Selected beasts */}
          <Box mt={phase === "select" ? 0 : 4} bg="surface.panel" border="1px solid" borderColor="surface.border" borderRadius="12px" p={2}>
            <Flex align="center" justify="space-between" mb={2}>
              <Text fontSize="9px" color="text.secondary" textTransform="uppercase" letterSpacing="0.1em">
                Your Team
              </Text>
              <Badge
                bg="rgba(189,145,84,0.2)"
                border="1px solid"
                borderColor="rgba(189,145,84,0.55)"
                color="#DEC398"
                fontSize="10px"
                px={2}
                py={0.5}
                borderRadius="8px"
              >
                {selectedBeasts.length}/{beatsPerPlayer}
              </Badge>
            </Flex>
            <Flex direction="column" gap={1.5}>
              {Array.from({ length: beatsPerPlayer }, (_, i) => {
                const tokenId = selectedBeasts[i];
                const beast = tokenId ? catalog.find((b) => b.tokenId === tokenId) : null;
                if (!beast || !tokenId) {
                  return (
                    <Flex
                      key={`empty-slot-${i}`}
                      border="1px dashed"
                      borderColor="surface.border"
                      borderRadius="10px"
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
                    bg="rgba(135, 180, 155, 0.16)"
                    border="1px solid"
                    borderColor="green.600"
                    borderRadius="10px"
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
                      borderRadius="8px"
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
                      onClick={() => handleToggleBeast(tokenId)}
                      px={1}
                    >
                      ✕
                    </Button>
                  </Flex>
                );
              })}
            </Flex>
          </Box>

          {/* Confirm button */}
          <Flex gap={3} align="center" mt={4}>
            <Button
              variant="primary"
              size="lg"
              onClick={() => handleConfirmTeam()}
              isDisabled={selectedBeasts.length !== beatsPerPlayer}
              isLoading={phase === "confirming"}
              flex={1}
            >
              Confirm Team ({selectedBeasts.length}/{beatsPerPlayer})
            </Button>
            <Button variant="ghost" size="sm" onClick={clearSelectedBeasts}>Clear</Button>
          </Flex>

          {statusMsg && (
            <Text fontSize="xs" color="text.secondary" mt={2} textAlign="center">{statusMsg}</Text>
          )}
        </Box>
      </Flex>

      {/* Leave confirmation modal */}
      <Modal isOpen={leaveModal.isOpen} onClose={leaveModal.onClose} isCentered>
        <ModalOverlay />
        <ModalContent bg="surface.overlay" border="1px solid" borderColor="danger.500">
          <ModalHeader fontSize="md" color="danger.200">Leave Game</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <Text fontSize="sm" color="text.secondary" mb={4}>
              Are you sure you want to leave? This will count as a loss and your opponent wins.
            </Text>
            <HStack justify="flex-end" gap={3}>
              <Button size="sm" variant="ghost" color="text.secondary" onClick={leaveModal.onClose}>
                Cancel
              </Button>
              <Button
                size="sm"
                variant="danger"
                isLoading={isLoading}
                onClick={async () => {
                  if (gameId) await abandonGame(gameId);
                  leaveModal.onClose();
                  navigate("/");
                }}
              >
                Leave
              </Button>
            </HStack>
          </ModalBody>
        </ModalContent>
      </Modal>

    </Flex>
  );
}
