import { Box, Flex, Text, Badge, Progress, Image } from "@chakra-ui/react";
import { BeastStateModel, BeastType, ActionType, GameAction } from "../domain/types";
import { getTypeName } from "../domain/combat";
import { getBeastImagePath, getSpeciesNameByTokenId, getSubclass, getSubclassName, getPassiveInfo } from "../data/beasts";

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
    case ActionType.MOVE: return "-> Move";
    case ActionType.ATTACK: return "x Attack";
    case ActionType.CONSUMABLE_ATTACK_POTION: return "+x Potion+Atk";
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
}: BeastHUDProps) {
  const hp = Number(beast.hp);
  const hpMax = Number(beast.hp_max);
  const hpPct = hpMax > 0 ? (hp / hpMax) * 100 : 0;
  const alive = Boolean(beast.alive);
  const bType = Number(beast.beast_type) as BeastType;
  const typeName = getTypeName(bType);
  const beastId = Number(beast.beast_id);
  const tokenId = Number(beast.token_id);
  const speciesName = getSpeciesNameByTokenId(tokenId) || getSpeciesNameByTokenId(beastId);
  const subclass = getSubclass(beastId);
  const subclassName = getSubclassName(subclass);
  const passive = getPassiveInfo(subclass);
  const passiveColor = "#B8E6DB";
  const passiveBorderColor = "rgba(184, 230, 219, 0.72)";
  const passiveBg = "rgba(184, 230, 219, 0.12)";
  const accentSoft = isMine ? "#A7D5BF" : "#D9B1B1";
  const cardBg = isSelected
    ? (isMine ? "rgba(55,110,88,0.25)" : "rgba(110,65,65,0.25)")
    : (isMine ? "rgba(12,30,24,0.64)" : "rgba(28,14,14,0.62)");
  const selectedBorder = isMine ? "#4C9B7D" : "#A66161";
  const borderAlive = isMine ? "rgba(82,146,120,0.45)" : "rgba(150,84,84,0.45)";
  const hoverBorder = isMine ? "rgba(120,180,150,0.8)" : "rgba(185,120,120,0.8)";
  const portraitBorder = isSelected
    ? selectedBorder
    : (isMine ? "rgba(180,210,195,0.45)" : "rgba(215,170,170,0.45)");
  const badgeVariant =
    bType === BeastType.Magical
      ? "magical"
      : bType === BeastType.Hunter
        ? "hunter"
        : "brute";

  return (
    <Box
      bg={cardBg}
      border={isSelected ? "2px solid" : "1px solid"}
      borderColor={isSelected ? selectedBorder : alive ? borderAlive : "rgba(220,60,60,0.4)"}
      borderRadius="10px"
      p={1.5}
      opacity={alive ? 1 : 0.35}
      cursor={onClick ? "pointer" : "default"}
      onClick={onClick}
      transition="all 0.15s"
      _hover={
        onClick
          ? { borderColor: isSelected ? selectedBorder : hoverBorder }
          : undefined
      }
      boxShadow={isSelected ? "glow" : "none"}
      minW="156px"
      position="relative"
      className={isSelected ? "beast-selected-glow" : !alive ? "beast-ko" : undefined}
    >
      {/* Beast portrait - prominent */}
      <Flex align="center" gap={2}>
        <Box position="relative" flexShrink={0}>
          <Image
            src={getBeastImagePath(Number(beast.beast_id), isMine ? "right" : "left")}
            alt={beastName || speciesName}
            w="56px"
            h="56px"
            objectFit="contain"
            borderRadius="8px"
            border="2px solid"
            borderColor={portraitBorder}
            bg="rgba(0,0,0,0.4)"
            filter={alive ? "none" : "grayscale(1)"}
            fallback={
              <Flex w="56px" h="56px" align="center" justify="center" bg="rgba(0,0,0,0.4)" borderRadius="8px" border="2px solid" borderColor="rgba(232, 224, 208, 0.45)" flexShrink={0}>
                <Text fontSize="xl" color="#E8E0D0" fontWeight="bold">{speciesName[0]}</Text>
              </Flex>
            }
          />
          {!alive && (
            <Flex
              position="absolute"
              top={0} left={0} right={0} bottom={0}
              align="center" justify="center"
              bg="rgba(0,0,0,0.5)"
              borderRadius="8px"
            >
              <Text fontSize="xs" color="#D59A9A" fontWeight="800" fontFamily="mono">KO</Text>
            </Flex>
          )}
        </Box>

        <Box flex={1} minW={0}>
          {/* Name + Type */}
          <Flex justify="space-between" align="center" mb={0.5}>
            <Text
              fontSize="xs"
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

          {/* Subclass + Token ID */}
          <Text fontSize="9px" color={accentSoft} fontFamily="mono" opacity={0.7} mb={0.5} noOfLines={1}>
            {subclassName}#{tokenId}
          </Text>

          {/* HP Bar */}
          <Box mb={0.5}>
            <Flex justify="space-between" mb="1px">
              <Text fontSize="9px" color={accentSoft} fontFamily="mono" textTransform="uppercase" opacity={0.7}>
                HP
              </Text>
              <Text fontSize="xs" color="#fff" fontFamily="mono" fontWeight="700">
                {hp}/{hpMax}
              </Text>
            </Flex>
            <Progress
              value={hpPct}
              size="sm"
              variant={hpVariant(hpPct, isMine)}
              borderRadius="6px"
            />
          </Box>

          {/* Stats row */}
          <Flex justify="flex-start" gap={3}>
            <Flex direction="column" align="flex-start">
              <Text fontSize="8px" color={accentSoft} textTransform="uppercase" opacity={0.6}>
                LVL
              </Text>
              <Text fontSize="xs" color="#fff" fontFamily="mono" fontWeight="700">
                {Number(beast.level)}
              </Text>
            </Flex>
            <Flex direction="column" align="flex-start">
              <Text fontSize="8px" color={accentSoft} textTransform="uppercase" opacity={0.6}>
                TIER
              </Text>
              <Text fontSize="xs" color="#fff" fontFamily="mono" fontWeight="700">
                T{Number(beast.tier)}
              </Text>
            </Flex>
          </Flex>
        </Box>
      </Flex>

      {/* Passive info - full row to use left-side free space */}
      <Flex
        mt={1}
        px={1.5}
        py={0.6}
        borderRadius="8px"
        border="1px solid"
        borderColor={passiveBorderColor}
        bg={passiveBg}
        opacity={1}
        align="center"
        gap={1}
      >
        <Text
          fontSize="9px"
          color={passiveColor}
          fontFamily="mono"
          opacity={0.92}
          lineHeight={1.2}
        >
          {passive.description}
        </Text>
      </Flex>

      {alive && (
        <Box
          mt={1}
          minH="18px"
          bg={plannedAction ? "rgba(45,216,138,0.1)" : "transparent"}
          border="1px solid"
          borderColor={plannedAction ? actionColor(plannedAction.actionType) : "transparent"}
          borderRadius="6px"
          px={1.5}
          py={0.5}
          textAlign="center"
          boxShadow={
            plannedAction?.actionType === ActionType.CONSUMABLE_ATTACK_POTION
              ? "glowGold"
              : "none"
          }
          visibility={plannedAction ? "visible" : "hidden"}
        >
          {plannedAction && (
            <Text
              fontSize="10px"
              color={actionColor(plannedAction.actionType)}
              fontWeight="700"
              fontFamily="mono"
              textTransform="uppercase"
            >
              {actionShortLabel(plannedAction.actionType)}
            </Text>
          )}
        </Box>
      )}
    </Box>
  );
}
