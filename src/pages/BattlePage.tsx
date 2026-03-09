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
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
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
import { getProfile } from "../services/supabase";
import { HowToButton } from "../components/HowToGuide";

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
  const { beasts, rawBeasts, refetch: refetchBeasts } = useBeastStates(gameId);
  const { mapState } = useMapState(gameId);
  const obstacles = useMemo(() => {
    if (!mapState) return OBSTACLES;
    return mapStateToObstacles(mapState);
  }, [mapState]);
  const { battleLog, addBattleEvent, clearBattleLog } = useGameStore();
  const abandonModal = useDisclosure();

  const myAddress = account?.address || "";

  // Resolve player usernames
  const [myName, setMyName] = useState("You");
  const [enemyName, setEnemyName] = useState("Enemy");
  const namesResolved = useRef(false);
  useEffect(() => {
    if (!game || namesResolved.current) return;
    const enemyAddr = isSameAddress(game.player1, myAddress) ? game.player2 : game.player1;
    namesResolved.current = true;
    getProfile(myAddress).then((p) => {
      if (p?.display_name) setMyName(p.display_name);
    });
    if (enemyAddr && enemyAddr !== ZERO_ADDR) {
      getProfile(enemyAddr).then((p) => {
        if (p?.display_name) setEnemyName(p.display_name);
      });
    }
  }, [game, myAddress]);

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
  const [actionHistory, setActionHistory] = useState<number[]>([]);
  const [isConfirmLocked, setIsConfirmLocked] = useState(false);

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
    setActionHistory([]);
    setIsConfirmLocked(false);
  }, [game?.current_attacker, game?.round]);

  // Get selected beast model
  const selectedBeast = useMemo(() => {
    if (selectedBeastIndex === null) return null;
    return myBeasts.find((b) => Number(b.beast_index) === selectedBeastIndex);
  }, [selectedBeastIndex, myBeasts]);

  // Get occupied cells for move validation (uses effective positions with planned moves)
  const occupiedCells = useMemo((): HexCoord[] => {
    return rawBeasts
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
  }, [rawBeasts, actions, myPlayerIndex]);

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
            actionType: ActionType.ATTACK,
            targetIndex: Number(enemyBeast.beast_index),
            targetRow: 0,
            targetCol: 0,
          };
          const updated = new Map(actions).set(selectedBeastIndex, action);
          setActions(updated);
          setActionHistory((prev) => [...prev.filter((i) => i !== selectedBeastIndex), selectedBeastIndex]);
          autoAdvance(updated);
          return;
        }
      }

      // Click outside range -> deselect
      setSelectedBeastIndex(null);
    },
    [isMyTurn, selectedBeastIndex, moveCells, attackCells, enemyBeasts, autoAdvance, actions]
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
            actionType: ActionType.ATTACK,
            targetIndex: beastIndex,
            targetRow: 0,
            targetCol: 0,
          };
          const updated = new Map(actions).set(selectedBeastIndex, action);
          setActions(updated);
          setActionHistory((prev) => [...prev.filter((i) => i !== selectedBeastIndex), selectedBeastIndex]);
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
    [isMyTurn, myPlayerIndex, selectedBeastIndex, enemyBeasts, attackCells, autoAdvance, actions]
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
    setSelectedBeastIndex(lastIdx);
  }, [actionHistory]);

  const handleClearAll = useCallback(() => {
    setActions(new Map());
    setActionHistory([]);
    setSelectedBeastIndex(null);
  }, []);

  const handleConfirmActions = useCallback(async () => {
    if (!gameId || isConfirmLocked) return;

    const orderedActions: GameAction[] = actionHistory
      .map((idx) => actions.get(idx))
      .filter((a): a is GameAction => a !== undefined);

    setIsConfirmLocked(true);
    try {
      const res = await executeTurn(gameId, orderedActions);
      if (res) {
        const txHash = (res as any)?.transaction_hash;
        addBattleEvent({
          type: "attack",
          message: `Turn executed (Round ${game?.round || "?"})`,
          txHash,
        });
        refetchGame();
        refetchBeasts();
      } else {
        setIsConfirmLocked(false);
      }
    } catch (error) {
      console.error("Failed to confirm actions:", error);
      setIsConfirmLocked(false);
    }
  }, [
    gameId,
    isConfirmLocked,
    actions,
    actionHistory,
    executeTurn,
    addBattleEvent,
    game,
    refetchGame,
    refetchBeasts,
  ]);

  const aliveCount = useMemo(() => myBeasts.filter((b) => b.alive).length, [myBeasts]);
  const enemyAliveCount = useMemo(() => enemyBeasts.filter((b) => b.alive).length, [enemyBeasts]);
  const canConfirm = isMyTurn && aliveCount > 0 && enemyAliveCount > 0 && !isConfirmLocked;

  // Contextual guidance message
  const guidanceMessage = useMemo(() => {
    if (enemyAliveCount === 0) return "Enemy team defeated";
    if (aliveCount === 0) return "Your team was defeated";
    if (!isMyTurn) return "Waiting for opponent...";
    if (isConfirmLocked) return "Actions submitted...";
    if (actions.size >= 3) return "Press confirm";
    if (actions.size > 0) return "Plan another action or press confirm";
    if (selectedBeastIndex === null) return "Select a beast or press confirm";
    return "Choose where to attack or move";
  }, [enemyAliveCount, aliveCount, isMyTurn, isConfirmLocked, selectedBeastIndex, actions.size]);

  const hasBattleStateReady = useMemo(() => {
    if (rawBeasts.length === 0) return false;
    if (myBeasts.length === 0 && enemyBeasts.length === 0) return false;
    return true;
  }, [rawBeasts.length, myBeasts.length, enemyBeasts.length]);

  useEffect(() => {
    if (!game || !gameId) return;
    if (game.status === GameStatus.FINISHED) return;
    if (myPlayerIndex === 0) return;
    if (!hasBattleStateReady) return;
    // Guard against transient empty snapshots during polling.
    if (aliveCount === 0 && enemyAliveCount === 0) return;
    if (aliveCount > 0 && enemyAliveCount > 0) return;

    const winnerAddress =
      enemyAliveCount === 0 && aliveCount > 0
        ? myAddress
        : aliveCount === 0 && enemyAliveCount > 0
          ? (myPlayerIndex === 1 ? game.player2 : game.player1)
          : ZERO_ADDR;

    navigate(`/result/${gameId}`, {
      replace: true,
      state: {
        forcedOutcome: {
          winner: winnerAddress,
          reason: "frontend_ko_resolution",
        },
      },
    });
  }, [
    game,
    gameId,
    myPlayerIndex,
    hasBattleStateReady,
    myAddress,
    aliveCount,
    enemyAliveCount,
    navigate,
  ]);

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
      {/* How To button — top right */}
      <Box position="absolute" top={3} right={3} zIndex={10}>
        <HowToButton />
      </Box>

      {/* === TOP HUD === */}
      <Box className="battle-hud-top" px={4} pt={0}>
        <Flex w="100%" maxW="700px" align="flex-start" justify="center" gap={5}>
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
                  <Text className="round-badge__label">Opponent's turn</Text>
                </HStack>
                <Text className="round-badge__timer">WAITING</Text>
              </>
            )}
          </Box>
        </Flex>
      </Box>

      {/* === TURN GUIDANCE (between round badge and board) === */}
      {isMyTurn && (
        <Box className="battle-turn-guidance">
          <Text className="battle-turn-guidance__text">{guidanceMessage}</Text>
        </Box>
      )}

      {/* === MAIN GRID AREA === */}
      <Box
        position="absolute"
        top={isMyTurn ? "96px" : "70px"}
        left={0}
        right={0}
        bottom={0}
        zIndex={3}
        transform={{ base: "none", lg: "translateX(60px)" }}
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

      {isMyTurn && !isConfirmLocked && (
        <Box className="battle-confirm-dock">
          <Button
            variant="unstyled"
            className="battle-confirm-btn"
            onClick={handleConfirmActions}
            isDisabled={!canConfirm}
            isLoading={isLoading}
          >
            Confirm Actions
          </Button>
        </Box>
      )}

      <Button
        position="absolute"
        top="8px"
        right="8px"
        zIndex={12}
        variant="unstyled"
        className="battle-confirm-btn battle-leave-btn"
        onClick={abandonModal.onOpen}
        display="inline-flex"
      >
        Leave
      </Button>

      {/* === LEFT PANEL - My beasts + Actions === */}
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
      >
        <Box className="battle-panel" flexShrink={0}>
          <Box className="battle-panel__header">
            <Text className="battle-panel__title">{myName}</Text>
          </Box>
          <Box className="battle-panel__body">
            <VStack gap={2} align="stretch">
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
          <Box
            className={`battle-panel ${actions.size > 0 && canConfirm ? "battle-panel--ready" : ""}`}
            mt={3}
            h="160px"
          >
            <Box className="battle-panel__header">
              <Text className="battle-panel__title">Your Actions</Text>
            </Box>
            <Box className="battle-panel__body" h="calc(100% - 36px)" overflowY="auto">
              <PlannedActions
                myBeasts={myBeasts}
                enemyBeasts={enemyBeasts}
                actions={actions}
                actionHistory={actionHistory}
                onUndoLast={handleUndoLast}
                onClearAll={handleClearAll}
              />
            </Box>
          </Box>
        )}
      </VStack>

      {/* === RIGHT PANEL - Enemy beasts + Battle log === */}
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
            <Text className="battle-panel__title">{enemyName}</Text>
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

        <Box className="battle-panel" mt={3} h="160px">
          <Box className="battle-panel__header">
            <Text className="battle-panel__title">Battle Log</Text>
          </Box>
          <Box className="battle-panel__body" h="calc(100% - 36px)" overflowY="auto">
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
