import { Box, Flex, Text, Badge, Progress, Image } from "@chakra-ui/react";
import { BeastStateModel, BeastType, ActionType, GameAction } from "../domain/types";
import { getTypeColor, getTypeName } from "../domain/combat";
import { getBeastImagePath } from "../data/beasts";

interface BeastHUDProps {
  beast: BeastStateModel;
  beastName?: string;
  isMine: boolean;
  isSelected?: boolean;
  plannedAction?: GameAction;
  onClick?: () => void;
  onWait?: () => void;
}

function actionShortLabel(type: ActionType): string {
  switch (type) {
    case ActionType.WAIT: return "|| Wait";
    case ActionType.MOVE: return "-> Move";
    case ActionType.ATTACK: return "x Attack";
    case ActionType.CONSUMABLE_ATTACK_POTION: return "+x Potion+Atk";
  }
}

function actionColor(type: ActionType): string {
  switch (type) {
    case ActionType.MOVE: return "#33FF66";
    case ActionType.ATTACK: return "#E84040";
    case ActionType.WAIT: return "#FFD700";
    case ActionType.CONSUMABLE_ATTACK_POTION: return "#FFE033";
  }
}

function hpVariant(hpPct: number, isMine: boolean): string {
  if (!isMine) return "hpEnemy";
  if (hpPct > 60) return "hp";
  if (hpPct > 30) return "hpWarning";
  return "hpEnemy";
}

export function BeastHUD({
  beast,
  beastName,
  isMine,
  isSelected,
  plannedAction,
  onClick,
  onWait,
}: BeastHUDProps) {
  const hp = Number(beast.hp);
  const hpMax = Number(beast.hp_max);
  const hpPct = hpMax > 0 ? (hp / hpMax) * 100 : 0;
  const alive = Boolean(beast.alive);
  const extraLives = Number(beast.extra_lives);
  const bType = Number(beast.beast_type) as BeastType;
  const typeColor = getTypeColor(bType);
  const typeName = getTypeName(bType);

  const badgeVariant =
    bType === BeastType.Magical
      ? "magical"
      : bType === BeastType.Hunter
        ? "hunter"
        : "brute";

  return (
    <Box
      bg={isSelected ? "rgba(0,255,68,0.1)" : "surface.panel"}
      border={isSelected ? "2px solid" : "1px solid"}
      borderColor={isSelected ? "green.400" : alive ? "surface.border" : "danger.700"}
      borderRadius="3px"
      p={2}
      opacity={alive ? 1 : 0.35}
      cursor={onClick ? "pointer" : "default"}
      onClick={onClick}
      transition="all 0.15s"
      _hover={
        onClick
          ? { borderColor: isSelected ? "green.400" : "surface.borderLight" }
          : undefined
      }
      boxShadow={isSelected ? "glow" : "none"}
      minW="140px"
      position="relative"
      className={isSelected ? "beast-selected-glow" : !alive ? "beast-ko" : undefined}
    >
      {onWait && alive && (
        <Box
          as="button"
          position="absolute"
          top="6px"
          right="6px"
          bg="rgba(255,215,0,0.15)"
          border="1px solid rgba(255,215,0,0.3)"
          borderRadius="3px"
          px={2}
          py={1}
          fontSize="9px"
          fontWeight="700"
          fontFamily="mono"
          color="gold.400"
          cursor="pointer"
          zIndex={1}
          _hover={{ bg: "rgba(255,215,0,0.3)" }}
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation();
            onWait();
          }}
        >
          WAIT
        </Box>
      )}
      <Flex gap={2} mb={1}>
        {/* Beast portrait */}
        <Image
          src={getBeastImagePath(Number(beast.beast_id))}
          alt={beastName || typeName}
          w="52px"
          h="52px"
          objectFit="contain"
          borderRadius="4px"
          borderTop="2px solid"
          borderTopColor={typeColor}
          border="1px solid"
          borderColor={isMine ? "rgba(0,255,68,0.2)" : "rgba(232,64,64,0.2)"}
          bg="surface.card"
          flexShrink={0}
          fallback={
            <Flex w="52px" h="52px" align="center" justify="center" bg="surface.card" borderRadius="4px" border="1px solid" borderColor="surface.border" borderTop="2px solid" borderTopColor={typeColor} flexShrink={0}>
              <Text fontSize="md" color={typeColor} fontWeight="bold">{typeName[0]}</Text>
            </Flex>
          }
        />
        <Box flex={1} minW={0}>
          <Flex justify="space-between" align="center" mb={1}>
            <Text
              fontSize="sm"
              fontWeight="600"
              color={alive ? typeColor : "text.muted"}
              fontFamily="heading"
              textTransform="uppercase"
              noOfLines={1}
            >
              {Number(beast.beast_index) + 1}.{" "}
              {beastName || typeName}
            </Text>
            <Badge variant={badgeVariant} fontSize="xs">
              {typeName}
            </Badge>
          </Flex>

          {/* HP Bar */}
          <Box mb={1}>
            <Flex justify="space-between" mb="2px">
              <Text fontSize="xs" color="text.secondary" textTransform="uppercase">
                HP
              </Text>
              <Text fontSize="xs" color="text.gold" fontFamily="mono" fontWeight="700">
                {hp}/{hpMax}
              </Text>
            </Flex>
            <Progress
              value={hpPct}
              size="xs"
              variant={hpVariant(hpPct, isMine)}
              borderRadius="2px"
            />
          </Box>

          {/* Stats row */}
          <Flex justify="space-between" gap={2}>
            <Flex direction="column" align="center">
              <Text fontSize="8px" color="text.secondary" textTransform="uppercase">
                LVL
              </Text>
              <Text fontSize="xs" color="text.gold" fontFamily="mono" fontWeight="700">
                {Number(beast.level)}
              </Text>
            </Flex>
            <Flex direction="column" align="center">
              <Text fontSize="8px" color="text.secondary" textTransform="uppercase">
                TIER
              </Text>
              <Text fontSize="xs" color="text.gold" fontFamily="mono" fontWeight="700">
                T{Number(beast.tier)}
              </Text>
            </Flex>
            <Flex direction="column" align="center">
              <Text fontSize="8px" color="text.secondary" textTransform="uppercase">
                LIVES
              </Text>
              <Text
                fontSize="xs"
                fontFamily="mono"
                fontWeight="700"
                color={extraLives > 0 ? "gold.400" : "text.muted"}
              >
                {extraLives}
              </Text>
            </Flex>
          </Flex>
        </Box>
      </Flex>

      {!alive && (
        <Text
          fontSize="xs"
          color="danger.300"
          textAlign="center"
          mt={1}
          fontWeight="600"
          textTransform="uppercase"
        >
          KO
        </Text>
      )}

      {plannedAction && alive && (
        <Box
          mt={1}
          bg="rgba(255,215,0,0.1)"
          border="1px solid"
          borderColor={actionColor(plannedAction.actionType)}
          borderRadius="2px"
          px={2}
          py={0.5}
          textAlign="center"
          boxShadow={plannedAction.actionType === ActionType.CONSUMABLE_ATTACK_POTION ? "glowGold" : "none"}
        >
          <Text fontSize="xs" color={actionColor(plannedAction.actionType)} fontWeight="700" fontFamily="mono" textTransform="uppercase">
            {actionShortLabel(plannedAction.actionType)}
          </Text>
        </Box>
      )}
    </Box>
  );
}
