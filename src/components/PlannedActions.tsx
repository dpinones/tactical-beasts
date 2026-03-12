import { Box, Button, Flex, Text, VStack, HStack, Image } from "@chakra-ui/react";
import { BeastStateModel, BeastType, ActionType, GameAction } from "../domain/types";
import { getTypeColor } from "../domain/combat";
import { getSpeciesNameByTokenId, getBeastImagePath } from "../data/beasts";

interface PlannedActionsProps {
  myBeasts: BeastStateModel[];
  enemyBeasts: BeastStateModel[];
  actions: Map<number, GameAction>;
  actionHistory: number[];
  onUndoLast: () => void;
  onClearAll: () => void;
}

function actionLabel(type: ActionType): string {
  switch (type) {
    case ActionType.MOVE: return "MOVE";
    case ActionType.ATTACK: return "ATK";
    case ActionType.CONSUMABLE_ATTACK_POTION: return "ATK+";
    default: return "?";
  }
}

function actionColor(type: ActionType): string {
  switch (type) {
    case ActionType.MOVE: return "#A7D5BF";
    case ActionType.ATTACK: return "#C78989";
    case ActionType.CONSUMABLE_ATTACK_POTION: return "#CDAE79";
    default: return "#888";
  }
}

function getBeastName(beast: BeastStateModel): string {
  return getSpeciesNameByTokenId(Number(beast.token_id)) || getSpeciesNameByTokenId(Number(beast.beast_id)) || "???";
}

export function PlannedActions({
  myBeasts,
  enemyBeasts,
  actions,
  actionHistory,
  onUndoLast,
  onClearAll,
}: PlannedActionsProps) {
  const aliveBeasts = myBeasts.filter((b) => b.alive);
  return (
    <VStack gap={1.5} align="stretch">
      <Box p={0}>
        <VStack gap={1} align="stretch">
          {/* Actions in execution order */}
          {actionHistory.map((idx) => {
            const beast = aliveBeasts.find((b) => Number(b.beast_index) === idx);
            if (!beast) return null;
            const action = actions.get(idx);
            if (!action) return null;
            const isAttack = action.actionType === ActionType.ATTACK || action.actionType === ActionType.CONSUMABLE_ATTACK_POTION;
            const targetBeast = isAttack
              ? enemyBeasts.find((b) => Number(b.beast_index) === action.targetIndex)
              : null;

            return (
              <Flex
                key={idx}
                align="center"
                gap={1.5}
                px={1.5}
                py={1}
                bg="rgba(122, 163, 142, 0.1)"
                borderRadius="8px"
                borderLeft="3px solid"
                borderLeftColor={actionColor(action.actionType)}
              >
                {/* My beast avatar + name */}
                <Flex align="center" gap={1} minW="0" flex={1}>
                  <Image
                    src={getBeastImagePath(Number(beast.beast_id))}
                    w="24px"
                    h="24px"
                    objectFit="contain"
                    flexShrink={0}
                  />
                  <Text
                    fontSize="10px"
                    color={getTypeColor(Number(beast.beast_type) as BeastType)}
                    fontFamily="mono"
                    fontWeight="700"
                    noOfLines={1}
                  >
                    {getBeastName(beast)}
                  </Text>
                </Flex>

                {/* Action label */}
                <Text
                  fontSize="9px"
                  fontFamily="mono"
                  fontWeight="800"
                  color={actionColor(action.actionType)}
                  bg="rgba(0,0,0,0.3)"
                  px={1.5}
                  py={0.5}
                  borderRadius="4px"
                  flexShrink={0}
                >
                  {actionLabel(action.actionType)}
                </Text>

                {/* Target beast (for attacks) */}
                {isAttack && targetBeast && (
                  <Flex align="center" gap={1} minW="0" flex={1}>
                    <Image
                      src={getBeastImagePath(Number(targetBeast.beast_id), "left")}
                      w="24px"
                      h="24px"
                      objectFit="contain"
                      flexShrink={0}
                    />
                    <Text
                      fontSize="10px"
                      color={getTypeColor(Number(targetBeast.beast_type) as BeastType)}
                      fontFamily="mono"
                      fontWeight="700"
                      noOfLines={1}
                    >
                      {getBeastName(targetBeast)}
                    </Text>
                  </Flex>
                )}

                {/* Move destination */}
                {action.actionType === ActionType.MOVE && (
                  <Text fontSize="10px" color="rgba(167,213,191,0.5)" fontFamily="mono" flex={1}>
                    ({action.targetRow},{action.targetCol})
                  </Text>
                )}
              </Flex>
            );
          })}

          {/* Pending beasts without action */}
          {aliveBeasts
            .filter((b) => !actions.has(Number(b.beast_index)))
            .map((beast) => (
              <Flex
                key={Number(beast.beast_index)}
                align="center"
                gap={1}
                px={1.5}
                py={1}
                borderRadius="8px"
                opacity={0.5}
              >
                <Image
                  src={getBeastImagePath(Number(beast.beast_id))}
                  w="24px"
                  h="24px"
                  objectFit="contain"
                  flexShrink={0}
                />
                <Text
                  fontSize="10px"
                  color={getTypeColor(Number(beast.beast_type) as BeastType)}
                  fontFamily="mono"
                  fontWeight="700"
                  noOfLines={1}
                >
                  {getBeastName(beast)}
                </Text>
                <Box as="span" w="6px" h="6px" borderRadius="50%" bg="#8BB8A0" className="pending-dot" ml="auto" />
              </Flex>
            ))}
        </VStack>
      </Box>

      {/* Undo / Clear buttons */}
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
