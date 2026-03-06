import { Box, Flex, Text, Badge, Progress } from "@chakra-ui/react";
import { BeastStateModel, BeastType, ActionType, GameAction } from "../domain/types";
import { getTypeColor, getTypeName } from "../domain/combat";

interface BeastHUDProps {
  beast: BeastStateModel;
  beastName?: string;
  isMine: boolean;
  isSelected?: boolean;
  plannedAction?: GameAction;
  onClick?: () => void;
}

function actionShortLabel(type: ActionType): string {
  switch (type) {
    case ActionType.WAIT: return "Wait";
    case ActionType.MOVE: return "Move";
    case ActionType.ATTACK: return "Attack";
    case ActionType.CONSUMABLE_ATTACK_POTION: return "Potion+Atk";
  }
}

export function BeastHUD({
  beast,
  beastName,
  isMine,
  isSelected,
  plannedAction,
  onClick,
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
      border="1px solid"
      borderColor={isSelected ? "green.400" : alive ? "surface.border" : "danger.700"}
      borderRadius="3px"
      p={2}
      opacity={alive ? 1 : 0.4}
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
    >
      <Flex justify="space-between" align="center" mb={1}>
        <Flex align="center" gap={1}>
          <Text
            fontSize="xs"
            fontWeight="600"
            color={alive ? typeColor : "text.muted"}
            fontFamily="heading"
            textTransform="uppercase"
          >
            {Number(beast.beast_index) + 1}.{" "}
            {beastName || typeName}
          </Text>
        </Flex>
        <Badge variant={badgeVariant} fontSize="7px">
          {typeName}
        </Badge>
      </Flex>

      {/* HP Bar */}
      <Box mb={1}>
        <Flex justify="space-between" mb="2px">
          <Text fontSize="7px" color="text.secondary" textTransform="uppercase">
            HP
          </Text>
          <Text fontSize="7px" color="text.gold" fontFamily="mono" fontWeight="700">
            {hp}/{hpMax}
          </Text>
        </Flex>
        <Progress
          value={hpPct}
          size="xs"
          variant={isMine ? "hp" : "hpEnemy"}
          borderRadius="2px"
        />
      </Box>

      {/* Stats row */}
      <Flex justify="space-between" gap={2}>
        <Flex direction="column" align="center">
          <Text fontSize="6px" color="text.secondary" textTransform="uppercase">
            LVL
          </Text>
          <Text fontSize="xs" color="text.gold" fontFamily="mono" fontWeight="700">
            {Number(beast.level)}
          </Text>
        </Flex>
        <Flex direction="column" align="center">
          <Text fontSize="6px" color="text.secondary" textTransform="uppercase">
            TIER
          </Text>
          <Text fontSize="xs" color="text.gold" fontFamily="mono" fontWeight="700">
            T{Number(beast.tier)}
          </Text>
        </Flex>
        <Flex direction="column" align="center">
          <Text fontSize="6px" color="text.secondary" textTransform="uppercase">
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
          border="1px solid rgba(255,215,0,0.25)"
          borderRadius="2px"
          px={2}
          py={0.5}
          textAlign="center"
        >
          <Text fontSize="7px" color="gold.400" fontWeight="700" fontFamily="mono" textTransform="uppercase">
            {actionShortLabel(plannedAction.actionType)}
          </Text>
        </Box>
      )}
    </Box>
  );
}
