import {
  Box,
  Button,
  Flex,
  Heading,
  Text,
  HStack,
  VStack,
  Spinner,
  Badge,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
} from "@chakra-ui/react";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDojo } from "../dojo/DojoContext";
import { useGameActions } from "../hooks/useGameActions";
import { useGameQuery, useBeastStates, useMapState, mapStateToObstacles } from "../hooks/useGameQuery";
import { useGameStore } from "../stores/gameStore";
import { HexGrid } from "../components/HexGrid";
import { BeastHUD } from "../components/BeastHUD";
import { BattleLog } from "../components/BattleLog";
import { ActionPanel } from "../components/ActionPanel";
import {
  GameStatus,
  BeastStateModel,
  ActionType,
  GameAction,
  HexCoord,
  BattleEvent,
  ZERO_ADDR,
} from "../domain/types";
import {
  OBSTACLES,
  getValidMoveTargets,
  getCellsInRange,
  hexDistance,
} from "../domain/hexGrid";
import { getMoveRange, getAttackRange } from "../domain/combat";

function normalizeAddr(addr: string): string {
  if (!addr) return ZERO_ADDR;
  const hex = addr.replace("0x", "").toLowerCase();
  return "0x" + hex.padStart(64, "0");
}

function isSameAddress(a: string, b: string): boolean {
  return normalizeAddr(a) === normalizeAddr(b);
}

export function BattlePage() {
  const { gameId: gameIdParam } = useParams<{ gameId: string }>();
  const gameId = gameIdParam ? parseInt(gameIdParam) : null;
  const navigate = useNavigate();

  const {
    account: { account },
  } = useDojo();
  const { executeTurn, abandonGame, isLoading } = useGameActions();
  const { game, refetch: refetchGame } = useGameQuery(gameId);
  const { beasts, refetch: refetchBeasts } = useBeastStates(gameId);
  const { mapState } = useMapState(gameId);
  const obstacles = useMemo(() => {
    if (!mapState) return OBSTACLES;
    return mapStateToObstacles(mapState);
  }, [mapState]);
  const { battleLog, addBattleEvent, clearBattleLog } = useGameStore();
  const abandonModal = useDisclosure();

  const myAddress = account?.address || "";

  // Determine player index
  const myPlayerIndex = useMemo(() => {
    if (!game) return 0;
    if (isSameAddress(game.player1, myAddress)) return 1;
    if (isSameAddress(game.player2, myAddress)) return 2;
    return 0;
  }, [game, myAddress]);

  const isMyTurn = game ? game.current_attacker === myPlayerIndex : false;

  // Split beasts by player
  const myBeasts = useMemo(
    () => beasts.filter((b) => Number(b.player_index) === myPlayerIndex),
    [beasts, myPlayerIndex]
  );
  const enemyBeasts = useMemo(
    () => beasts.filter((b) => Number(b.player_index) !== myPlayerIndex),
    [beasts, myPlayerIndex]
  );

  // Action planning state
  const [actions, setActions] = useState<Map<number, GameAction>>(new Map());
  const [selectedBeastIndex, setSelectedBeastIndex] = useState<number | null>(
    null
  );
  const [waitingForMove, setWaitingForMove] = useState(false);
  const [waitingForAttack, setWaitingForAttack] = useState(false);
  const [isPotionAttack, setIsPotionAttack] = useState(false);

  // Highlighted cells for move/attack range
  const [highlightedCells, setHighlightedCells] = useState<HexCoord[]>([]);
  const [highlightType, setHighlightType] = useState<"move" | "attack">("move");

  // Navigate to result on game finish
  useEffect(() => {
    if (game && game.status === GameStatus.FINISHED) {
      navigate(`/result/${gameId}`);
    }
  }, [game, gameId, navigate]);

  // Clear actions when turn changes
  useEffect(() => {
    setActions(new Map());
    setSelectedBeastIndex(null);
    setWaitingForMove(false);
    setWaitingForAttack(false);
    setHighlightedCells([]);
  }, [game?.current_attacker, game?.round]);

  // Get selected beast model
  const selectedBeast = useMemo(() => {
    if (selectedBeastIndex === null) return null;
    return myBeasts.find((b) => Number(b.beast_index) === selectedBeastIndex);
  }, [selectedBeastIndex, myBeasts]);

  // Get occupied cells for move validation
  const occupiedCells = useMemo((): HexCoord[] => {
    return beasts
      .filter((b) => b.alive)
      .map((b) => ({
        row: Number(b.position_row),
        col: Number(b.position_col),
      }));
  }, [beasts]);

  // --- Action handlers ---

  const handleChooseMove = useCallback(() => {
    if (!selectedBeast) return;
    setWaitingForMove(true);
    setWaitingForAttack(false);
    setIsPotionAttack(false);
    setHighlightType("move");

    const dummyBeast = {
      beastIndex: 0,
      beastId: 0,
      name: "",
      type: 0,
      typeName: "",
      tier: Number(selectedBeast.tier),
      level: Number(selectedBeast.level),
      hp: 0,
      hpMax: 0,
      extraLives: 0,
      position: {
        row: Number(selectedBeast.position_row),
        col: Number(selectedBeast.position_col),
      },
      alive: true,
      powerBase: 0,
    };
    const moveRange = getMoveRange(dummyBeast);
    const validMoves = getValidMoveTargets(
      {
        row: Number(selectedBeast.position_row),
        col: Number(selectedBeast.position_col),
      },
      moveRange,
      occupiedCells,
      obstacles
    );
    setHighlightedCells(validMoves);
  }, [selectedBeast, occupiedCells, obstacles]);

  const handleChooseAttack = useCallback(() => {
    if (!selectedBeast) return;
    setWaitingForAttack(true);
    setWaitingForMove(false);
    setIsPotionAttack(false);
    setHighlightType("attack");

    // Highlight cells with enemy beasts in range
    const pos = {
      row: Number(selectedBeast.position_row),
      col: Number(selectedBeast.position_col),
    };
    const dummyBeast = {
      beastIndex: 0,
      beastId: 0,
      name: "",
      type: 0,
      typeName: "",
      tier: Number(selectedBeast.tier),
      level: Number(selectedBeast.level),
      hp: 0,
      hpMax: 0,
      extraLives: 0,
      position: pos,
      alive: true,
      powerBase: 0,
    };
    const atkRange = getAttackRange(dummyBeast);
    const enemyPositions = enemyBeasts
      .filter((b) => b.alive)
      .map((b) => ({
        row: Number(b.position_row),
        col: Number(b.position_col),
      }))
      .filter((ep) => hexDistance(pos, ep) <= atkRange);
    setHighlightedCells(enemyPositions);
  }, [selectedBeast, enemyBeasts]);

  const handleChoosePotion = useCallback(() => {
    if (!selectedBeast) return;
    setIsPotionAttack(true);
    handleChooseAttack();
  }, [selectedBeast, handleChooseAttack]);

  const handleChooseWait = useCallback(() => {
    if (selectedBeastIndex === null) return;
    const action: GameAction = {
      beastIndex: selectedBeastIndex,
      actionType: ActionType.WAIT,
      targetIndex: 0,
      targetRow: 0,
      targetCol: 0,
    };
    setActions((prev) => new Map(prev).set(selectedBeastIndex, action));
    setWaitingForMove(false);
    setWaitingForAttack(false);
    setHighlightedCells([]);
  }, [selectedBeastIndex]);

  const handleCellClick = useCallback(
    (row: number, col: number) => {
      if (!waitingForMove || selectedBeastIndex === null) return;

      // Check if this cell is in highlighted (valid) moves
      const isValid = highlightedCells.some(
        (c) => c.row === row && c.col === col
      );
      if (!isValid) return;

      const action: GameAction = {
        beastIndex: selectedBeastIndex,
        actionType: ActionType.MOVE,
        targetIndex: 0,
        targetRow: row,
        targetCol: col,
      };
      setActions((prev) => new Map(prev).set(selectedBeastIndex, action));
      setWaitingForMove(false);
      setHighlightedCells([]);
    },
    [waitingForMove, selectedBeastIndex, highlightedCells]
  );

  const handleBeastClick = useCallback(
    (playerIndex: number, beastIndex: number) => {
      // If waiting for attack target and clicked enemy
      if (waitingForAttack && playerIndex !== myPlayerIndex) {
        if (selectedBeastIndex === null) return;

        // Check range
        const enemyBeast = enemyBeasts.find(
          (b) => Number(b.beast_index) === beastIndex
        );
        if (!enemyBeast) return;

        const isInRange = highlightedCells.some(
          (c) =>
            c.row === Number(enemyBeast.position_row) &&
            c.col === Number(enemyBeast.position_col)
        );
        if (!isInRange) return;

        const action: GameAction = {
          beastIndex: selectedBeastIndex,
          actionType: isPotionAttack
            ? ActionType.CONSUMABLE_ATTACK_POTION
            : ActionType.ATTACK,
          targetIndex: beastIndex,
          targetRow: 0,
          targetCol: 0,
        };
        setActions((prev) => new Map(prev).set(selectedBeastIndex, action));
        setWaitingForAttack(false);
        setIsPotionAttack(false);
        setHighlightedCells([]);
        return;
      }

      // If clicked own beast, select it
      if (playerIndex === myPlayerIndex) {
        setSelectedBeastIndex(beastIndex);
        setWaitingForMove(false);
        setWaitingForAttack(false);
        setHighlightedCells([]);
      }
    },
    [
      waitingForAttack,
      myPlayerIndex,
      selectedBeastIndex,
      enemyBeasts,
      highlightedCells,
      isPotionAttack,
    ]
  );

  const handleConfirmActions = useCallback(async () => {
    if (!gameId) return;

    // Build ordered actions array
    const aliveBeasts = myBeasts.filter((b) => b.alive);
    const orderedActions: GameAction[] = aliveBeasts.map((b) => {
      const idx = Number(b.beast_index);
      return (
        actions.get(idx) || {
          beastIndex: idx,
          actionType: ActionType.WAIT,
          targetIndex: 0,
          targetRow: 0,
          targetCol: 0,
        }
      );
    });

    const res = await executeTurn(gameId, orderedActions);
    if (res) {
      addBattleEvent({
        type: "attack",
        message: `Turn executed (Round ${game?.round || "?"})`,
      });
      refetchGame();
      refetchBeasts();
    }
  }, [
    gameId,
    myBeasts,
    actions,
    executeTurn,
    addBattleEvent,
    game,
    refetchGame,
    refetchBeasts,
  ]);

  const handleResetActions = useCallback(() => {
    setActions(new Map());
    setSelectedBeastIndex(null);
    setWaitingForMove(false);
    setWaitingForAttack(false);
    setHighlightedCells([]);
  }, []);

  // Contextual guidance message
  const guidanceMessage = useMemo(() => {
    if (!isMyTurn) return "Waiting for opponent to play...";
    if (selectedBeastIndex === null) return "Select one of your beasts to plan an action";
    if (waitingForMove) return "Click a highlighted cell to move";
    if (waitingForAttack) return "Click an enemy beast in range to attack";
    const hasAction = actions.has(selectedBeastIndex);
    if (hasAction) {
      const aliveCount = myBeasts.filter((b) => b.alive).length;
      if (actions.size >= aliveCount) return "All actions set — confirm to execute your turn";
      return "Select the next beast to plan its action";
    }
    return "Choose an action: Move, Attack, or Wait";
  }, [isMyTurn, selectedBeastIndex, waitingForMove, waitingForAttack, actions, myBeasts]);

  // --- Loading state ---
  if (!game || beasts.length === 0) {
    return (
      <Flex justify="center" align="center" minH="100vh">
        <VStack gap={4}>
          <Spinner size="xl" color="green.400" />
          <Text color="text.secondary">Loading battle...</Text>
        </VStack>
      </Flex>
    );
  }

  const potionUsed = false; // TODO: read from PlayerState

  return (
    <Flex direction="column" h="100vh" p={3} maxW="1400px" mx="auto" overflow="hidden">
      {/* Top bar */}
      <Flex justify="space-between" align="center" mb={2} flexShrink={0}>
        <Flex align="center" gap={3}>
          <Heading
            size="sm"
            fontFamily="heading"
            color="green.300"
            textTransform="uppercase"
          >
            Game #{gameId}
          </Heading>
          <Badge variant="magical">Round {game.round}</Badge>
        </Flex>

        <HStack gap={3}>
          <Badge
            variant={isMyTurn ? "magical" : "brute"}
            fontSize="xs"
            px={3}
            py={1}
          >
            {isMyTurn ? "YOUR TURN" : "OPPONENT'S TURN"}
          </Badge>
          <Button
            size="xs"
            variant="outline"
            colorScheme="red"
            onClick={abandonModal.onOpen}
          >
            Abandon
          </Button>
        </HStack>
      </Flex>

      {/* Guidance bar */}
      <Box
        bg={isMyTurn ? "rgba(0,255,68,0.06)" : "rgba(255,51,51,0.06)"}
        border="1px solid"
        borderColor={isMyTurn ? "rgba(0,255,68,0.2)" : "rgba(255,51,51,0.2)"}
        borderRadius="3px"
        px={3}
        py={2}
        mb={2}
        flexShrink={0}
        textAlign="center"
      >
        <Text fontSize="xs" color={isMyTurn ? "green.300" : "danger.300"} fontFamily="mono">
          {guidanceMessage}
        </Text>
      </Box>

      {/* Main 3-column layout */}
      <Flex gap={3} flex={1} minH={0}>
        {/* Left: My beasts (compact) */}
        <VStack
          w="190px"
          gap={2}
          align="stretch"
          flexShrink={0}
          display={{ base: "none", lg: "flex" }}
        >
          <Text
            fontSize="9px"
            color="green.300"
            fontFamily="heading"
            textTransform="uppercase"
            letterSpacing="0.1em"
          >
            Your Beasts
          </Text>
          {myBeasts.map((beast) => (
            <BeastHUD
              key={Number(beast.beast_index)}
              beast={beast}
              isMine={true}
              isSelected={
                isMyTurn &&
                selectedBeastIndex === Number(beast.beast_index)
              }
              plannedAction={actions.get(Number(beast.beast_index))}
              onClick={
                isMyTurn
                  ? () =>
                      setSelectedBeastIndex(Number(beast.beast_index))
                  : undefined
              }
            />
          ))}
        </VStack>

        {/* Center: Grid + Action bar */}
        <VStack flex={1} minW={0} gap={2} align="stretch">
          <Box flex={1} minH={0} overflow="auto">
            <HexGrid
              hexSize={46}
              myBeasts={myBeasts}
              enemyBeasts={enemyBeasts}
              selectedBeastIndex={isMyTurn ? selectedBeastIndex : null}
              onCellClick={handleCellClick}
              onBeastClick={handleBeastClick}
              highlightedCells={highlightedCells}
              highlightType={highlightType}
              myPlayerIndex={myPlayerIndex}
              actions={actions}
              obstacles={obstacles}
            />
          </Box>

          {/* Inline action bar below grid */}
          {isMyTurn && (
            <ActionPanel
              myBeasts={myBeasts}
              enemyBeasts={enemyBeasts}
              actions={actions}
              onSetAction={(idx, action) =>
                setActions((prev) => new Map(prev).set(idx, action))
              }
              onConfirm={handleConfirmActions}
              onCancel={handleResetActions}
              selectedBeastIndex={selectedBeastIndex}
              onSelectBeast={setSelectedBeastIndex}
              potionUsed={potionUsed}
              isLoading={isLoading}
              waitingForMove={waitingForMove}
              waitingForAttack={waitingForAttack}
              onChooseMove={handleChooseMove}
              onChooseAttack={handleChooseAttack}
              onChoosePotion={handleChoosePotion}
              onChooseWait={handleChooseWait}
            />
          )}

          {!isMyTurn && (
            <Box
              bg="surface.panel"
              border="1px solid"
              borderColor="surface.border"
              borderRadius="3px"
              p={3}
              textAlign="center"
            >
              <HStack justify="center" gap={2}>
                <Spinner size="sm" color="green.400" />
                <Text fontSize="xs" color="text.secondary">
                  Waiting for opponent...
                </Text>
              </HStack>
            </Box>
          )}
        </VStack>

        {/* Right: Enemy beasts + Battle log */}
        <VStack
          w="190px"
          gap={2}
          align="stretch"
          flexShrink={0}
          display={{ base: "none", lg: "flex" }}
        >
          <Text
            fontSize="9px"
            color="danger.300"
            fontFamily="heading"
            textTransform="uppercase"
            letterSpacing="0.1em"
          >
            Enemy Beasts
          </Text>
          {enemyBeasts.map((beast) => (
            <BeastHUD
              key={Number(beast.beast_index)}
              beast={beast}
              isMine={false}
            />
          ))}

          <Box flex={1} minH={0}>
            <BattleLog events={battleLog} />
          </Box>
        </VStack>
      </Flex>

      {/* Abandon confirmation modal */}
      <Modal isOpen={abandonModal.isOpen} onClose={abandonModal.onClose} isCentered>
        <ModalOverlay />
        <ModalContent bg="surface.panel" border="1px solid" borderColor="surface.border">
          <ModalHeader fontSize="md" color="danger.300">Abandon Game</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <Text fontSize="sm" color="text.secondary" mb={4}>
              Are you sure you want to abandon this game? This will count as a loss.
            </Text>
            <HStack justify="flex-end" gap={3}>
              <Button size="sm" variant="outline" onClick={abandonModal.onClose}>
                Cancel
              </Button>
              <Button
                size="sm"
                colorScheme="red"
                isLoading={isLoading}
                onClick={async () => {
                  if (gameId) await abandonGame(gameId);
                  abandonModal.onClose();
                  navigate("/");
                }}
              >
                Abandon
              </Button>
            </HStack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Flex>
  );
}
