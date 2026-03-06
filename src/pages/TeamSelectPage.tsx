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

export function TeamSelectPage() {
  const { gameId: gameIdParam } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const isCreateMode = location.pathname === "/team-select/create";
  const joinGameId = gameIdParam ? parseInt(gameIdParam) : null;

  const { createGame, joinGame, isLoading } = useGameActions();
  const { selectedBeasts, toggleBeast, clearSelectedBeasts, setActiveGameId } = useGameStore();

  const [filter, setFilter] = useState<"all" | "Magical" | "Hunter" | "Brute">("all");
  const [tierFilter, setTierFilter] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [statusMsg, setStatusMsg] = useState("");
  const [teamConfirmed, setTeamConfirmed] = useState(false);

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
    return result.slice(0, 50); // limit display
  }, [catalog, filter, tierFilter, search]);

  const handleConfirmTeam = async () => {
    if (selectedBeasts.length !== 3) return;

    if (isCreateMode) {
      setStatusMsg("Creating game with your team...");
      const gameId = await createGame(selectedBeasts[0], selectedBeasts[1], selectedBeasts[2]);
      if (gameId) {
        setActiveGameId(gameId);
        setTeamConfirmed(true);
        setStatusMsg("Game created! Share the ID with your opponent.");
      } else {
        setStatusMsg("Failed to create game");
      }
    } else if (joinGameId) {
      setStatusMsg("Joining game with your team...");
      const res = await joinGame(joinGameId, selectedBeasts[0], selectedBeasts[1], selectedBeasts[2]);
      if (res) {
        setActiveGameId(joinGameId);
        navigate(`/battle/${joinGameId}`);
      } else {
        setStatusMsg("Failed to join game");
      }
    }
  };

  // For create mode: poll for opponent joining (game starts automatically on join)
  const createdGameId = useGameStore((s) => s.activeGameId);
  const { game: createdGame } = useGameQuery(teamConfirmed && isCreateMode ? createdGameId : null);

  useEffect(() => {
    if (createdGame && createdGame.status === GameStatus.PLAYING && createdGameId) {
      navigate(`/battle/${createdGameId}`);
    }
  }, [createdGame, createdGameId, navigate]);

  return (
    <Flex direction="column" minH="100vh" p={4} maxW="1100px" mx="auto">
      {/* Header */}
      <Flex justify="space-between" align="center" mb={4}>
        <Flex align="center" gap={3}>
          <Button size="sm" variant="ghost" onClick={() => navigate("/")}>
            Back
          </Button>
          <Heading
            size="md"
            fontFamily="heading"
            color="green.300"
            textTransform="uppercase"
          >
            {isCreateMode ? "New Game" : `Join Game #${joinGameId}`}
          </Heading>
        </Flex>

        {/* Game ID to share (after creation) */}
        {teamConfirmed && isCreateMode && createdGameId && (
          <HStack>
            <Text fontSize="xs" color="text.secondary">
              Share ID:
            </Text>
            <Badge
              variant="magical"
              fontSize="sm"
              px={3}
              py={1}
              cursor="pointer"
              onClick={() => {
                navigator.clipboard.writeText(String(createdGameId));
                setStatusMsg("Game ID copied!");
              }}
            >
              {createdGameId}
            </Badge>
          </HStack>
        )}
      </Flex>

      {/* Status bar */}
      <Box
        bg="surface.panel"
        border="1px solid"
        borderColor="surface.border"
        borderRadius="3px"
        p={3}
        mb={4}
      >
        <Flex justify="space-between" align="center">
          <Text fontSize="xs" color="text.secondary">
            {isCreateMode ? "Select 3 beasts for your team" : `Joining game #${joinGameId}`}
          </Text>
          <Text fontSize="xs" color="text.gold" fontFamily="mono">
            Team: {selectedBeasts.length}/3
          </Text>
        </Flex>
      </Box>

      {/* Team confirmed view */}
      {teamConfirmed ? (
        <Box
          bg="surface.panel"
          border="1px solid"
          borderColor="green.700"
          borderRadius="3px"
          p={6}
          textAlign="center"
        >
          <Text color="green.300" fontWeight="600" fontSize="lg" mb={2}>
            Game Created
          </Text>
          <Text fontSize="xs" color="text.secondary" mb={4}>
            Waiting for opponent to join...
          </Text>
          <Spinner color="green.400" size="lg" />
        </Box>
      ) : (
        <>
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
                  disabled={
                    selectedBeasts.length >= 3 &&
                    !selectedBeasts.includes(beast.tokenId)
                  }
                />
              ))}
            </SimpleGrid>
          </Box>

          {/* Confirm button */}
          <Box
            position="sticky"
            bottom={0}
            bg="surface.bg"
            pt={3}
            pb={2}
            borderTop="1px solid"
            borderColor="surface.border"
          >
            <Flex gap={3} align="center">
              <Button
                variant="primary"
                size="lg"
                onClick={handleConfirmTeam}
                isDisabled={selectedBeasts.length !== 3}
                isLoading={isLoading}
                flex={1}
              >
                Confirm Team ({selectedBeasts.length}/3)
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSelectedBeasts}
              >
                Clear
              </Button>
            </Flex>
          </Box>
        </>
      )}

      {/* Status */}
      {statusMsg && (
        <Text fontSize="xs" color="text.secondary" mt={2} textAlign="center">
          {statusMsg}
        </Text>
      )}
    </Flex>
  );
}
