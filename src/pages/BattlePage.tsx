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
import { PlannedActions } from "../components/PlannedActions";
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
  const [selectedBeastIndex, setSelectedBeastIndex] = useState<number | null>(null);
  const [potionToggle, setPotionToggle] = useState(false);
  const [actionHistory, setActionHistory] = useState<number[]>([]);

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
    setPotionToggle(false);
    setActionHistory([]);
  }, [game?.current_attacker, game?.round]);

  // Get selected beast model
  const selectedBeast = useMemo(() => {
    if (selectedBeastIndex === null) return null;
    return myBeasts.find((b) => Number(b.beast_index) === selectedBeastIndex);
  }, [selectedBeastIndex, myBeasts]);

  // Get occupied cells for move validation (uses effective positions with planned moves)
  const occupiedCells = useMemo((): HexCoord[] => {
    return beasts
      .filter((b) => b.alive)
      .map((b) => {
        const isMine = Number(b.player_index) === myPlayerIndex;
        if (isMine) {
          const action = actions.get(Number(b.beast_index));
          if (action && action.actionType === ActionType.MOVE) {
            return { row: action.targetRow, col: action.targetCol };
          }
        }
        return { row: Number(b.position_row), col: Number(b.position_col) };
      });
  }, [beasts, actions, myPlayerIndex]);

  // Computed move/attack cells for the selected beast
  const moveCells = useMemo((): HexCoord[] => {
    if (!selectedBeast || !selectedBeast.alive) return [];
    const dummyBeast = {
      beastIndex: 0, beastId: 0, name: "", type: 0, typeName: "",
      tier: Number(selectedBeast.tier), level: Number(selectedBeast.level),
      hp: 0, hpMax: 0, extraLives: 0,
      position: { row: Number(selectedBeast.position_row), col: Number(selectedBeast.position_col) },
      alive: true, powerBase: 0,
    };
    const moveRange = getMoveRange(dummyBeast);
    return getValidMoveTargets(
      { row: Number(selectedBeast.position_row), col: Number(selectedBeast.position_col) },
      moveRange,
      occupiedCells,
      obstacles
    );
  }, [selectedBeast, occupiedCells, obstacles]);

  const attackCells = useMemo((): HexCoord[] => {
    if (!selectedBeast || !selectedBeast.alive) return [];
    const pos = { row: Number(selectedBeast.position_row), col: Number(selectedBeast.position_col) };
    const dummyBeast = {
      beastIndex: 0, beastId: 0, name: "", type: 0, typeName: "",
      tier: Number(selectedBeast.tier), level: Number(selectedBeast.level),
      hp: 0, hpMax: 0, extraLives: 0, position: pos, alive: true, powerBase: 0,
    };
    const atkRange = getAttackRange(dummyBeast);
    return enemyBeasts
      .filter((b) => b.alive)
      .map((b) => ({ row: Number(b.position_row), col: Number(b.position_col) }))
      .filter((ep) => hexDistance(pos, ep) <= atkRange);
  }, [selectedBeast, enemyBeasts]);

  // Auto-advance: select next beast without an action (receives updated map)
  const autoAdvance = useCallback(
    (updatedActions: Map<number, GameAction>) => {
      const aliveBeasts = myBeasts.filter((b) => b.alive);
      const next = aliveBeasts.find((b) => !updatedActions.has(Number(b.beast_index)));
      setSelectedBeastIndex(next ? Number(next.beast_index) : null);
    },
    [myBeasts]
  );

  // --- Action handlers ---

  const handleCellClick = useCallback(
    (row: number, col: number) => {
      if (selectedBeastIndex === null) return;

      // Check if cell is in moveCells
      const isMove = moveCells.some((c) => c.row === row && c.col === col);
      if (isMove) {
        const action: GameAction = {
          beastIndex: selectedBeastIndex,
          actionType: ActionType.MOVE,
          targetIndex: 0,
          targetRow: row,
          targetCol: col,
        };
        const updated = new Map(actions).set(selectedBeastIndex, action);
        setActions(updated);
        setActionHistory((prev) => [...prev.filter((i) => i !== selectedBeastIndex), selectedBeastIndex]);
        autoAdvance(updated);
        return;
      }

      // Check if cell is in attackCells (enemy on that cell)
      const isAttack = attackCells.some((c) => c.row === row && c.col === col);
      if (isAttack) {
        const enemyBeast = enemyBeasts.find(
          (b) => b.alive && Number(b.position_row) === row && Number(b.position_col) === col
        );
        if (enemyBeast) {
          const action: GameAction = {
            beastIndex: selectedBeastIndex,
            actionType: potionToggle ? ActionType.CONSUMABLE_ATTACK_POTION : ActionType.ATTACK,
            targetIndex: Number(enemyBeast.beast_index),
            targetRow: 0,
            targetCol: 0,
          };
          const updated = new Map(actions).set(selectedBeastIndex, action);
          setActions(updated);
          setActionHistory((prev) => [...prev.filter((i) => i !== selectedBeastIndex), selectedBeastIndex]);
          if (potionToggle) setPotionToggle(false);
          autoAdvance(updated);
          return;
        }
      }

      // Click outside range → deselect
      setSelectedBeastIndex(null);
    },
    [selectedBeastIndex, moveCells, attackCells, enemyBeasts, potionToggle, autoAdvance, actions]
  );

  const handleBeastClick = useCallback(
    (playerIndex: number, beastIndex: number) => {
      // Enemy click while beast selected → attack if in range
      if (playerIndex !== myPlayerIndex && selectedBeastIndex !== null) {
        const enemyBeast = enemyBeasts.find((b) => Number(b.beast_index) === beastIndex);
        if (!enemyBeast) return;
        const isInRange = attackCells.some(
          (c) => c.row === Number(enemyBeast.position_row) && c.col === Number(enemyBeast.position_col)
        );
        if (isInRange) {
          const action: GameAction = {
            beastIndex: selectedBeastIndex,
            actionType: potionToggle ? ActionType.CONSUMABLE_ATTACK_POTION : ActionType.ATTACK,
            targetIndex: beastIndex,
            targetRow: 0,
            targetCol: 0,
          };
          const updated = new Map(actions).set(selectedBeastIndex, action);
          setActions(updated);
          setActionHistory((prev) => [...prev.filter((i) => i !== selectedBeastIndex), selectedBeastIndex]);
          if (potionToggle) setPotionToggle(false);
          autoAdvance(updated);
          return;
        }
      }

      // Own beast click
      if (playerIndex === myPlayerIndex) {
        if (selectedBeastIndex === beastIndex) {
          // Click same beast → deselect
          setSelectedBeastIndex(null);
        } else {
          setSelectedBeastIndex(beastIndex);
        }
      }
    },
    [myPlayerIndex, selectedBeastIndex, enemyBeasts, attackCells, potionToggle, autoAdvance, actions]
  );

  const handleWait = useCallback(
    (beastIndex: number) => {
      const action: GameAction = {
        beastIndex,
        actionType: ActionType.WAIT,
        targetIndex: 0,
        targetRow: 0,
        targetCol: 0,
      };
      const updated = new Map(actions).set(beastIndex, action);
      setActions(updated);
      setActionHistory((prev) => [...prev.filter((i) => i !== beastIndex), beastIndex]);
      autoAdvance(updated);
    },
    [autoAdvance, actions]
  );

  const handleUndoLast = useCallback(() => {
    if (actionHistory.length === 0) return;
    const lastIdx = actionHistory[actionHistory.length - 1];
    setActions((prev) => {
      const next = new Map(prev);
      next.delete(lastIdx);
      return next;
    });
    setActionHistory((prev) => prev.slice(0, -1));
    // Check if the undone action was a potion attack → re-enable toggle
    const undoneAction = actions.get(lastIdx);
    if (undoneAction?.actionType === ActionType.CONSUMABLE_ATTACK_POTION) {
      setPotionToggle(true);
    }
    setSelectedBeastIndex(lastIdx);
  }, [actionHistory, actions]);

  const handleClearAll = useCallback(() => {
    // Check if any cleared action was a potion attack
    const hadPotion = Array.from(actions.values()).some(
      (a) => a.actionType === ActionType.CONSUMABLE_ATTACK_POTION
    );
    setActions(new Map());
    setActionHistory([]);
    setSelectedBeastIndex(null);
    if (hadPotion) setPotionToggle(false);
  }, [actions]);

  const handleConfirmActions = useCallback(async () => {
    if (!gameId) return;

    // Send actions in selection order (actionHistory), then any remaining as WAIT
    const orderedActions: GameAction[] = actionHistory.map((idx) => {
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
    // Append any alive beasts not in history as WAIT
    const aliveBeasts = myBeasts.filter((b) => b.alive);
    for (const b of aliveBeasts) {
      const idx = Number(b.beast_index);
      if (!actionHistory.includes(idx)) {
        orderedActions.push({
          beastIndex: idx,
          actionType: ActionType.WAIT,
          targetIndex: 0,
          targetRow: 0,
          targetCol: 0,
        });
      }
    }

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
    actionHistory,
    executeTurn,
    addBattleEvent,
    game,
    refetchGame,
    refetchBeasts,
  ]);

  // Contextual guidance message
  const guidanceMessage = useMemo(() => {
    if (!isMyTurn) return "Waiting for opponent to play...";
    if (selectedBeastIndex === null) return "Select one of your beasts to plan an action";
    const aliveCount = myBeasts.filter((b) => b.alive).length;
    if (actions.size >= aliveCount) return "All actions set -- confirm to execute your turn";
    return "Click green cell to move, red enemy to attack";
  }, [isMyTurn, selectedBeastIndex, actions, myBeasts]);

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
        {/* Left: My beasts + PlannedActions */}
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
                  ? () => setSelectedBeastIndex(Number(beast.beast_index))
                  : undefined
              }
              onWait={
                isMyTurn && beast.alive
                  ? () => handleWait(Number(beast.beast_index))
                  : undefined
              }
            />
          ))}

          {/* PlannedActions section */}
          {isMyTurn && (
            <PlannedActions
              myBeasts={myBeasts}
              enemyBeasts={enemyBeasts}
              actions={actions}
              actionHistory={actionHistory}
              potionToggle={potionToggle}
              potionUsed={potionUsed}
              onTogglePotion={() => setPotionToggle((v) => !v)}
              onUndoLast={handleUndoLast}
              onClearAll={handleClearAll}
              onConfirm={handleConfirmActions}
              isLoading={isLoading}
            />
          )}
        </VStack>

        {/* Center: HexGrid only */}
        <VStack flex={1} minW={0} gap={2} align="stretch">
          <Box flex={1} minH={0} overflow="auto">
            <HexGrid
              hexSize={46}
              myBeasts={myBeasts}
              enemyBeasts={enemyBeasts}
              selectedBeastIndex={isMyTurn ? selectedBeastIndex : null}
              onCellClick={handleCellClick}
              onBeastClick={handleBeastClick}
              moveCells={moveCells}
              attackCells={attackCells}
              myPlayerIndex={myPlayerIndex}
              actions={actions}
              obstacles={obstacles}
            />
          </Box>

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
