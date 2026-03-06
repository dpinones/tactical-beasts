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
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
} from "@chakra-ui/react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "../dojo/WalletContext";
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

  const { clearSelectedBeasts } = useGameStore();

  const [joinInput, setJoinInput] = useState("");
  const [statusMsg, setStatusMsg] = useState("");
  const [friendOpen, setFriendOpen] = useState(false);
  const configsModal = useDisclosure();

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
          <Box position="relative">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setFriendOpen(!friendOpen)}
            >
              Play with Friend
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
                w="280px"
                zIndex={10}
                boxShadow="panel"
              >
                <VStack align="stretch" gap={3}>
                  <Text fontSize="xs" color="text.secondary" textTransform="uppercase" letterSpacing="0.1em">
                    Play with Friend
                  </Text>
                  <Text fontSize="xs" color="text.muted">
                    Coming soon — invite friends by Controller name.
                  </Text>
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
            <Button
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
            </HStack>

            <Box h="1px" bg="surface.border" w="100%" my={2} />

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

        {/* Right half — placeholder for beast images */}
        <Flex
          direction="column"
          w="50%"
          justify="center"
          align="center"
          p={8}
          borderLeft="1px solid"
          borderColor="surface.border"
        >
          <VStack gap={4}>
            <Box
              w="280px"
              h="280px"
              border="1px solid"
              borderColor="surface.border"
              borderRadius="3px"
              bg="surface.panel"
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              <Text fontSize="xs" color="text.muted" textAlign="center" px={4}>
                Beast artwork coming soon
              </Text>
            </Box>
            <Text fontSize="xs" color="text.secondary" textAlign="center" maxW="300px">
              Defeated beasts will appear here
            </Text>
          </VStack>
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
