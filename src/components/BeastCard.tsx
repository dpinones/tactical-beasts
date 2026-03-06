import { Box, Flex, Text, Badge } from "@chakra-ui/react";
import { CatalogBeast, BeastType } from "../domain/types";
import { getTypeColor } from "../domain/combat";

interface BeastCardProps {
  beast: CatalogBeast;
  isSelected: boolean;
  onToggle: (tokenId: number) => void;
  disabled?: boolean;
}

function tierLabel(tier: number): string {
  const labels: Record<number, string> = {
    1: "T1",
    2: "T2",
    3: "T3",
    4: "T4",
    5: "T5",
  };
  return labels[tier] || `T${tier}`;
}

function tierName(tier: number): string {
  const names: Record<number, string> = {
    1: "Legendary",
    2: "Epic",
    3: "Rare",
    4: "Uncommon",
    5: "Common",
  };
  return names[tier] || "Unknown";
}

export function BeastCard({ beast, isSelected, onToggle, disabled }: BeastCardProps) {
  const typeColor = getTypeColor(beast.type);
  const badgeVariant =
    beast.type === BeastType.Magical
      ? "magical"
      : beast.type === BeastType.Hunter
        ? "hunter"
        : "brute";

  return (
    <Box
      bg={isSelected ? "rgba(0, 255, 68, 0.12)" : "surface.panel"}
      border="1px solid"
      borderColor={isSelected ? "green.400" : "surface.border"}
      borderRadius="3px"
      p={3}
      cursor={disabled ? "not-allowed" : "pointer"}
      opacity={disabled ? 0.5 : 1}
      onClick={() => !disabled && onToggle(beast.tokenId)}
      transition="all 0.15s ease"
      _hover={
        !disabled
          ? {
              borderColor: isSelected ? "green.400" : "surface.borderLight",
              bg: isSelected
                ? "rgba(0, 255, 68, 0.15)"
                : "surface.hover",
            }
          : undefined
      }
      boxShadow={isSelected ? "glow" : "none"}
      w="100%"
      maxW="220px"
    >
      {/* Header */}
      <Flex justify="space-between" align="center" mb={2}>
        <Text
          fontSize="xs"
          fontWeight="600"
          color={isSelected ? "green.300" : "text.primary"}
          noOfLines={1}
          fontFamily="heading"
          textTransform="uppercase"
          letterSpacing="0.05em"
        >
          {beast.beast}
        </Text>
        <Badge variant={badgeVariant}>{beast.typeName}</Badge>
      </Flex>

      {/* Name with prefix/suffix */}
      {(beast.prefix || beast.suffix) && (
        <Text fontSize="xs" color="text.secondary" noOfLines={1} mb={2}>
          "{beast.prefix} {beast.suffix}"
        </Text>
      )}

      {/* Stats grid */}
      <Flex direction="column" gap={1}>
        <Flex justify="space-between">
          <Text variant="label">Tier</Text>
          <Text fontSize="xs" color="text.gold" fontFamily="mono" fontWeight="700">
            {tierLabel(beast.tier)} {tierName(beast.tier)}
          </Text>
        </Flex>
        <Flex justify="space-between">
          <Text variant="label">Level</Text>
          <Text fontSize="xs" color="text.gold" fontFamily="mono" fontWeight="700">
            {beast.level}
          </Text>
        </Flex>
        <Flex justify="space-between">
          <Text variant="label">HP</Text>
          <Text fontSize="xs" color="text.gold" fontFamily="mono" fontWeight="700">
            {beast.health}
          </Text>
        </Flex>
        <Flex justify="space-between">
          <Text variant="label">Power</Text>
          <Text fontSize="xs" fontFamily="mono" fontWeight="700" color={typeColor}>
            {beast.power}
          </Text>
        </Flex>
      </Flex>

      {/* Selection indicator */}
      {isSelected && (
        <Flex
          justify="center"
          mt={2}
          pt={2}
          borderTop="1px solid"
          borderColor="green.700"
        >
          <Text fontSize="xs" color="green.300" fontWeight="600" textTransform="uppercase">
            Selected
          </Text>
        </Flex>
      )}
    </Box>
  );
}
