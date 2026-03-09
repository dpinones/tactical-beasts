import {
  Box,
  Button,
  Flex,
  Text,
  Badge,
  VStack,
  HStack,
  SimpleGrid,
  Image,
} from "@chakra-ui/react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTutorialGame } from "../hooks/useTutorialGame";
import { useTutorialStore } from "../stores/tutorialStore";
import { HexGrid } from "../components/HexGrid";
import { BeastCard } from "../components/BeastCard";
import { BeastHUD } from "../components/BeastHUD";
import { PlannedActions } from "../components/PlannedActions";
import { TutorialOverlay } from "../components/TutorialOverlay";
import { getSubclass, getSubclassName } from "../data/beasts";
import { BeastType } from "../domain/types";
import { playClick } from "../stores/audioStore";

export function TutorialPage() {
  const navigate = useNavigate();
  const tut = useTutorialGame();
  const tutorialCompleteStep = useTutorialStore((s) => s.completeStep);
  const tutorialActive = useTutorialStore((s) => s.active);

  // Auto-start tutorial on mount
  useEffect(() => {
    const store = useTutorialStore.getState();
    if (!store.active) {
      store.reset();
      // Small delay so reset persists before start
      setTimeout(() => useTutorialStore.getState().start(), 50);
    }
  }, []);

  // Dynamic page for TutorialOverlay
  const overlayPage = tut.phase === "team-select" ? "team-select" : "battle";

  if (tut.phase === "complete") {
    return (
      <Flex
        direction="column"
        align="center"
        justify="center"
        minH="100vh"
        gap={6}
        className="arena-background"
      >
        <Text
          fontFamily="heading"
          fontSize="3xl"
          color="green.300"
          textTransform="uppercase"
          letterSpacing="0.1em"
        >
          Tutorial Complete
        </Text>
        <Text fontSize="sm" color="text.secondary" maxW="400px" textAlign="center">
          You've learned the basics of tactical combat. Ready for a real match?
        </Text>
        <HStack gap={4}>
          <Button
            variant="unstyled"
            className="battle-confirm-btn"
            onClick={() => navigate("/matchmaking")}
          >
            Play a Real Game
          </Button>
          <Button
            variant="ghost"
            color="text.secondary"
            onClick={() => navigate("/")}
          >
            Back to Home
          </Button>
        </HStack>
      </Flex>
    );
  }

  if (tut.phase === "team-select") {
    return (
      <Box className="team-select">
        {/* Header bar */}
        <Box className="team-select__header">
          <Flex align="center" gap={3}>
            <Text className="team-select__title">Tutorial — Select Your Team</Text>
          </Flex>
          <Button
            variant="ghost"
            size="sm"
            color="text.secondary"
            onClick={() => navigate("/")}
          >
            Exit
          </Button>
        </Box>

        {/* Main content */}
        <Flex flex={1} minH={0} overflow="hidden">
          {/* LEFT — Beast catalog */}
          <Box flex={3} minH={0} overflowY="auto" p={3} data-tutorial="beast-catalog">
            <Text fontFamily="heading" fontSize="xs" color="#9AA99B" textTransform="uppercase" letterSpacing="0.12em" mb={2}>
              Choose 3 Beasts
            </Text>
            <SimpleGrid columns={{ base: 1, md: 3 }} gap={3}>
              {tut.catalog.map((beast) => (
                <BeastCard
                  key={beast.tokenId}
                  beast={beast}
                  isSelected={tut.selectedBeasts.includes(beast.tokenId)}
                  onToggle={(id) => {
                    playClick();
                    const wasSelected = tut.selectedBeasts.includes(id);
                    tut.toggleBeast(id);

                    // Tutorial step tracking
                    if (tutorialActive && !wasSelected) {
                      const count = tut.selectedBeasts.length + 1;
                      if (count === 1) tutorialCompleteStep("pick-first-beast");
                      else if (count === 2) tutorialCompleteStep("combat-triangle");
                      else if (count >= 3) tutorialCompleteStep("fill-team");
                    }
                  }}
                  disabled={!tut.selectedBeasts.includes(beast.tokenId) && tut.selectedBeasts.length >= 3}
                  isDefault={true}
                />
              ))}
            </SimpleGrid>
          </Box>

          {/* RIGHT — Team slots */}
          <Box flex={2} minH={0} overflowY="auto" p={3} display="flex" flexDirection="column" gap={3} justifyContent="center">
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
                      {tut.selectedBeasts.length}/3
                    </Badge>
                  </Flex>
                </Flex>
              </Box>
              <Box className="battle-panel__body">
                <Flex direction="column" gap={2}>
                  {Array.from({ length: 3 }, (_, i) => {
                    const tokenId = tut.selectedBeasts[i];
                    const beast = tokenId ? tut.catalog.find((b) => b.tokenId === tokenId) : null;
                    if (!beast) {
                      return (
                        <Box key={`empty-${i}`} className="team-slot">
                          <span className="team-slot__number">{i + 1}</span>
                          <span className="team-slot__tier">T4</span>
                        </Box>
                      );
                    }
                    const subclass = getSubclass(beast.beastId);
                    return (
                      <Flex key={tokenId} className="team-slot team-slot--filled">
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
                        </HStack>
                        <Box className="team-slot__remove" onClick={() => tut.toggleBeast(tokenId)}>✕</Box>
                      </Flex>
                    );
                  })}
                </Flex>

                {/* Confirm button */}
                {tut.selectedBeasts.length === 3 && (
                  <Flex justify="center" mt={4} data-tutorial="confirm-team-btn">
                    <Button
                      variant="unstyled"
                      className="battle-confirm-btn"
                      onClick={tut.confirmTeam}
                    >
                      Confirm Team
                    </Button>
                  </Flex>
                )}
              </Box>
            </Box>
          </Box>
        </Flex>

        <TutorialOverlay page="team-select" />
      </Box>
    );
  }

  // Battle phase
  const aliveCount = tut.myBeasts.filter((b) => b.alive).length;
  const enemyAliveCount = tut.enemyBeasts.filter((b) => b.alive).length;

  return (
    <Box
      position="relative"
      h="100vh"
      w="100vw"
      overflow="hidden"
      className="arena-background"
    >
      {/* TOP HUD */}
      <Box className="battle-hud-top" px={4} pt={0}>
        <Flex w="100%" maxW="700px" align="flex-start" justify="center" gap={5}>
          <Box className="round-badge">
            <Text className="round-badge__label">TUTORIAL — Round {tut.round}</Text>
            <Text className="round-badge__timer">YOUR TURN</Text>
          </Box>
        </Flex>
      </Box>

      {/* MAIN GRID */}
      <Box
        position="absolute"
        top="96px"
        left={0}
        right={0}
        bottom={0}
        zIndex={3}
        transform={{ base: "none", lg: "translateX(60px)" }}
        data-tutorial="hex-grid"
      >
        <HexGrid
          hexSize={50}
          myBeasts={tut.myBeasts}
          enemyBeasts={tut.enemyBeasts}
          selectedBeastIndex={tut.selectedBeastIndex}
          onCellClick={tut.handleCellClick}
          onBeastClick={tut.handleBeastClick}
          moveCells={tut.moveCells}
          attackCells={tut.attackCells}
          myPlayerIndex={1}
          actions={tut.actions}
          obstacles={tut.obstacles}
        />
      </Box>

      {/* Confirm dock */}
      <Box className="battle-confirm-dock" data-tutorial="confirm-button">
        <Button
          variant="unstyled"
          className="battle-confirm-btn"
          onClick={tut.confirmActions}
          isDisabled={aliveCount === 0 || enemyAliveCount === 0}
        >
          Confirm Actions
        </Button>
      </Box>

      {/* Exit button */}
      <Button
        position="absolute"
        top="8px"
        right="8px"
        zIndex={12}
        variant="unstyled"
        className="battle-confirm-btn battle-leave-btn"
        onClick={() => navigate("/")}
        display="inline-flex"
      >
        Exit
      </Button>

      {/* LEFT PANEL — My beasts + Actions */}
      <VStack
        position="absolute"
        top="80px"
        left="12px"
        zIndex={10}
        w="260px"
        maxW="260px"
        gap={3}
        align="stretch"
        display={{ base: "none", lg: "flex" }}
        data-tutorial="my-beasts-panel"
      >
        <Box className="battle-panel" flexShrink={0}>
          <Box className="battle-panel__header">
            <Text className="battle-panel__title">You</Text>
          </Box>
          <Box className="battle-panel__body">
            <VStack gap={2} align="stretch">
              {tut.myBeasts.map((beast) => (
                <BeastHUD
                  key={beast.beast_index}
                  beast={beast}
                  isMine={true}
                  isSelected={tut.selectedBeastIndex === beast.beast_index}
                  plannedAction={tut.actions.get(beast.beast_index)}
                  onClick={() => {
                    tut.setSelectedBeastIndex(beast.beast_index);
                    if (tutorialActive) tutorialCompleteStep("select-beast");
                  }}
                />
              ))}
            </VStack>
          </Box>
        </Box>

        {/* Planned Actions */}
        <Box
          className={`battle-panel ${tut.actions.size > 0 ? "battle-panel--ready" : ""}`}
          mt={3}
          h="160px"
        >
          <Box className="battle-panel__header">
            <Text className="battle-panel__title">Your Actions</Text>
          </Box>
          <Box className="battle-panel__body" h="calc(100% - 36px)" overflowY="auto">
            <PlannedActions
              myBeasts={tut.myBeasts}
              enemyBeasts={tut.enemyBeasts}
              actions={tut.actions}
              actionHistory={tut.actionHistory}
              onUndoLast={tut.handleUndoLast}
              onClearAll={tut.handleClearAll}
            />
          </Box>
        </Box>
      </VStack>

      {/* RIGHT PANEL — Enemy beasts */}
      <VStack
        position="absolute"
        top="80px"
        right="12px"
        zIndex={10}
        w="260px"
        maxW="260px"
        gap={3}
        align="stretch"
        display={{ base: "none", lg: "flex" }}
      >
        <Box className="battle-panel battle-panel--enemy">
          <Box className="battle-panel__header">
            <HStack gap={2}>
              <Text className="battle-panel__title">Tutorial Bot</Text>
              <Badge colorScheme="red" fontSize="8px" variant="subtle">BOT</Badge>
            </HStack>
          </Box>
          <Box className="battle-panel__body">
            <VStack gap={2} align="stretch">
              {tut.enemyBeasts.map((beast) => (
                <BeastHUD
                  key={beast.beast_index}
                  beast={beast}
                  isMine={false}
                />
              ))}
            </VStack>
          </Box>
        </Box>
      </VStack>

      <TutorialOverlay page="battle" />
    </Box>
  );
}
