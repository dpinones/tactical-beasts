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
  Image,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
} from "@chakra-ui/react";
import { keyframes } from "@emotion/react";
import { useState, useEffect, useCallback, useRef, useMemo, type MouseEvent as ReactMouseEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "../dojo/WalletContext";
import { useGameStore } from "../stores/gameStore";
import {
  getOrCreateProfile,
  searchPlayers,
  sendFriendRequest,
  respondFriendRequest,
  getFriends,
  getPendingRequests,
  getSentRequests,
  sendGameInvite,
  respondGameInvite,
  getGameInvites,
  subscribeFriendRequests,
  subscribeGameInvites,
  Friendship,
  GameInvite,
  PlayerConfig,
} from "../services/supabase";
import { getUniqueBeastSpecies } from "../data/beasts";
import { usePlayerProfile, useGameSettings } from "../hooks/useGameQuery";
import { Select } from "@chakra-ui/react";

const CHAIN = import.meta.env.VITE_CHAIN;

function truncateAddr(addr: string): string {
  if (!addr) return "---";
  return addr.slice(0, 6) + "..." + addr.slice(-4);
}

interface HomeHowToTopic {
  title: string;
  description: string;
  items: Array<{
    label: string;
    text: string;
  }>;
}

const HOW_TO_LEADERBOARD: HomeHowToTopic = {
  title: "Leaderboard",
  description: "Como se calcula la posicion de cada jugador en el ranking.",
  items: [
    { label: "Formula de score", text: "Score = (wins x 500) + (total_kills x 50)." },
    { label: "Filtro de jugadores", text: "Solo aparecen perfiles con al menos 1 partida jugada." },
    { label: "Empates", text: "Si hay score igual, el orden final depende del orden recibido del backend." },
  ],
};

const HOW_TO_SETTINGS: HomeHowToTopic = {
  title: "Settings",
  description: "Que configura cada parametro y como impacta en el gameplay.",
  items: [
    { label: "Min Tier / Max Tier", text: "Define el rango de tier permitido para elegir bestias en la partida." },
    { label: "Max T2 per team", text: "Limita cuantas bestias tier 2 puede llevar cada equipo." },
    { label: "Max T3 per team", text: "Limita cuantas bestias tier 3 puede llevar cada equipo." },
    { label: "Beasts/Player", text: "Define la cantidad total de bestias por lado en el combate." },
    { label: "Settings ID", text: "Cada preset se guarda con un ID y ese ID se usa al crear/invitar partidas." },
  ],
};

const HOW_TO_TOKENS: HomeHowToTopic = {
  title: "My Tokens",
  description: "Como leer los tokens de partida y sus estados.",
  items: [
    { label: "Que representa un token", text: "Cada token representa una sesion/partida registrada." },
    { label: "ACTIVE vs COMPLETED", text: "ACTIVE: la partida sigue en curso. COMPLETED: la partida termino." },
    { label: "Settings", text: "Muestra el ID de settings usado para esa partida." },
  ],
};

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

  const { clearSelectedBeasts } = useGameStore();

  const [joinInput, setJoinInput] = useState("");
  const [statusMsg, setStatusMsg] = useState("");
  const [friendOpen, setFriendOpen] = useState(false);
  const [activeHowTo, setActiveHowTo] = useState<HomeHowToTopic | null>(null);
  const configsModal = useDisclosure();
  const profileModal = useDisclosure();
  const howToModal = useDisclosure();

  // Supabase state
  const [profile, setProfile] = useState<PlayerConfig | null>(null);
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Friendship[]>([]);
  const [sentRequests, setSentRequests] = useState<Friendship[]>([]);
  const [gameInvites, setGameInvites] = useState<GameInvite[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PlayerConfig[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [friendProfiles, setFriendProfiles] = useState<Record<string, PlayerConfig>>({});
  const [inviteSettingsId, setInviteSettingsId] = useState<number>(0);
  const { settings: gameSettingsList } = useGameSettings();

  const friendPanelRef = useRef<HTMLDivElement>(null);
  const walletAddress = finalAccount?.address || "";
  const { profile: playerStats, loading: profileLoading } = usePlayerProfile(walletAddress || null);

  // Close dropdown on click outside
  useEffect(() => {
    if (!friendOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (friendPanelRef.current && !friendPanelRef.current.contains(e.target as Node)) {
        setFriendOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [friendOpen]);

  // Init profile on login
  useEffect(() => {
    if (!walletAddress) return;
    (async () => {
      const p = await getOrCreateProfile(walletAddress);
      if (p) setProfile(p);
    })();
  }, [walletAddress]);

  // Load friends data
  const refreshFriendsData = useCallback(async () => {
    if (!walletAddress) return;
    const [f, p, sr, gi] = await Promise.all([
      getFriends(walletAddress),
      getPendingRequests(walletAddress),
      getSentRequests(walletAddress),
      getGameInvites(walletAddress),
    ]);
    setFriends(f);
    setPendingRequests(p);
    setSentRequests(sr);
    setGameInvites(gi);

    // Load profiles for friends
    const allWallets = new Set<string>();
    f.forEach((fr) => {
      allWallets.add(fr.sender === walletAddress ? fr.receiver : fr.sender);
    });
    p.forEach((fr) => allWallets.add(fr.sender));
    sr.forEach((fr) => allWallets.add(fr.receiver));
    gi.forEach((inv) => allWallets.add(inv.host));

    const profiles: Record<string, PlayerConfig> = {};
    for (const w of allWallets) {
      if (!friendProfiles[w]) {
        const prof = await getOrCreateProfile(w);
        if (prof) profiles[w] = prof;
      } else {
        profiles[w] = friendProfiles[w];
      }
    }
    setFriendProfiles((prev) => ({ ...prev, ...profiles }));
  }, [walletAddress]);

  useEffect(() => {
    if (walletAddress) refreshFriendsData();
  }, [walletAddress, refreshFriendsData]);

  // Realtime subscriptions
  useEffect(() => {
    if (!walletAddress) return;

    const friendSub = subscribeFriendRequests(walletAddress, () => {
      refreshFriendsData();
    });

    const inviteSub = subscribeGameInvites(
      walletAddress,
      () => refreshFriendsData(),
      (invite) => {
        if (invite.status === "accepted" && invite.game_id) {
          // Friend accepted — navigate to team select
          navigate(`/team-select/match/${invite.game_id}`);
        }
      }
    );

    return () => {
      friendSub.unsubscribe();
      inviteSub.unsubscribe();
    };
  }, [walletAddress, refreshFriendsData, navigate]);

  // Search players
  const handleSearch = async () => {
    if (!searchQuery.trim() || !walletAddress) return;
    setIsSearching(true);
    const results = await searchPlayers(searchQuery.trim(), walletAddress);
    setSearchResults(results);
    setIsSearching(false);
  };

  // Send friend request
  const handleSendFriendRequest = async (receiverWallet: string) => {
    await sendFriendRequest(walletAddress, receiverWallet);
    setSearchResults([]);
    setSearchQuery("");
    refreshFriendsData();
  };

  // Respond to friend request
  const handleRespondFriend = async (id: string, accept: boolean) => {
    await respondFriendRequest(id, accept);
    refreshFriendsData();
  };

  // Invite friend to game
  const handleInviteFriend = async (friendWallet: string) => {
    const invite = await sendGameInvite(walletAddress, friendWallet);
    if (invite) {
      navigate("/matchmaking", {
        state: {
          waitingForFriend: true,
          inviteId: invite.id,
          friendName: friendProfiles[friendWallet]?.display_name || "friend",
          settingsId: inviteSettingsId || undefined,
        },
      });
    }
  };

  // Respond to game invite
  const handleRespondInvite = async (invite: GameInvite, accept: boolean) => {
    await respondGameInvite(invite.id, accept);
    if (accept && invite.game_id) {
      clearSelectedBeasts();
      // Guest joins via the join route so joinGame is called onchain
      navigate(`/team-select/join/${invite.game_id}`);
    } else {
      refreshFriendsData();
    }
  };

  // Notification count
  const notifCount = pendingRequests.length + gameInvites.length;

  // Refresh when opening dropdown
  const handleToggleFriendPanel = () => {
    const opening = !friendOpen;
    setFriendOpen(opening);
    if (opening) refreshFriendsData();
  };

  const getFriendWallet = (f: Friendship) =>
    f.sender === walletAddress ? f.receiver : f.sender;

  const getFriendName = (f: Friendship) => {
    const w = getFriendWallet(f);
    return friendProfiles[w]?.display_name || truncateAddr(w);
  };

  const handleCreate = () => {
    clearSelectedBeasts();
    navigate("/team-select/create");
  };

  const handleJoin = () => {
    const id = parseInt(joinInput);
    if (!id || isNaN(id)) {
      setStatusMsg("Enter a valid game ID");
      return;
    }
    clearSelectedBeasts();
    navigate(`/team-select/join/${id}`);
  };

  const openHowTo = (topic: HomeHowToTopic) => {
    setActiveHowTo(topic);
    howToModal.onOpen();
  };

  // Hero beasts for background (must be before any early returns)
  const heroBeasts = useMemo(() => {
    const all = getUniqueBeastSpecies();
    const shuffled = [...all].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 5);
  }, []);

  const [heroIndex, setHeroIndex] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setHeroIndex((i) => (i + 1) % heroBeasts.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [heroBeasts.length]);

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
        <VStack gap={2}>
          <Heading
            size="2xl"
            fontFamily="heading"
            textTransform="uppercase"
            letterSpacing="0.12em"
            color="green.300"
            textShadow="0 0 30px rgba(135,180,155,0.3)"
          >
            Tactical Beasts
          </Heading>
          <Text fontSize="sm" color="text.secondary" textAlign="center" maxW="400px">
            Tactical turn-based PvP combat with Loot Survivor beasts on Starknet.
          </Text>
        </VStack>

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
                <Button variant="secondary" size="lg" onClick={connectAsGuest}>
                  Guest
                </Button>
              )}
            </>
          )}
        </Flex>

        <Text fontSize="xs" color="text.muted" position="absolute" bottom={4}>
          v0.1.0 MVP
        </Text>
      </Flex>
    );
  }

  // --- Logged in ---
  return (
    <Flex
      direction="column"
      minH="100vh"
      position="relative"
      overflow="hidden"
      bgImage="url('/bg_home.png')"
      bgSize="cover"
      bgPosition="center"
      bgRepeat="no-repeat"
    >
      {/* ===== TOP BAR ===== */}
      <Flex
        align="center"
        px={5}
        py={3}
        zIndex={2}
        bg="linear-gradient(180deg, rgba(0,0,0,0.6) 0%, transparent 100%)"
      >
        <Box flex={1} />

        {/* Friend/Social button */}
        <Box position="relative" ref={friendPanelRef}>
          <Box
            as="button"
            onClick={handleToggleFriendPanel}
            position="relative"
            w="40px"
            h="40px"
            display="flex"
            alignItems="center"
            justifyContent="center"
            bg="rgba(18,30,18,0.85)"
            border="1px solid"
            borderColor="surface.border"
            borderRadius="10px"
            color="text.secondary"
            fontSize="18px"
            cursor="pointer"
            _hover={{ borderColor: "green.400", color: "green.300" }}
            transition="all 0.2s"
            mr={2}
          >
            <span role="img" aria-label="friends">&#128101;</span>
            {notifCount > 0 && (
              <Box
                position="absolute"
                top="-4px"
                right="-4px"
                w="18px"
                h="18px"
                bg="danger.300"
                borderRadius="full"
                display="flex"
                alignItems="center"
                justifyContent="center"
                fontSize="9px"
                fontWeight="bold"
                color="white"
                border="2px solid"
                borderColor="surface.bg"
              >
                {notifCount}
              </Box>
            )}
          </Box>
          {friendOpen && (
            <Box
              position="absolute"
              right={0}
              top="100%"
              mt={2}
              bg="surface.panel"
              border="1px solid"
              borderColor="surface.border"
              borderRadius="10px"
              p={4}
              w="320px"
              zIndex={10}
              boxShadow="panel"
              maxH="80vh"
              overflowY="auto"
            >
              <VStack align="stretch" gap={3}>
                <Text fontSize="9px" color="text.secondary" textTransform="uppercase" letterSpacing="0.1em">
                  Search Player
                </Text>
                <HStack gap={2}>
                  <Input
                    placeholder="Name or wallet..."
                    size="sm"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  />
                  <Button size="sm" variant="primary" onClick={handleSearch} isLoading={isSearching}>
                    Search
                  </Button>
                </HStack>
                {searchResults.length > 0 && (
                  <VStack align="stretch" gap={1}>
                    {searchResults.map((p) => (
                      <Flex key={p.wallet_address} justify="space-between" align="center" p={2} bg="surface.card" borderRadius="10px">
                        <VStack align="start" gap={0}>
                          <Text fontSize="xs" color="text.primary">{p.display_name}</Text>
                          <Text fontSize="9px" color="text.muted">{truncateAddr(p.wallet_address)}</Text>
                        </VStack>
                        <Button size="xs" variant="secondary" onClick={() => handleSendFriendRequest(p.wallet_address)}>
                          Add
                        </Button>
                      </Flex>
                    ))}
                  </VStack>
                )}
                {gameInvites.length > 0 && (
                  <>
                    <Text fontSize="9px" color="text.gold" textTransform="uppercase" letterSpacing="0.1em">
                      Invites ({gameInvites.length})
                    </Text>
                    {gameInvites.map((inv) => (
                      <Flex key={inv.id} justify="space-between" align="center" p={2} bg="surface.card" borderRadius="10px" border="1px solid" borderColor="danger.600">
                        <Text fontSize="xs" color="text.primary">
                          {friendProfiles[inv.host]?.display_name || truncateAddr(inv.host)} wants to play
                        </Text>
                        <HStack gap={1}>
                          <Button size="xs" variant="primary" onClick={() => handleRespondInvite(inv, true)}>Accept</Button>
                          <Button size="xs" variant="ghost" onClick={() => handleRespondInvite(inv, false)}>Decline</Button>
                        </HStack>
                      </Flex>
                    ))}
                  </>
                )}
                {pendingRequests.length > 0 && (
                  <>
                    <Text fontSize="9px" color="text.secondary" textTransform="uppercase" letterSpacing="0.1em">
                      Pending Requests ({pendingRequests.length})
                    </Text>
                    {pendingRequests.map((req) => (
                      <Flex key={req.id} justify="space-between" align="center" p={2} bg="surface.card" borderRadius="10px">
                        <Text fontSize="xs" color="text.primary">{friendProfiles[req.sender]?.display_name || truncateAddr(req.sender)}</Text>
                        <HStack gap={1}>
                          <Button size="xs" variant="primary" onClick={() => handleRespondFriend(req.id, true)}>Accept</Button>
                          <Button size="xs" variant="ghost" onClick={() => handleRespondFriend(req.id, false)}>Reject</Button>
                        </HStack>
                      </Flex>
                    ))}
                  </>
                )}
                {sentRequests.length > 0 && (
                  <>
                    <Text fontSize="9px" color="text.muted" textTransform="uppercase" letterSpacing="0.1em">
                      Sent ({sentRequests.length})
                    </Text>
                    {sentRequests.map((req) => (
                      <Flex key={req.id} justify="space-between" align="center" p={2} bg="surface.card" borderRadius="10px">
                        <Text fontSize="xs" color="text.muted">{friendProfiles[req.receiver]?.display_name || truncateAddr(req.receiver)}</Text>
                        <Text fontSize="9px" color="text.muted">Pending...</Text>
                      </Flex>
                    ))}
                  </>
                )}
                <Text fontSize="9px" color="text.secondary" textTransform="uppercase" letterSpacing="0.1em">
                  Friends ({friends.length})
                </Text>
                {friends.length > 0 && gameSettingsList.length > 0 && (
                  <Box>
                    <Text fontSize="9px" color="text.secondary" textTransform="uppercase" letterSpacing="0.1em" mb={1}>
                      Game Settings
                    </Text>
                    <Select
                      size="xs"
                      value={inviteSettingsId}
                      onChange={(e) => setInviteSettingsId(Number(e.target.value))}
                      bg="surface.card"
                      borderColor="surface.border"
                    >
                      {gameSettingsList.map((s) => (
                        <option key={s.settings_id} value={s.settings_id}>
                          #{s.settings_id}{s.settings_id === 1 ? " (Default)" : ""} — T{s.min_tier}-T{s.max_tier}, {s.beasts_per_player}v{s.beasts_per_player}
                        </option>
                      ))}
                    </Select>
                  </Box>
                )}
                {friends.length === 0 ? (
                  <Text fontSize="xs" color="text.muted">No friends yet. Search to add one.</Text>
                ) : (
                  friends.map((f) => (
                    <Flex key={f.id} justify="space-between" align="center" p={2} bg="surface.card" borderRadius="10px">
                      <Text fontSize="xs" color="text.primary">{getFriendName(f)}</Text>
                      <Button size="xs" variant="secondary" onClick={() => handleInviteFriend(getFriendWallet(f))}>Invite</Button>
                    </Flex>
                  ))
                )}
                <Button variant="ghost" size="sm" onClick={() => setFriendOpen(false)}>Close</Button>
              </VStack>
            </Box>
          )}
        </Box>

        {/* Settings */}
        <Box
          as="button"
          onClick={configsModal.onOpen}
          w="40px"
          h="40px"
          display="flex"
          alignItems="center"
          justifyContent="center"
          bg="rgba(18,30,18,0.85)"
          border="1px solid"
          borderColor="surface.border"
          borderRadius="10px"
          color="text.secondary"
          fontSize="18px"
          cursor="pointer"
          _hover={{ borderColor: "green.400", color: "green.300" }}
          transition="all 0.2s"
          mr={2}
        >
          <span role="img" aria-label="settings">&#9881;</span>
        </Box>

        {/* Player name + Profile modal */}
        <Flex
          align="center"
          gap={2}
          bg="rgba(18,30,18,0.85)"
          border="1px solid"
          borderColor="surface.border"
          borderRadius="10px"
          px={3}
          py={2}
          mr={2}
          cursor="pointer"
          onClick={profileModal.onOpen}
          _hover={{ borderColor: "green.400", color: "green.300" }}
          transition="all 0.2s"
        >
          <Text fontSize="xs" fontWeight="700" color="text.primary">
            {profile?.display_name || truncateAddr(finalAccount?.address || "")}
          </Text>
        </Flex>

        {/* Logout */}
        <Box
          as="button"
          onClick={logout}
          w="40px"
          h="40px"
          display="flex"
          alignItems="center"
          justifyContent="center"
          bg="rgba(18,30,18,0.85)"
          border="1px solid"
          borderColor="surface.border"
          borderRadius="10px"
          color="text.secondary"
          fontSize="16px"
          cursor="pointer"
          _hover={{ borderColor: "danger.300", color: "danger.300" }}
          transition="all 0.2s"
        >
          <span role="img" aria-label="logout">&#10151;</span>
        </Box>
      </Flex>

      {/* ===== MAIN CONTENT — two columns ===== */}
      <Flex flex={1} zIndex={1}>
        {/* LEFT: Title + Cards (40%) */}
        <Flex
          direction="column"
          w="40%"
          justify="center"
          px={8}
          pb={8}
          gap={6}
        >
          <VStack gap={1} align="flex-start">
            <Heading
              size="2xl"
              fontFamily="heading"
              color="green.300"
              textTransform="uppercase"
              letterSpacing="0.12em"
              textShadow="0 0 40px rgba(135,180,155,0.36), 0 2px 8px rgba(0,0,0,0.8)"
            >
              Tactical Beasts
            </Heading>
            <Text fontSize="xs" color="text.muted" letterSpacing="0.15em" textTransform="uppercase">
              Onchain PvP Combat
            </Text>
          </VStack>

          <Flex
            gap={4}
            flexWrap="wrap"
          >
          {/* BATTLE card — full width */}
          <MenuCard
            title="Battle"
            subtitle="Find an opponent"
            beastName={heroBeasts[0]}
            accentColor="#A7D5BF"
            gradientFrom="#1A2D24"
            gradientTo="#2B4538"
            borderColor="green.400"
            onClick={() => navigate("/matchmaking")}
            isFullWidth
          />

          {/* LEADERBOARD card */}
          <MenuCard
            title="Leaderboard"
            subtitle="Top scores & rankings"
            beastName={heroBeasts[1]}
            accentColor="#CDAE79"
            gradientFrom="#2E271A"
            gradientTo="#4A3A25"
            borderColor="gold.400"
            onClick={() => navigate("/leaderboard")}
            howTo={HOW_TO_LEADERBOARD}
            onHowTo={openHowTo}
          />

          {/* MY BEASTS card */}
          <MenuCard
            title="My Beasts"
            subtitle="View your collection"
            beastName={heroBeasts[2]}
            accentColor="#9FC6B2"
            gradientFrom="#172822"
            gradientTo="#284238"
            borderColor="green.500"
            onClick={() => navigate("/my-beasts")}
          />

          {/* MY TOKENS card */}
          <MenuCard
            title="My Tokens"
            subtitle="Game session tokens"
            beastName={heroBeasts[3]}
            accentColor="#B5C8D8"
            gradientFrom="#1A2230"
            gradientTo="#2B3A4D"
            borderColor="blue.400"
            onClick={() => navigate("/my-tokens")}
            howTo={HOW_TO_TOKENS}
            onHowTo={openHowTo}
          />

          {/* SETTINGS card */}
          <MenuCard
            title="Settings"
            subtitle="Game rules & presets"
            beastName={heroBeasts[4]}
            accentColor="#C8B5D8"
            gradientFrom="#251A30"
            gradientTo="#3D2B4D"
            borderColor="purple.400"
            onClick={() => navigate("/settings")}
            howTo={HOW_TO_SETTINGS}
            onHowTo={openHowTo}
          />
        </Flex>

        {statusMsg && (
          <Code
            p={3}
            borderRadius="10px"
            fontSize="xs"
            bg="surface.card"
            color="text.secondary"
            border="1px solid"
            borderColor="surface.border"
            textAlign="center"
          >
            {statusMsg}
          </Code>
        )}
        </Flex>

        {/* RIGHT: Hero beast showcase (60%) */}
        <Flex
          w="60%"
          align="center"
          justify="center"
          position="relative"
          overflow="hidden"
        >
          {heroBeasts.map((name, i) => (
            <Image
              key={name}
              src={`/beasts/${name.toLowerCase()}.png`}
              alt={name}
              position="absolute"
              maxH="85%"
              maxW="80%"
              objectFit="contain"
              opacity={i === heroIndex ? 1 : 0}
              transition="opacity 1s ease, transform 1s ease"
              transform={i === heroIndex ? "scale(1)" : "scale(0.9)"}
              filter="drop-shadow(0 0 40px rgba(0,0,0,0.5))"
            />
          ))}
        </Flex>
      </Flex>

      {/* HOW TO modal (per-card) */}
      <Modal isOpen={howToModal.isOpen} onClose={howToModal.onClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{activeHowTo?.title || "How To"}</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <VStack align="stretch" gap={3}>
              {activeHowTo?.description && (
                <Text fontSize="sm" color="text.secondary">
                  {activeHowTo.description}
                </Text>
              )}
              {activeHowTo?.items.map((item) => (
                <Box key={item.label} bg="surface.card" borderRadius="10px" p={3} border="1px solid" borderColor="surface.border">
                  <Text fontSize="xs" color="text.primary" fontWeight="700" mb={1}>
                    {item.label}
                  </Text>
                  <Text fontSize="xs" color="text.secondary">
                    {item.text}
                  </Text>
                </Box>
              ))}
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Configs Modal */}
      <Modal isOpen={configsModal.isOpen} onClose={configsModal.onClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Settings</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <VStack align="stretch" gap={4}>
              <Box>
                <Text fontSize="xs" color="text.secondary" textTransform="uppercase" letterSpacing="0.1em" mb={1}>Account</Text>
                <Text fontSize="sm">{accountType === "controller" ? "Controller" : "Guest"} | {truncateAddr(finalAccount?.address || "")}</Text>
              </Box>
              <Box>
                <Text fontSize="xs" color="text.secondary" textTransform="uppercase" letterSpacing="0.1em" mb={1}>Chain</Text>
                <Text fontSize="sm">{CHAIN || "Slot (local)"}</Text>
              </Box>
              <Box>
                <Text fontSize="xs" color="text.secondary" textTransform="uppercase" letterSpacing="0.1em" mb={1}>Sound</Text>
                <Text fontSize="sm" color="text.muted">Coming soon</Text>
              </Box>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Profile Modal */}
      <Modal isOpen={profileModal.isOpen} onClose={profileModal.onClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Profile</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            {profileLoading ? (
              <Flex justify="center" py={6}>
                <Spinner color="green.400" size="lg" />
              </Flex>
            ) : (
              <VStack align="stretch" gap={3}>
                <Box>
                  <Text fontSize="xs" color="text.secondary" textTransform="uppercase" letterSpacing="0.1em">Address</Text>
                  <Text fontSize="sm" fontFamily="mono">{truncateAddr(finalAccount?.address || "")}</Text>
                </Box>
                <HStack gap={6}>
                  <Box>
                    <Text fontSize="xs" color="text.secondary" textTransform="uppercase" letterSpacing="0.1em">Games</Text>
                    <Text fontSize="lg" color="text.gold" fontFamily="mono" fontWeight="700">{playerStats?.games_played ?? 0}</Text>
                  </Box>
                  <Box>
                    <Text fontSize="xs" color="text.secondary" textTransform="uppercase" letterSpacing="0.1em">Wins</Text>
                    <Text fontSize="lg" color="green.300" fontFamily="mono" fontWeight="700">{playerStats?.wins ?? 0}</Text>
                  </Box>
                  <Box>
                    <Text fontSize="xs" color="text.secondary" textTransform="uppercase" letterSpacing="0.1em">Losses</Text>
                    <Text fontSize="lg" color="danger.300" fontFamily="mono" fontWeight="700">{playerStats?.losses ?? 0}</Text>
                  </Box>
                </HStack>
                <HStack gap={6}>
                  <Box>
                    <Text fontSize="xs" color="text.secondary" textTransform="uppercase" letterSpacing="0.1em">Abandons</Text>
                    <Text fontSize="lg" color="text.muted" fontFamily="mono" fontWeight="700">{playerStats?.abandons ?? 0}</Text>
                  </Box>
                  <Box>
                    <Text fontSize="xs" color="text.secondary" textTransform="uppercase" letterSpacing="0.1em">K/D</Text>
                    <Text fontSize="lg" fontFamily="mono" fontWeight="700">
                      {playerStats && playerStats.total_deaths > 0
                        ? `${playerStats.total_kills}/${playerStats.total_deaths}`
                        : playerStats && playerStats.total_kills > 0
                          ? `${playerStats.total_kills}/0`
                          : "--"}
                    </Text>
                  </Box>
                </HStack>
              </VStack>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </Flex>
  );
}

// =============================================================================
// Menu Card — game-style navigation tile
// =============================================================================
const cardHover = keyframes`
  0% { transform: translateY(0); }
  100% { transform: translateY(-4px); }
`;

function MenuCard({
  title,
  subtitle,
  beastName,
  accentColor,
  gradientFrom,
  gradientTo,
  borderColor,
  onClick,
  isFullWidth,
  badge,
  howTo,
  onHowTo,
}: {
  title: string;
  subtitle: string;
  beastName: string;
  accentColor: string;
  gradientFrom: string;
  gradientTo: string;
  borderColor: string;
  onClick: () => void;
  isFullWidth?: boolean;
  badge?: string;
  howTo?: HomeHowToTopic;
  onHowTo?: (topic: HomeHowToTopic) => void;
}) {
  return (
    <Box
      as="button"
      onClick={onClick}
      position="relative"
      w={isFullWidth ? "100%" : "calc(50% - 8px)"}
      minW="150px"
      h={isFullWidth ? "180px" : "160px"}
      bg={`linear-gradient(160deg, ${gradientFrom} 0%, ${gradientTo} 100%)`}
      border="2px solid"
      borderColor={borderColor}
      borderRadius="12px"
      overflow="hidden"
      cursor="pointer"
      transition="all 0.25s ease"
      _hover={{
        transform: "translateY(-6px)",
        boxShadow: `0 8px 30px ${accentColor}33, 0 0 15px ${accentColor}22`,
        borderColor: accentColor,
      }}
      _active={{
        transform: "translateY(-2px)",
      }}
      textAlign="left"
    >
      {/* Beast image */}
      <Box
        position="absolute"
        right="-10%"
        bottom="-5%"
        w="75%"
        h="80%"
        opacity={0.35}
        pointerEvents="none"
      >
        <Image
          src={`/beasts/${beastName?.toLowerCase()}.png`}
          alt=""
          w="100%"
          h="100%"
          objectFit="contain"
        />
      </Box>

      {/* Gradient overlay at bottom */}
      <Box
        position="absolute"
        bottom={0}
        left={0}
        right={0}
        h="60%"
        bg={`linear-gradient(0deg, ${gradientFrom} 0%, transparent 100%)`}
        pointerEvents="none"
      />

      {/* Content */}
      <Flex
        direction="column"
        justify="flex-end"
        h="100%"
        p={4}
        position="relative"
        zIndex={1}
      >
        <Text
          fontSize={isFullWidth ? "xl" : "md"}
          fontWeight="800"
          fontFamily="heading"
          color={accentColor}
          textTransform="uppercase"
          letterSpacing="0.08em"
          textShadow={`0 0 20px ${accentColor}66`}
          lineHeight="1.2"
        >
          {title}
        </Text>
        <Text
          fontSize="10px"
          color="text.secondary"
          mt={1}
          letterSpacing="0.05em"
        >
          {subtitle}
        </Text>
      </Flex>

      {/* HOW TO trigger for specific cards */}
      {howTo && onHowTo && (
        <Box
          as="button"
          aria-label={`How to ${title}`}
          title={`How to ${title}`}
          position="absolute"
          top={3}
          right={3}
          w="24px"
          h="24px"
          borderRadius="full"
          bg="rgba(8,12,10,0.88)"
          border="1px solid"
          borderColor={`${accentColor}88`}
          color={accentColor}
          fontFamily="heading"
          fontSize="13px"
          fontWeight="700"
          display="flex"
          alignItems="center"
          justifyContent="center"
          zIndex={3}
          onClick={(e: ReactMouseEvent<HTMLButtonElement>) => {
            e.stopPropagation();
            onHowTo(howTo);
          }}
          _hover={{
            transform: "scale(1.06)",
            borderColor: accentColor,
            boxShadow: `0 0 10px ${accentColor}66`,
          }}
        >
          ?
        </Box>
      )}

      {/* Badge */}
      {badge && (
        <Box
          position="absolute"
          top={3}
          right={3}
          w="22px"
          h="22px"
          bg="danger.300"
          borderRadius="full"
          display="flex"
          alignItems="center"
          justifyContent="center"
          fontSize="10px"
          fontWeight="bold"
          color="white"
          boxShadow="0 0 8px rgba(179,110,110,0.5)"
        >
          {badge}
        </Box>
      )}

      {/* Top shine effect */}
      <Box
        position="absolute"
        top={0}
        left={0}
        right={0}
        h="1px"
        bg={`linear-gradient(90deg, transparent 0%, ${accentColor}44 50%, transparent 100%)`}
      />
    </Box>
  );
}
