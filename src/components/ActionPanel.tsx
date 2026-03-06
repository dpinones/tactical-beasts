import { Box, Button, Flex, Text, HStack } from "@chakra-ui/react";
import {
  BeastStateModel,
  BeastType,
  ActionType,
  GameAction,
} from "../domain/types";
import { getTypeColor, getTypeName } from "../domain/combat";

interface ActionPanelProps {
  myBeasts: BeastStateModel[];
  enemyBeasts?: BeastStateModel[];
  actions: Map<number, GameAction>;
  onSetAction: (beastIndex: number, action: GameAction) => void;
  onConfirm: () => void;
  onCancel: () => void;
  selectedBeastIndex: number | null;
  onSelectBeast: (index: number | null) => void;
  potionUsed: boolean;
  isLoading: boolean;
  waitingForMove: boolean;
  waitingForAttack: boolean;
  onChooseMove: () => void;
  onChooseAttack: () => void;
  onChoosePotion: () => void;
  onChooseWait: () => void;
}

export function ActionPanel({
  myBeasts,
  actions,
  onConfirm,
  onCancel,
  selectedBeastIndex,
  onSelectBeast,
  potionUsed,
  isLoading,
  waitingForMove,
  waitingForAttack,
  onChooseMove,
  onChooseAttack,
  onChoosePotion,
  onChooseWait,
}: ActionPanelProps) {
  const aliveBeasts = myBeasts.filter((b) => b.alive);
  const allActionsSet = aliveBeasts.every((b) =>
    actions.has(Number(b.beast_index))
  );

  const selectedBeast =
    selectedBeastIndex !== null
      ? myBeasts.find((b) => Number(b.beast_index) === selectedBeastIndex)
      : null;

  const hasAction =
    selectedBeastIndex !== null && actions.has(selectedBeastIndex);

  const isSelectingTarget = waitingForMove || waitingForAttack;

  return (
    <Box
      bg="surface.panel"
      border="1px solid"
      borderColor="surface.border"
      borderRadius="3px"
      p={3}
      flexShrink={0}
    >
      <Flex gap={3} align="center" wrap="wrap">
        {/* Beast selector pills */}
        <HStack gap={1} flexShrink={0}>
          {aliveBeasts.map((beast) => {
            const idx = Number(beast.beast_index);
            const bType = Number(beast.beast_type) as BeastType;
            const color = getTypeColor(bType);
            const hasAct = actions.has(idx);
            const isActive = selectedBeastIndex === idx;

            return (
              <Box
                key={idx}
                as="button"
                onClick={() => onSelectBeast(isActive ? null : idx)}
                bg={isActive ? "rgba(0,255,68,0.15)" : hasAct ? "rgba(255,215,0,0.1)" : "transparent"}
                border="1px solid"
                borderColor={isActive ? "green.400" : hasAct ? "rgba(255,215,0,0.3)" : "surface.border"}
                borderRadius="3px"
                px={3}
                py={1}
                cursor="pointer"
                transition="all 0.15s"
                _hover={{ borderColor: isActive ? "green.400" : "surface.borderLight" }}
                boxShadow={isActive ? "0 0 8px rgba(0,255,68,0.3)" : "none"}
                position="relative"
              >
                <Flex align="center" gap={1}>
                  <Box w="6px" h="6px" borderRadius="full" bg={color} flexShrink={0} />
                  <Text fontSize="xs" color={isActive ? "green.300" : "text.primary"} fontWeight="600" fontFamily="mono">
                    {getTypeName(bType)}
                  </Text>
                  {hasAct && (
                    <Text fontSize="8px" color="gold.400" fontWeight="700">
                      {actionIcon(actions.get(idx)!.actionType)}
                    </Text>
                  )}
                </Flex>
              </Box>
            );
          })}
        </HStack>

        {/* Divider */}
        <Box w="1px" h="24px" bg="surface.border" display={{ base: "none", md: "block" }} />

        {/* Action buttons — visible when a beast is selected and has no action yet */}
        {selectedBeast && !hasAction && !isSelectingTarget && (
          <HStack gap={2}>
            <Button size="sm" variant="primary" onClick={onChooseMove} px={4}>
              Move
            </Button>
            <Button size="sm" variant="danger" onClick={onChooseAttack} px={4}>
              Attack
            </Button>
            {!potionUsed && (
              <Button size="sm" variant="gold" onClick={onChoosePotion} px={4}>
                Potion+Atk
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={onChooseWait} px={4}>
              Wait
            </Button>
          </HStack>
        )}

        {/* Selecting target feedback */}
        {isSelectingTarget && (
          <Text fontSize="xs" color={waitingForMove ? "green.300" : "danger.300"} fontFamily="mono">
            {waitingForMove ? "Click a green cell to move" : "Click an enemy to attack"}
          </Text>
        )}

        {/* Already has action for this beast */}
        {hasAction && selectedBeastIndex !== null && !isSelectingTarget && (
          <Text fontSize="xs" color="gold.400" fontFamily="mono">
            {getTypeName(Number(selectedBeast?.beast_type) as BeastType)}: {actionLabel(actions.get(selectedBeastIndex)!.actionType)}
          </Text>
        )}

        {/* No beast selected */}
        {selectedBeastIndex === null && (
          <Text fontSize="xs" color="text.muted" fontFamily="mono">
            Select a beast above
          </Text>
        )}

        {/* Spacer + Confirm / Reset */}
        <Flex ml="auto" gap={2} align="center" flexShrink={0}>
          <Button variant="ghost" size="sm" onClick={onCancel} px={3}>
            Reset
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={onConfirm}
            isDisabled={!allActionsSet}
            isLoading={isLoading}
            px={4}
          >
            Confirm ({actions.size}/{aliveBeasts.length})
          </Button>
        </Flex>
      </Flex>
    </Box>
  );
}

function actionLabel(type: ActionType): string {
  switch (type) {
    case ActionType.WAIT:
      return "Wait";
    case ActionType.MOVE:
      return "Move";
    case ActionType.ATTACK:
      return "Attack";
    case ActionType.CONSUMABLE_ATTACK_POTION:
      return "Potion+Atk";
  }
}

function actionIcon(type: ActionType): string {
  switch (type) {
    case ActionType.WAIT:
      return "ZZ";
    case ActionType.MOVE:
      return "GO";
    case ActionType.ATTACK:
      return "ATK";
    case ActionType.CONSUMABLE_ATTACK_POTION:
      return "ATK+";
  }
}
