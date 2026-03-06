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
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
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

  const { clearSelectedBeasts } = useGameStore();

  const [joinInput, setJoinInput] = useState("");
  const [statusMsg, setStatusMsg] = useState("");
  const [friendOpen, setFriendOpen] = useState(false);
  const configsModal = useDisclosure();

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

  const friendPanelRef = useRef<HTMLDivElement>(null);
  const walletAddress = finalAccount?.address || "";

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
      navigate("/matchmaking", { state: { waitingForFriend: true, inviteId: invite.id, friendName: friendProfiles[friendWallet]?.display_name || "friend" } });
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
            textShadow="0 0 30px rgba(0,255,68,0.3)"
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
    <Flex direction="column" minH="100vh">
      {/* Top bar */}
      <Flex
        justify="space-between"
        align="center"
        px={6}
        py={4}
        borderBottom="1px solid"
        borderColor="surface.border"
      >
        <Heading
          size="lg"
          fontFamily="heading"
          color="green.300"
          textTransform="uppercase"
          letterSpacing="0.08em"
        >
          Tactical Beasts
        </Heading>

        <HStack gap={3}>
          {/* Play with Friend dropdown */}
          <Box position="relative" ref={friendPanelRef}>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleToggleFriendPanel}
            >
              Play with Friend
              {notifCount > 0 && (
                <Box
                  as="span"
                  ml={2}
                  px={1.5}
                  py={0.5}
                  fontSize="9px"
                  fontWeight="bold"
                  bg="green.400"
                  color="black"
                  borderRadius="full"
                  lineHeight="1"
                >
                  {notifCount}
                </Box>
              )}
            </Button>
            {friendOpen && (
              <Box
                position="absolute"
                right={0}
                top="100%"
                mt={2}
                bg="surface.panel"
                border="1px solid"
                borderColor="surface.border"
                borderRadius="3px"
                p={4}
                w="320px"
                zIndex={10}
                boxShadow="panel"
                maxH="80vh"
                overflowY="auto"
              >
                <VStack align="stretch" gap={3}>
                  {/* Search players */}
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
                        <Flex key={p.wallet_address} justify="space-between" align="center" p={2} bg="surface.card" borderRadius="3px">
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

                  {/* Game invites */}
                  {gameInvites.length > 0 && (
                    <>
                      <Text fontSize="9px" color="text.gold" textTransform="uppercase" letterSpacing="0.1em">
                        Invites ({gameInvites.length})
                      </Text>
                      {gameInvites.map((inv) => (
                        <Flex key={inv.id} justify="space-between" align="center" p={2} bg="surface.card" borderRadius="3px" border="1px solid" borderColor="green.800">
                          <Text fontSize="xs" color="text.primary">
                            {friendProfiles[inv.host]?.display_name || truncateAddr(inv.host)} wants to play
                          </Text>
                          <HStack gap={1}>
                            <Button size="xs" variant="primary" onClick={() => handleRespondInvite(inv, true)}>
                              Accept
                            </Button>
                            <Button size="xs" variant="ghost" onClick={() => handleRespondInvite(inv, false)}>
                              Decline
                            </Button>
                          </HStack>
                        </Flex>
                      ))}
                    </>
                  )}

                  {/* Pending requests */}
                  {pendingRequests.length > 0 && (
                    <>
                      <Text fontSize="9px" color="text.secondary" textTransform="uppercase" letterSpacing="0.1em">
                        Pending Requests ({pendingRequests.length})
                      </Text>
                      {pendingRequests.map((req) => (
                        <Flex key={req.id} justify="space-between" align="center" p={2} bg="surface.card" borderRadius="3px">
                          <Text fontSize="xs" color="text.primary">
                            {friendProfiles[req.sender]?.display_name || truncateAddr(req.sender)}
                          </Text>
                          <HStack gap={1}>
                            <Button size="xs" variant="primary" onClick={() => handleRespondFriend(req.id, true)}>
                              Accept
                            </Button>
                            <Button size="xs" variant="ghost" onClick={() => handleRespondFriend(req.id, false)}>
                              Reject
                            </Button>
                          </HStack>
                        </Flex>
                      ))}
                    </>
                  )}

                  {/* Sent requests */}
                  {sentRequests.length > 0 && (
                    <>
                      <Text fontSize="9px" color="text.muted" textTransform="uppercase" letterSpacing="0.1em">
                        Sent ({sentRequests.length})
                      </Text>
                      {sentRequests.map((req) => (
                        <Flex key={req.id} justify="space-between" align="center" p={2} bg="surface.card" borderRadius="3px">
                          <Text fontSize="xs" color="text.muted">
                            {friendProfiles[req.receiver]?.display_name || truncateAddr(req.receiver)}
                          </Text>
                          <Text fontSize="9px" color="text.muted">Pending...</Text>
                        </Flex>
                      ))}
                    </>
                  )}

                  {/* Friends list */}
                  <Text fontSize="9px" color="text.secondary" textTransform="uppercase" letterSpacing="0.1em">
                    Friends ({friends.length})
                  </Text>
                  {friends.length === 0 ? (
                    <Text fontSize="xs" color="text.muted">No friends yet. Search to add one.</Text>
                  ) : (
                    friends.map((f) => (
                      <Flex key={f.id} justify="space-between" align="center" p={2} bg="surface.card" borderRadius="3px">
                        <Text fontSize="xs" color="text.primary">{getFriendName(f)}</Text>
                        <Button size="xs" variant="secondary" onClick={() => handleInviteFriend(getFriendWallet(f))}>
                          Invite
                        </Button>
                      </Flex>
                    ))
                  )}

                  <Button variant="ghost" size="sm" onClick={() => setFriendOpen(false)}>
                    Close
                  </Button>
                </VStack>
              </Box>
            )}
          </Box>

          <Text fontSize="xs" color="text.muted">
            {truncateAddr(finalAccount?.address || "")}
          </Text>
          <Button size="sm" variant="ghost" onClick={logout}>
            Logout
          </Button>
        </HStack>
      </Flex>

      {/* Main content: two halves */}
      <Flex flex={1}>
        {/* Left half — buttons */}
        <Flex
          direction="column"
          w="50%"
          justify="center"
          align="center"
          p={8}
        >
          <VStack gap={4} w="100%" maxW="360px">
            {/* TODO: Re-enable Create Game and Join Game when private matches are supported */}
            {/* <Button
              variant="primary"
              size="lg"
              w="100%"
              h="60px"
              fontSize="md"
              onClick={handleCreate}
            >
              Create Game
            </Button>

            <HStack w="100%" gap={2}>
              <Input
                placeholder="Game ID"
                value={joinInput}
                onChange={(e) => setJoinInput(e.target.value)}
                type="number"
                size="lg"
                flex={1}
              />
              <Button
                variant="primary"
                size="lg"
                onClick={handleJoin}
                minW="100px"
                h="48px"
              >
                Join
              </Button>
            </HStack> */}

            <Button
              variant="secondary"
              size="lg"
              w="100%"
              h="60px"
              fontSize="md"
              onClick={() => navigate("/matchmaking")}
            >
              Matchmaking
            </Button>

            <Button
              variant="secondary"
              size="lg"
              w="100%"
              h="60px"
              fontSize="md"
              onClick={() => navigate("/my-beasts")}
            >
              My Beasts
            </Button>

            <HStack w="100%" gap={4}>
              <Button
                variant="ghost"
                size="lg"
                flex={1}
                h="50px"
                onClick={() => navigate("/profile")}
              >
                Profile
              </Button>
              <Button
                variant="ghost"
                size="lg"
                flex={1}
                h="50px"
                onClick={configsModal.onOpen}
              >
                Configs
              </Button>
            </HStack>

            {statusMsg && (
              <Code
                p={3}
                borderRadius="3px"
                fontSize="xs"
                bg="surface.card"
                color="text.secondary"
                border="1px solid"
                borderColor="surface.border"
                w="100%"
                textAlign="center"
              >
                {statusMsg}
              </Code>
            )}
          </VStack>
        </Flex>

        {/* Right half — beast showcase */}
        <Flex
          direction="column"
          w="50%"
          justify="center"
          align="center"
          p={8}
          borderLeft="1px solid"
          borderColor="surface.border"
        >
          <BeastShowcase />
        </Flex>
      </Flex>

      {/* Configs Modal */}
      <Modal isOpen={configsModal.isOpen} onClose={configsModal.onClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Settings</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <VStack align="stretch" gap={4}>
              <Box>
                <Text fontSize="xs" color="text.secondary" textTransform="uppercase" letterSpacing="0.1em" mb={1}>
                  Account
                </Text>
                <Text fontSize="sm">
                  {accountType === "controller" ? "Controller" : "Guest"} | {truncateAddr(finalAccount?.address || "")}
                </Text>
              </Box>
              <Box>
                <Text fontSize="xs" color="text.secondary" textTransform="uppercase" letterSpacing="0.1em" mb={1}>
                  Chain
                </Text>
                <Text fontSize="sm">{CHAIN || "Slot (local)"}</Text>
              </Box>
              <Box>
                <Text fontSize="xs" color="text.secondary" textTransform="uppercase" letterSpacing="0.1em" mb={1}>
                  Sound
                </Text>
                <Text fontSize="sm" color="text.muted">Coming soon</Text>
              </Box>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Flex>
  );
}

function BeastShowcase() {
  const species = useMemo(() => {
    const all = getUniqueBeastSpecies();
    // Pick 3 random beasts
    const shuffled = [...all].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 3);
  }, []);

  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((i) => (i + 1) % species.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [species.length]);

  return (
    <VStack gap={4}>
      <Box
        w="280px"
        h="280px"
        border="1px solid"
        borderColor="surface.border"
        borderRadius="5px"
        bg="surface.panel"
        overflow="hidden"
        position="relative"
      >
        {species.map((name, i) => (
          <Image
            key={name}
            src={`/beasts/${name.toLowerCase()}.png`}
            alt={name}
            position="absolute"
            top={0}
            left={0}
            w="100%"
            h="100%"
            objectFit="contain"
            p={4}
            opacity={i === currentIndex ? 1 : 0}
            transition="opacity 0.6s ease"
          />
        ))}
      </Box>
      <Text
        fontSize="sm"
        color="green.300"
        fontFamily="heading"
        textTransform="uppercase"
        letterSpacing="0.1em"
        transition="opacity 0.3s"
      >
        {species[currentIndex]}
      </Text>
      <HStack gap={2}>
        {species.map((_, i) => (
          <Box
            key={i}
            w="8px"
            h="8px"
            borderRadius="full"
            bg={i === currentIndex ? "green.400" : "surface.border"}
            cursor="pointer"
            onClick={() => setCurrentIndex(i)}
            transition="background 0.2s"
          />
        ))}
      </HStack>
    </VStack>
  );
}
