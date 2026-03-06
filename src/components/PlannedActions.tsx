import { Box, Button, Flex, Text, Switch, VStack, HStack } from "@chakra-ui/react";
import { BeastStateModel, BeastType, ActionType, GameAction } from "../domain/types";
import { getTypeName, getTypeColor } from "../domain/combat";

interface PlannedActionsProps {
  myBeasts: BeastStateModel[];
  enemyBeasts: BeastStateModel[];
  actions: Map<number, GameAction>;
  actionHistory: number[];
  potionToggle: boolean;
  potionUsed: boolean;
  onTogglePotion: () => void;
  onUndoLast: () => void;
  onClearAll: () => void;
  onConfirm: () => void;
  isLoading: boolean;
}

function actionSymbol(type: ActionType): string {
  switch (type) {
    case ActionType.MOVE: return "->";
    case ActionType.ATTACK: return "x";
    case ActionType.WAIT: return "||";
    case ActionType.CONSUMABLE_ATTACK_POTION: return "+x";
  }
}

function actionBorderColor(type: ActionType): string {
  switch (type) {
    case ActionType.MOVE: return "#33FF66";
    case ActionType.ATTACK: return "#E84040";
    case ActionType.WAIT: return "#FFD700";
    case ActionType.CONSUMABLE_ATTACK_POTION: return "#FFE033";
  }
}

function describeAction(action: GameAction, enemyBeasts: BeastStateModel[]): string {
  switch (action.actionType) {
    case ActionType.MOVE:
      return `Move -> (${action.targetRow},${action.targetCol})`;
    case ActionType.ATTACK: {
      const target = enemyBeasts.find((b) => Number(b.beast_index) === action.targetIndex);
      const name = target ? getTypeName(Number(target.beast_type) as BeastType) : `#${action.targetIndex}`;
      return `Atk -> ${name} #${action.targetIndex}`;
    }
    case ActionType.CONSUMABLE_ATTACK_POTION: {
      const target = enemyBeasts.find((b) => Number(b.beast_index) === action.targetIndex);
      const name = target ? getTypeName(Number(target.beast_type) as BeastType) : `#${action.targetIndex}`;
      return `Potion+Atk -> ${name} #${action.targetIndex}`;
    }
    case ActionType.WAIT:
      return "Wait";
  }
}

export function PlannedActions({
  myBeasts,
  enemyBeasts,
  actions,
  actionHistory,
  potionToggle,
  potionUsed,
  onTogglePotion,
  onUndoLast,
  onClearAll,
  onConfirm,
  isLoading,
}: PlannedActionsProps) {
  const aliveBeasts = myBeasts.filter((b) => b.alive);
  const allActionsSet = aliveBeasts.every((b) => actions.has(Number(b.beast_index)));

  return (
    <VStack gap={2} align="stretch">
      {/* Potion toggle */}
      <Flex
        align="center"
        justify="space-between"
        bg="surface.panel"
        border="1px solid"
        borderColor={potionToggle ? "gold.400" : "surface.border"}
        borderRadius="3px"
        px={3}
        py={2}
        boxShadow={potionToggle ? "glowGold" : "none"}
      >
        <Text fontSize="xs" color={potionUsed ? "text.muted" : "gold.400"} fontFamily="mono" fontWeight="600" textTransform="uppercase">
          Use Potion
        </Text>
        <Switch
          size="sm"
          colorScheme="yellow"
          isChecked={potionToggle}
          isDisabled={potionUsed}
          onChange={onTogglePotion}
        />
      </Flex>

      {/* Planned actions list */}
      <Box
        bg="surface.panel"
        border="1px solid"
        borderColor="surface.border"
        borderRadius="3px"
        p={2}
      >
        <Text
          fontSize="sm"
          color="gold.400"
          fontFamily="heading"
          textTransform="uppercase"
          letterSpacing="0.1em"
          mb={1.5}
        >
          Planned Actions
        </Text>
        <VStack gap={1} align="stretch">
          {/* Actions in execution order (selection order) */}
          {actionHistory.map((idx, i) => {
            const beast = aliveBeasts.find((b) => Number(b.beast_index) === idx);
            if (!beast) return null;
            const action = actions.get(idx);
            if (!action) return null;
            const bType = Number(beast.beast_type) as BeastType;
            const typeName = getTypeName(bType);
            const color = getTypeColor(bType);

            return (
              <Flex
                key={idx}
                align="center"
                gap={1.5}
                px={2}
                py={1.5}
                bg="rgba(255,215,0,0.05)"
                borderRadius="2px"
                borderLeft="3px solid"
                borderLeftColor={actionBorderColor(action.actionType)}
              >
                <Text fontSize="xs" color="text.muted" fontFamily="mono" fontWeight="700" w="14px">
                  {i + 1}.
                </Text>
                <Text fontSize="xs" color={color} fontFamily="mono" fontWeight="600" minW="40px">
                  {typeName}
                </Text>
                <Text fontSize="xs" color="text.muted" fontFamily="mono" fontWeight="700" minW="16px">
                  {actionSymbol(action.actionType)}
                </Text>
                <Text fontSize="xs" color="gold.400" fontFamily="mono" flex={1} noOfLines={1}>
                  {describeAction(action, enemyBeasts)}
                </Text>
              </Flex>
            );
          })}
          {/* Pending beasts without action */}
          {aliveBeasts
            .filter((b) => !actions.has(Number(b.beast_index)))
            .map((beast) => {
              const bType = Number(beast.beast_type) as BeastType;
              const typeName = getTypeName(bType);
              const color = getTypeColor(bType);

              return (
                <Flex
                  key={Number(beast.beast_index)}
                  align="center"
                  gap={1.5}
                  px={2}
                  py={1.5}
                  borderRadius="2px"
                >
                  <Text fontSize="xs" color="text.muted" fontFamily="mono" fontWeight="700" w="14px">
                    -
                  </Text>
                  <Text fontSize="xs" color={color} fontFamily="mono" fontWeight="600" minW="40px">
                    {typeName}
                  </Text>
                  <Box as="span" w="6px" h="6px" borderRadius="50%" bg="gold.400" className="pending-dot" />
                </Flex>
              );
            })}
        </VStack>
      </Box>

      {/* Undo / Clear / Confirm buttons */}
      <HStack gap={1.5}>
        <Button
          size="xs"
          variant="secondary"
          onClick={onUndoLast}
          isDisabled={actions.size === 0}
          flex={1}
          fontSize="xs"
        >
          Undo Last
        </Button>
        <Button
          size="xs"
          variant="secondary"
          onClick={onClearAll}
          isDisabled={actions.size === 0}
          flex={1}
          fontSize="xs"
        >
          Clear All
        </Button>
      </HStack>
      <Button
        variant="primary"
        size="sm"
        fontSize="sm"
        onClick={onConfirm}
        isDisabled={!allActionsSet}
        isLoading={isLoading}
        w="100%"
        className={allActionsSet ? "confirm-ready-glow" : undefined}
      >
        Confirm ({actions.size}/{aliveBeasts.length})
      </Button>
    </VStack>
  );
}
