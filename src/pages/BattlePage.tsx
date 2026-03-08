import {
  Box,
  Button,
  Flex,
  Text,
  HStack,
  VStack,
  Spinner,
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
      beastIndex: 0, beastId: Number(selectedBeast.beast_id), name: "", type: 0, typeName: "",
      tier: Number(selectedBeast.tier), level: Number(selectedBeast.level),
      hp: 0, hpMax: 0, extraLives: 0,
      position: { row: Number(selectedBeast.position_row), col: Number(selectedBeast.position_col) },
      alive: true, powerBase: 0,
    };
    const moveRange = getMoveRange(dummyBeast);
    const atkRange = getAttackRange(dummyBeast);
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
      beastIndex: 0, beastId: Number(selectedBeast.beast_id), name: "", type: 0, typeName: "",
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
      if (!isMyTurn) return;
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

      // Click outside range -> deselect
      setSelectedBeastIndex(null);
    },
    [isMyTurn, selectedBeastIndex, moveCells, attackCells, enemyBeasts, potionToggle, autoAdvance, actions]
  );

  const handleBeastClick = useCallback(
    (playerIndex: number, beastIndex: number) => {
      if (!isMyTurn) return;
      // Enemy click while beast selected -> attack if in range
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
          setSelectedBeastIndex(null);
        } else {
          setSelectedBeastIndex(beastIndex);
        }
      }
    },
    [isMyTurn, myPlayerIndex, selectedBeastIndex, enemyBeasts, attackCells, potionToggle, autoAdvance, actions]
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
    const undoneAction = actions.get(lastIdx);
    if (undoneAction?.actionType === ActionType.CONSUMABLE_ATTACK_POTION) {
      setPotionToggle(true);
    }
    setSelectedBeastIndex(lastIdx);
  }, [actionHistory, actions]);

  const handleClearAll = useCallback(() => {
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

    const orderedActions: GameAction[] = actionHistory
      .map((idx) => actions.get(idx))
      .filter((a): a is GameAction => a !== undefined);

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

  const aliveCount = useMemo(() => myBeasts.filter((b) => b.alive).length, [myBeasts]);
  const canConfirm = isMyTurn && aliveCount > 0;

  // Contextual guidance message
  const guidanceMessage = useMemo(() => {
    if (!isMyTurn) return "Waiting for opponent...";
    if (actions.size > 0) return `${actions.size} action(s) planned -- Confirm!`;
    if (selectedBeastIndex === null) return "Select a beast";
    return "Move or Attack";
  }, [isMyTurn, selectedBeastIndex, actions.size]);

  const potionUsed = false; // TODO: read from PlayerState

  // --- Loading state ---
  if (!game || beasts.length === 0) {
    return (
      <Flex justify="center" align="center" minH="100vh" bg="bg.base">
        <VStack gap={4}>
          <Spinner size="xl" color="green.300" />
          <Text color="text.secondary">Loading battle...</Text>
        </VStack>
      </Flex>
    );
  }

  return (
    <Box
      position="relative"
      h="100vh"
      w="100vw"
      overflow="hidden"
      className="arena-background"
    >
      {/* === TOP HUD === */}
      <Box className="battle-hud-top" px={4} pt={0}>
        <Flex w="100%" maxW="700px" align="flex-start" justify="center" gap={5}>
          {/* Player tag - left */}
          <Box className="player-tag player-tag--me" mt={2}>
            <Box
              w="28px" h="28px" borderRadius="6px"
              bg="linear-gradient(135deg, #1d3128, #2a4337)"
              border="2px solid #6A8F7C"
              display="flex" alignItems="center" justifyContent="center"
            >
              <Text fontSize="xs" fontWeight="bold" color="#CCE0D5">P1</Text>
            </Box>
            <Text>You</Text>
          </Box>

          {/* Round badge - center */}
          <Box className={`round-badge ${!isMyTurn ? "round-badge--waiting" : ""}`}>
            {isMyTurn ? (
              <>
                <Text className="round-badge__label">Round {game.round}</Text>
                <Text className="round-badge__timer">YOUR TURN</Text>
              </>
            ) : (
              <>
                <HStack justify="center" gap={2} mb={1}>
                  <Spinner size="sm" color="#D8B4B4" thickness="3px" speed="0.75s" />
                  <Text className="round-badge__label">Turno del rival</Text>
                </HStack>
                <Text className="round-badge__timer">WAITING</Text>
              </>
            )}
          </Box>

          {/* Enemy tag - right */}
          <Box className="player-tag player-tag--enemy" mt={2}>
            <Text>Enemy</Text>
            <Box
              w="28px" h="28px" borderRadius="6px"
              bg="linear-gradient(135deg, #3a2424, #4f3131)"
              border="2px solid #9B7171"
              display="flex" alignItems="center" justifyContent="center"
            >
              <Text fontSize="xs" fontWeight="bold" color="#E2C7C7">AI</Text>
            </Box>
          </Box>
        </Flex>
      </Box>

      {/* === MAIN GRID AREA === */}
      <Box
        position="absolute"
        top="70px"
        left={0}
        right={0}
        bottom={0}
        zIndex={3}
        transform={{ base: "none", lg: "translateX(44px)" }}
      >
        <HexGrid
          hexSize={50}
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

      <Button
        position="absolute"
        top="14px"
        left="12px"
        zIndex={12}
        size="xs"
        variant="ghost"
        color="text.muted"
        _hover={{ color: "danger.300" }}
        onClick={abandonModal.onOpen}
        fontSize="0.65rem"
        px={1}
        display={{ base: "none", lg: "inline-flex" }}
      >
        Abandon
      </Button>

      {/* === LEFT PANEL - My beasts + Actions === */}
      <VStack
        position="absolute"
        top="80px"
        left="12px"
        zIndex={10}
        w="220px"
        gap={2}
        align="stretch"
        display={{ base: "none", lg: "flex" }}
      >
        <Box className="battle-panel" flexShrink={0}>
          <Box className="battle-panel__header">
            <Text className="battle-panel__title">Your Beasts</Text>
          </Box>
          <Box className="battle-panel__body">
            <VStack gap={1.5} align="stretch">
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
                />
              ))}
            </VStack>
          </Box>
        </Box>

        {/* Planned Actions - below my beasts */}
        {isMyTurn && (
          <>
            <Box
              className={`battle-panel ${canConfirm ? "battle-panel--ready" : ""}`}
              flexShrink={0}
            >
              <Box className="battle-panel__header">
                <Text className="battle-panel__title">
                  {guidanceMessage}
                </Text>
              </Box>
              <Box className="battle-panel__body">
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
              </Box>
            </Box>
          </>
        )}
      </VStack>

      {/* === RIGHT PANEL - Enemy beasts + Battle log === */}
      <VStack
        position="absolute"
        top="80px"
        right="12px"
        zIndex={10}
        w="220px"
        gap={3}
        align="stretch"
        display={{ base: "none", lg: "block" }}
      >
        <Box className="battle-panel battle-panel--enemy">
          <Box className="battle-panel__header">
            <Text className="battle-panel__title">Enemy Beasts</Text>
          </Box>
          <Box className="battle-panel__body">
            <VStack gap={2} align="stretch">
              {enemyBeasts.map((beast) => (
                <BeastHUD
                  key={Number(beast.beast_index)}
                  beast={beast}
                  isMine={false}
                />
              ))}
            </VStack>
          </Box>
        </Box>

        <Box className="battle-panel" mt={3}>
          <Box className="battle-panel__header">
            <Text className="battle-panel__title">Battle Log</Text>
          </Box>
          <Box className="battle-panel__body" maxH="160px" overflowY="auto">
            <BattleLog events={battleLog} />
          </Box>
        </Box>
      </VStack>

      {/* Abandon confirmation modal */}
      <Modal isOpen={abandonModal.isOpen} onClose={abandonModal.onClose} isCentered>
        <ModalOverlay />
        <ModalContent bg="surface.overlay" border="1px solid" borderColor="danger.500">
          <ModalHeader fontSize="md" color="danger.200">Abandon Game</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <Text fontSize="sm" color="text.secondary" mb={4}>
              Are you sure you want to abandon this game? This will count as a loss.
            </Text>
            <HStack justify="flex-end" gap={3}>
              <Button size="sm" variant="ghost" color="text.secondary" onClick={abandonModal.onClose}>
                Cancel
              </Button>
              <Button
                size="sm"
                variant="danger"
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
    </Box>
  );
}
