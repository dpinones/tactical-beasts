import { Box, Flex, Text, Badge, Progress, Image } from "@chakra-ui/react";
import { BeastStateModel, BeastType, ActionType, GameAction } from "../domain/types";
import { getTypeColor, getTypeName } from "../domain/combat";
import { getBeastImagePath, getSpeciesNameByTokenId } from "../data/beasts";

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
  const speciesName = getSpeciesNameByTokenId(Number(beast.beast_id));

  const badgeVariant =
    bType === BeastType.Magical
      ? "magical"
      : bType === BeastType.Hunter
        ? "hunter"
        : "brute";

  return (
    <Box
      bg={isSelected ? "rgba(45,216,138,0.15)" : "rgba(0,0,0,0.3)"}
      border={isSelected ? "2px solid" : "1px solid"}
      borderColor={isSelected ? "#2dd88a" : alive ? "rgba(45,216,138,0.2)" : "rgba(220,60,60,0.4)"}
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
      {/* Beast portrait - prominent */}
      <Flex align="center" gap={3}>
        <Box position="relative" flexShrink={0}>
          <Image
            src={getBeastImagePath(Number(beast.beast_id))}
            alt={beastName || speciesName}
            w="64px"
            h="64px"
            objectFit="contain"
            borderRadius="6px"
            border="2px solid"
            borderColor={isSelected ? "#2dd88a" : typeColor}
            bg="rgba(0,0,0,0.4)"
            filter={alive ? "none" : "grayscale(1)"}
            fallback={
              <Flex w="64px" h="64px" align="center" justify="center" bg="rgba(0,0,0,0.4)" borderRadius="6px" border="2px solid" borderColor={typeColor} flexShrink={0}>
                <Text fontSize="xl" color={typeColor} fontWeight="bold">{speciesName[0]}</Text>
              </Flex>
            }
          />
          {!alive && (
            <Flex
              position="absolute"
              top={0} left={0} right={0} bottom={0}
              align="center" justify="center"
              bg="rgba(0,0,0,0.5)"
              borderRadius="6px"
            >
              <Text fontSize="xs" color="#FF4444" fontWeight="800" fontFamily="mono">KO</Text>
            </Flex>
          )}
        </Box>

        <Box flex={1} minW={0}>
          {/* Name + Badge */}
          <Flex justify="space-between" align="center" mb={1}>
            <Text
              fontSize="sm"
              fontWeight="700"
              color={alive ? "#fff" : "rgba(255,255,255,0.4)"}
              fontFamily="heading"
              textTransform="uppercase"
              noOfLines={1}
            >
              {speciesName}
            </Text>
            <Badge variant={badgeVariant} fontSize="9px">
              {typeName}
            </Badge>
          </Flex>

          {/* HP Bar */}
          <Box mb={1}>
            <Flex justify="space-between" mb="2px">
              <Text fontSize="9px" color="#8BFFC4" fontFamily="mono" textTransform="uppercase" opacity={0.7}>
                HP
              </Text>
              <Text fontSize="xs" color="#fff" fontFamily="mono" fontWeight="700">
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
              <Text fontSize="8px" color="#8BFFC4" textTransform="uppercase" opacity={0.6}>
                LVL
              </Text>
              <Text fontSize="xs" color="#fff" fontFamily="mono" fontWeight="700">
                {Number(beast.level)}
              </Text>
            </Flex>
            <Flex direction="column" align="center">
              <Text fontSize="8px" color="#8BFFC4" textTransform="uppercase" opacity={0.6}>
                TIER
              </Text>
              <Text fontSize="xs" color="#fff" fontFamily="mono" fontWeight="700">
                T{Number(beast.tier)}
              </Text>
            </Flex>
            <Flex direction="column" align="center">
              <Text fontSize="8px" color="#8BFFC4" textTransform="uppercase" opacity={0.6}>
                LIVES
              </Text>
              <Text
                fontSize="xs"
                fontFamily="mono"
                fontWeight="700"
                color={extraLives > 0 ? "#2dd88a" : "rgba(255,255,255,0.3)"}
              >
                {extraLives}
              </Text>
            </Flex>
          </Flex>
        </Box>

        {/* Wait button */}
        {onWait && alive && (
          <Box
            as="button"
            bg="rgba(45,216,138,0.15)"
            border="1px solid rgba(45,216,138,0.3)"
            borderRadius="3px"
            px={1.5}
            py={1}
            fontSize="9px"
            fontWeight="700"
            fontFamily="mono"
            color="#8BFFC4"
            cursor="pointer"
            flexShrink={0}
            _hover={{ bg: "rgba(45,216,138,0.3)" }}
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              onWait();
            }}
          >
            WAIT
          </Box>
        )}
      </Flex>

      {plannedAction && alive && (
        <Box
          mt={1.5}
          bg="rgba(45,216,138,0.1)"
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
