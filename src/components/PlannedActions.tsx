import { Box, Button, Flex, Text, Switch, VStack, HStack } from "@chakra-ui/react";
import { BeastStateModel, BeastType, ActionType, GameAction } from "../domain/types";
import { getTypeName, getTypeColor } from "../domain/combat";

interface PlannedActionsProps {
  myBeasts: BeastStateModel[];
  enemyBeasts: BeastStateModel[];
  actions: Map<number, GameAction>;
  potionToggle: boolean;
  potionUsed: boolean;
  onTogglePotion: () => void;
  onUndoLast: () => void;
  onClearAll: () => void;
  onConfirm: () => void;
  isLoading: boolean;
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
        borderColor="surface.border"
        borderRadius="3px"
        px={2}
        py={1.5}
      >
        <Text fontSize="8px" color={potionUsed ? "text.muted" : "gold.400"} fontFamily="mono" fontWeight="600" textTransform="uppercase">
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
          fontSize="9px"
          color="gold.400"
          fontFamily="heading"
          textTransform="uppercase"
          letterSpacing="0.1em"
          mb={1.5}
        >
          Planned Actions
        </Text>
        <VStack gap={1} align="stretch">
          {aliveBeasts.map((beast, i) => {
            const idx = Number(beast.beast_index);
            const action = actions.get(idx);
            const bType = Number(beast.beast_type) as BeastType;
            const typeName = getTypeName(bType);
            const color = getTypeColor(bType);

            return (
              <Flex
                key={idx}
                align="center"
                gap={1.5}
                px={1.5}
                py={1}
                bg={action ? "rgba(255,215,0,0.05)" : "transparent"}
                borderRadius="2px"
              >
                <Text fontSize="8px" color="text.muted" fontFamily="mono" fontWeight="700" w="12px">
                  {i + 1}.
                </Text>
                <Text fontSize="8px" color={color} fontFamily="mono" fontWeight="600" minW="40px">
                  {typeName}
                </Text>
                <Text fontSize="8px" color={action ? "gold.400" : "text.muted"} fontFamily="mono" flex={1} noOfLines={1}>
                  {action ? describeAction(action, enemyBeasts) : "(awaiting...)"}
                </Text>
              </Flex>
            );
          })}
        </VStack>
      </Box>

      {/* Undo / Clear / Confirm buttons */}
      <HStack gap={1.5}>
        <Button
          size="xs"
          variant="ghost"
          onClick={onUndoLast}
          isDisabled={actions.size === 0}
          flex={1}
          fontSize="9px"
        >
          Undo Last
        </Button>
        <Button
          size="xs"
          variant="ghost"
          onClick={onClearAll}
          isDisabled={actions.size === 0}
          flex={1}
          fontSize="9px"
        >
          Clear All
        </Button>
      </HStack>
      <Button
        variant="primary"
        size="sm"
        onClick={onConfirm}
        isDisabled={!allActionsSet}
        isLoading={isLoading}
        w="100%"
      >
        Confirm ({actions.size}/{aliveBeasts.length})
      </Button>
    </VStack>
  );
}
