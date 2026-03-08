import { Box, Button, Flex, Text, VStack, HStack } from "@chakra-ui/react";
import { BeastStateModel, BeastType, ActionType, GameAction } from "../domain/types";
import { getTypeColor } from "../domain/combat";
import { getSpeciesNameByTokenId } from "../data/beasts";

interface PlannedActionsProps {
  myBeasts: BeastStateModel[];
  enemyBeasts: BeastStateModel[];
  actions: Map<number, GameAction>;
  actionHistory: number[];
  onUndoLast: () => void;
  onClearAll: () => void;
}

function actionSymbol(type: ActionType): string {
  switch (type) {
    case ActionType.MOVE: return "->";
    case ActionType.ATTACK: return "x";
    case ActionType.CONSUMABLE_ATTACK_POTION: return "+x";
    default: return "?";
  }
}

function actionBorderColor(type: ActionType): string {
  switch (type) {
    case ActionType.MOVE: return "#A7D5BF";
    case ActionType.ATTACK: return "#C78989";
    case ActionType.CONSUMABLE_ATTACK_POTION: return "#CDAE79";
    default: return "#888";
  }
}

function describeAction(action: GameAction): string {
  switch (action.actionType) {
    case ActionType.MOVE:
      return "Moved";
    case ActionType.ATTACK:
    case ActionType.CONSUMABLE_ATTACK_POTION:
      return "Attacked";
    default:
      return "?";
  }
}

export function PlannedActions({
  myBeasts,
  enemyBeasts: _enemyBeasts,
  actions,
  actionHistory,
  onUndoLast,
  onClearAll,
}: PlannedActionsProps) {
  const aliveBeasts = myBeasts.filter((b) => b.alive);
  return (
    <VStack gap={1.5} align="stretch">
      {/* Planned actions list */}
      <Box p={0}>
        <VStack gap={0.5} align="stretch">
          {/* Actions in execution order (selection order) */}
          {actionHistory.map((idx) => {
            const beast = aliveBeasts.find((b) => Number(b.beast_index) === idx);
            if (!beast) return null;
            const action = actions.get(idx);
            if (!action) return null;
            const bType = Number(beast.beast_type) as BeastType;
            const color = getTypeColor(bType);
            const beastName =
              getSpeciesNameByTokenId(Number(beast.token_id)) || getSpeciesNameByTokenId(Number(beast.beast_id));

            return (
              <Flex
                key={idx}
                align="center"
                gap={1}
                px={1.5}
                py={1}
                bg="rgba(122, 163, 142, 0.1)"
                borderRadius="8px"
                borderLeft="3px solid"
                borderLeftColor={actionBorderColor(action.actionType)}
              >
                <Text
                  fontSize="xs"
                  color={color}
                  fontFamily="mono"
                  fontWeight="700"
                  minW="54px"
                  maxW="72px"
                  noOfLines={1}
                >
                  {beastName}
                </Text>
                <Text fontSize="xs" color="rgba(167,213,191,0.6)" fontFamily="mono" fontWeight="700" minW="16px">
                  {actionSymbol(action.actionType)}
                </Text>
                <Text fontSize="xs" color="#BFDCCB" fontFamily="mono" flex={1} noOfLines={1}>
                  {describeAction(action)}
                </Text>
              </Flex>
            );
          })}
          {/* Pending beasts without action */}
          {aliveBeasts
            .filter((b) => !actions.has(Number(b.beast_index)))
            .map((beast) => {
              const bType = Number(beast.beast_type) as BeastType;
              const color = getTypeColor(bType);
              const beastName =
                getSpeciesNameByTokenId(Number(beast.token_id)) || getSpeciesNameByTokenId(Number(beast.beast_id));

              return (
                <Flex
                  key={Number(beast.beast_index)}
                  align="center"
                  gap={1}
                  px={1.5}
                  py={1}
                  borderRadius="8px"
                >
                  <Text
                    fontSize="xs"
                    color={color}
                    fontFamily="mono"
                    fontWeight="700"
                    minW="54px"
                    maxW="72px"
                    noOfLines={1}
                  >
                    {beastName}
                  </Text>
                  <Box as="span" w="6px" h="6px" borderRadius="50%" bg="#8BB8A0" className="pending-dot" />
                </Flex>
              );
            })}
        </VStack>
      </Box>

      {/* Undo / Clear / Confirm buttons */}
      <HStack gap={1}>
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
    </VStack>
  );
}
