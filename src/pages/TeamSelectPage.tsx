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
import { playClick } from "../stores/audioStore";
import { TutorialOverlay } from "../components/TutorialOverlay";
import { useTutorialStore } from "../stores/tutorialStore";

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
  const [activeSlot, setActiveSlot] = useState(0);

  // Tier restriction per slot: slot 1 → T2+, slot 2 → T3+, slot 3 → T4+
  const SLOT_MIN_TIER: Record<number, number> = { 0: 2, 1: 3, 2: 4 };
  const getSlotMinTier = (slotIndex: number) => SLOT_MIN_TIER[slotIndex] ?? 5;
  const [search, setSearch] = useState("");
  const [statusMsg, setStatusMsg] = useState("");
  const [coinResultVisible, setCoinResultVisible] = useState(false);
  const [coinIGoFirst, setCoinIGoFirst] = useState(false);
  const [coinMyName, setCoinMyName] = useState("You");
  const [coinEnemyName, setCoinEnemyName] = useState("Opponent");
  const [opponentName, setOpponentName] = useState<string | null>(null);
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

  // Tutorial integration
  const tutorialCompleteStep = useTutorialStore((s) => s.completeStep);
  const tutorialActive = useTutorialStore((s) => s.active);

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

  // Tier-limited toggle: respect slot tier restrictions
  const handleToggleBeast = useCallback((tokenId: number) => {
    playClick();
    // Always allow deselecting
    if (selectedBeasts.includes(tokenId)) {
      const removedIndex = selectedBeasts.indexOf(tokenId);
      toggleBeast(tokenId);
      // Set active slot to the removed slot
      setActiveSlot(removedIndex);
      return;
    }
    // Enforce team size limit
    if (selectedBeasts.length >= beatsPerPlayer) {
      toast.error(`Max ${beatsPerPlayer} beasts per team`);
      return;
    }
    const beast = catalog.find((b) => b.tokenId === tokenId);
    if (!beast) return;
    // Enforce slot tier restriction
    const slotMinTier = getSlotMinTier(activeSlot);
    if (beast.tier < slotMinTier) {
      toast.error(`Slot ${activeSlot + 1} only allows Tier ${slotMinTier} or worse`);
      return;
    }
    toggleBeast(tokenId);
    // Auto-advance to next empty slot
    const nextBeasts = [...selectedBeasts, tokenId];
    const nextEmpty = Array.from({ length: beatsPerPlayer }, (_, i) => i).find((i) => !nextBeasts[i]);
    if (nextEmpty !== undefined) {
      setActiveSlot(nextEmpty);
    }
    // Tutorial: track beast selection progress
    if (tutorialActive) {
      if (nextBeasts.length === 1) {
        tutorialCompleteStep("pick-first-beast");
      } else if (nextBeasts.length === 2) {
        tutorialCompleteStep("combat-triangle");
      } else if (nextBeasts.length >= beatsPerPlayer) {
        tutorialCompleteStep("fill-team");
      }
    }
  }, [selectedBeasts, catalog, toggleBeast, beatsPerPlayer, activeSlot, tutorialActive, tutorialCompleteStep]);

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

  // Apply filters to a beast list (includes slot tier restriction)
  const slotMinTier = getSlotMinTier(activeSlot);
  const applyFilters = useCallback((beasts: CatalogBeast[], skipTypeFilter = false): CatalogBeast[] => {
    let result = beasts;
    // Slot tier restriction: only show beasts eligible for active slot
    result = result.filter((b) => b.tier >= slotMinTier);
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
  }, [filter, tierFilter, subclassFilter, search, slotMinTier]);

  // Defaults always shown at top (unless filter hides them), respect slot tier
  const filteredDefaults = useMemo(() => {
    let defaults = DEFAULT_BEASTS.filter((b) => b.tier >= slotMinTier);
    if (filter === "default") return applyFilters(defaults, true);
    if (filter !== "all") {
      const typeMap: Record<string, BeastType> = {
        Magical: BeastType.Magical,
        Hunter: BeastType.Hunter,
        Brute: BeastType.Brute,
      };
      defaults = defaults.filter((b) => b.type === typeMap[filter]);
    }
    return defaults;
  }, [filter, applyFilters, slotMinTier]);

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

  // Resolve opponent display name from Supabase
  useEffect(() => {
    if (!opponentAddress) return;
    getProfile(opponentAddress).then((p) => {
      if (p?.display_name) setOpponentName(p.display_name);
    });
  }, [opponentAddress]);

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
  }, [timer, phase]); // eslint-disable-line react-hooks/exhaustive-deps


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

  // --- Team selection (2-panel layout with battle-panel styling) ---
  return (
    <Box className="team-select">
      {/* Header bar */}
      <Box className="team-select__header">
        <Flex align="center" gap={3}>
          <Text className="team-select__title">Select Your Team</Text>
          <Text className="team-select__game-id">Game #{gameId}</Text>
        </Flex>
        <Flex align="center" gap={3}>
          {/* Timer in header */}
          {phase === "select" && (
            <Flex align="center" gap={2}>
              <Box w="80px" h="3px" bg="rgba(255,255,255,0.1)" borderRadius="3px" overflow="hidden">
                <Box
                  h="100%"
                  w={`${(timer / 30) * 100}%`}
                  className="team-select__timer-bar"
                  bg={timer <= 10 ? "#B36E6E" : "#87B49B"}
                />
              </Box>
              <Text fontFamily="mono" fontSize="sm" fontWeight="700" color={timer <= 10 ? "#B36E6E" : "#87B49B"}>
                {timer}s
              </Text>
            </Flex>
          )}
          <Button
            variant="unstyled"
            className="battle-confirm-btn battle-leave-btn"
            onClick={leaveModal.onOpen}
            display="inline-flex"
          >
            Leave
          </Button>
        </Flex>
      </Box>

      {/* Main content */}
      <Flex flex={1} minH={0} overflow="hidden">
        {/* LEFT — Beast catalog panel */}
        <Box flex={3} minH={0} overflowY="auto" p={3} data-tutorial="beast-catalog">
          {/* Filters */}
          <Text fontSize="xs" color="#6F7F72" fontFamily="mono" mb={1}>
            T1 and T5 beasts are excluded for game balance.
          </Text>
          <Box className="team-select__filters">
            <Input
              placeholder="Token ID..."
              size="sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              maxW="140px"
              bg="rgba(0,0,0,0.25)"
              borderColor="rgba(93,129,110,0.3)"
              _focus={{ borderColor: "#87B49B" }}
              fontSize="xs"
            />
            <Select
              size="sm"
              maxW="120px"
              value={filter}
              onChange={(e) => { setFilter(e.target.value as any); setSubclassFilter(null); }}
              bg="rgba(0,0,0,0.25)"
              borderColor="rgba(93,129,110,0.3)"
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
              maxW="130px"
              value={subclassFilter === null ? "all" : String(subclassFilter)}
              onChange={(e) => setSubclassFilter(e.target.value === "all" ? null : Number(e.target.value) as Subclass)}
              bg="rgba(0,0,0,0.25)"
              borderColor="rgba(93,129,110,0.3)"
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
              maxW="110px"
              value={tierFilter === null ? "all" : String(tierFilter)}
              onChange={(e) => setTierFilter(e.target.value === "all" ? null : Number(e.target.value))}
              bg="rgba(0,0,0,0.25)"
              borderColor="rgba(93,129,110,0.3)"
              fontSize="xs"
            >
              <option value="all">{slotMinTier === 4 ? "T4" : `T${slotMinTier}–T4`}</option>
              {slotMinTier <= 2 && <option value="2">T2</option>}
              {slotMinTier <= 3 && <option value="3">T3</option>}
              {slotMinTier <= 4 && <option value="4">T4</option>}
            </Select>
          </Box>

          {/* Beast catalog */}
          {beastsLoading ? (
            <Flex justify="center" py={8}>
              <Spinner color="green.400" size="lg" />
            </Flex>
          ) : filteredDefaults.length === 0 && filteredOwned.length === 0 ? (
            <Flex direction="column" align="center" py={8} gap={2}>
              <Text color="#9AA99B" fontSize="sm">No beasts match filters</Text>
              <Text color="#6F7F72" fontSize="xs">Try changing your filters or use Default beasts</Text>
            </Flex>
          ) : (
            <>
              {filteredDefaults.length > 0 && (
                <Box mb={4}>
                  <Text fontFamily="heading" fontSize="xs" color="#9AA99B" textTransform="uppercase" letterSpacing="0.12em" mb={2}>
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
              {filteredOwned.length > 0 && (
                <Box>
                  <Text fontFamily="heading" fontSize="xs" color="#9AA99B" textTransform="uppercase" letterSpacing="0.12em" mb={2}>
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

        {/* RIGHT — Team + Map + Opponent (battle-panel style) */}
        <Box flex={2} minH={0} overflowY="auto" p={3} display="flex" flexDirection="column" gap={3} justifyContent="center">
          {/* Your Team panel */}
          <Box className="battle-panel" flexShrink={0} data-tutorial="team-slots">
            <Box className="battle-panel__header">
              <Flex justify="space-between" align="center">
                <Flex align="center" gap={2}>
                  <Text className="battle-panel__title">Your Team</Text>
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
                <Box
                  className="team-slot__remove"
                  fontSize="xs"
                  fontFamily="mono"
                  letterSpacing="0.06em"
                  onClick={() => { clearSelectedBeasts(); setActiveSlot(0); }}
                >
                  Clear
                </Box>
              </Flex>
            </Box>
            <Box className="battle-panel__body">
              <Flex direction="column" gap={2}>
                {Array.from({ length: beatsPerPlayer }, (_, i) => {
                  const tokenId = selectedBeasts[i];
                  const beast = tokenId ? catalog.find((b) => b.tokenId === tokenId) : null;
                  const isActive = activeSlot === i;
                  const minTier = getSlotMinTier(i);
                  if (!beast || !tokenId) {
                    return (
                      <Box
                        key={`empty-slot-${i}`}
                        className={`team-slot ${isActive ? "team-slot--active" : ""}`}
                        onClick={() => setActiveSlot(i)}
                      >
                        <span className="team-slot__number">{i + 1}</span>
                        <span className="team-slot__tier">{minTier === 4 ? "T4" : `T${minTier} – T4`}</span>
                        {isActive && <span className="team-slot__selecting">selecting</span>}
                      </Box>
                    );
                  }
                  const subclass = getSubclass(beast.beastId);
                  return (
                    <Flex
                      key={tokenId}
                      className={`team-slot team-slot--filled ${isActive ? "team-slot--active" : ""}`}
                    >
                      <Text className="team-slot__number">{i + 1}</Text>
                      <Image
                        src={`/beasts/${beast.beast.toLowerCase()}.png`}
                        alt={beast.beast}
                        w="36px"
                        h="36px"
                        objectFit="contain"
                        borderRadius="8px"
                        border="1px solid rgba(93,129,110,0.3)"
                        bg="rgba(0,0,0,0.3)"
                      />
                      <Text fontSize="sm" fontWeight="700" color="#E5DED0" noOfLines={1} fontFamily="heading" textTransform="uppercase" letterSpacing="0.04em" flex={1} minW={0}>
                        {beast.beast}
                      </Text>
                      <HStack gap={2} flexShrink={0} fontSize="xs" fontFamily="mono" color="#9AA99B">
                        <Badge variant={beast.type === BeastType.Magical ? "magical" : beast.type === BeastType.Hunter ? "hunter" : "brute"} fontSize="9px">
                          {beast.typeName}
                        </Badge>
                        <Text>{getSubclassName(subclass)}</Text>
                        <Text>T{beast.tier}</Text>
                        <Text color="#CDAE79" fontWeight="600">Lv{beast.level}</Text>
                        <Text color="#CDAE79" fontWeight="600">HP {beast.health}</Text>
                        <Text color="#6F7F72">#{beast.tokenId}</Text>
                      </HStack>
                      <Box className="team-slot__remove" onClick={() => handleToggleBeast(tokenId)}>✕</Box>
                    </Flex>
                  );
                })}
              </Flex>

              {statusMsg && (
                <Text fontSize="xs" color="#9AA99B" mt={2} textAlign="center">{statusMsg}</Text>
              )}
            </Box>
          </Box>

          {/* Opponent panel */}
          {opponentProfile && (
            <Box className="battle-panel battle-panel--enemy" flexShrink={0}>
              <Box className="battle-panel__header">
                <Text className="battle-panel__title">Opponent: {opponentName || "..."}</Text>
              </Box>
              <Box className="battle-panel__body">
                <HStack gap={5} fontSize="sm" fontFamily="mono" color="#9AA99B" flexWrap="wrap" justify="center">
                  <Text>Games: <Text as="span" color="#CDAE79" fontWeight="700">{opponentProfile.games_played}</Text></Text>
                  <Text>W: <Text as="span" color="#A7D5BF" fontWeight="700">{opponentProfile.wins}</Text></Text>
                  <Text>L: <Text as="span" color="#B36E6E" fontWeight="700">{opponentProfile.losses}</Text></Text>
                  <Text>Abandons: <Text as="span" color="#6F7F72" fontWeight="700">{opponentProfile.abandons}</Text></Text>
                  <Text>K/D: <Text as="span" color="#E5DED0" fontWeight="700">
                    {opponentProfile.total_deaths === 0
                      ? opponentProfile.total_kills > 0 ? `${opponentProfile.total_kills}/0` : "--"
                      : `${opponentProfile.total_kills}/${opponentProfile.total_deaths}`}
                  </Text></Text>
                </HStack>
              </Box>
            </Box>
          )}

          {/* Map preview panel */}
          <Box className="battle-panel" flexShrink={0}>
            <Box className="battle-panel__header">
              <Text className="battle-panel__title">Arena Map</Text>
            </Box>
            <Box className="battle-panel__body" pointerEvents="none">
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
        </Box>
      </Flex>

      {/* Leave confirmation modal */}
      <Modal isOpen={leaveModal.isOpen} onClose={leaveModal.onClose} isCentered>
        <ModalOverlay bg="rgba(0,0,0,0.7)" />
        <ModalContent
          bg="linear-gradient(180deg, #3b2222 0%, #2d1919 60%, #1f1212 100%)"
          border="2px solid #8f6262"
          borderRadius="var(--radius-lg)"
          boxShadow="0 8px 24px rgba(0, 0, 0, 0.42)"
        >
          <ModalHeader fontFamily="heading" fontSize="md" color="#d7b3b3" textTransform="uppercase" letterSpacing="0.1em">
            Leave Game
          </ModalHeader>
          <ModalCloseButton color="#8f6262" />
          <ModalBody pb={6}>
            <Text fontSize="sm" color="#9AA99B" mb={4}>
              Are you sure you want to leave? This will count as a loss and your opponent wins.
            </Text>
            <HStack justify="flex-end" gap={3}>
              <Button size="sm" variant="ghost" color="#9AA99B" onClick={leaveModal.onClose}>
                Cancel
              </Button>
              <Button
                size="sm"
                variant="unstyled"
                className="battle-confirm-btn battle-leave-btn"
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

      {/* Tutorial overlay */}
      <TutorialOverlay page="team-select" />
    </Box>
  );
}
