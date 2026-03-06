import {
  Box,
  Flex,
  Heading,
  Text,
  SimpleGrid,
  Badge,
  Button,
  HStack,
} from "@chakra-ui/react";
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { loadBeastCatalog } from "../data/beasts";
import { BeastType } from "../domain/types";

type TypeFilter = "all" | "Magical" | "Hunter" | "Brute";

const TYPE_MAP: Record<string, BeastType> = {
  Magical: BeastType.Magical,
  Hunter: BeastType.Hunter,
  Brute: BeastType.Brute,
};

export function MyBeastsPage() {
  const navigate = useNavigate();
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");

  const allBeasts = useMemo(() => loadBeastCatalog(), []);

  const filtered =
    typeFilter === "all"
      ? allBeasts
      : allBeasts.filter((b) => b.type === TYPE_MAP[typeFilter]);

  return (
    <Flex direction="column" minH="100vh" p={6} maxW="1000px" mx="auto">
      {/* Header */}
      <Flex justify="space-between" align="center" mb={6}>
        <Heading
          size="lg"
          fontFamily="heading"
          color="green.300"
          textTransform="uppercase"
          letterSpacing="0.08em"
        >
          My Beasts
        </Heading>
        <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
          Back
        </Button>
      </Flex>

      {/* Filters */}
      <HStack gap={2} mb={4}>
        {(["all", "Magical", "Hunter", "Brute"] as TypeFilter[]).map((t) => (
          <Button
            key={t}
            size="sm"
            variant={typeFilter === t ? "primary" : "secondary"}
            onClick={() => setTypeFilter(t)}
          >
            {t === "all" ? "All" : t}
          </Button>
        ))}
      </HStack>

      {/* Beast grid */}
      <SimpleGrid columns={{ base: 2, sm: 3, md: 4, lg: 5 }} gap={3}>
        {filtered.map((beast) => {
          const owned = false; // TODO: check NFT ownership
          return (
            <Box
              key={beast.tokenId}
              bg={owned ? "surface.card" : "surface.panel"}
              border="1px solid"
              borderColor={owned ? "surface.borderLight" : "surface.border"}
              borderRadius="3px"
              p={3}
              opacity={owned ? 1 : 0.4}
              transition="opacity 0.2s"
              _hover={{ opacity: 1 }}
            >
              <Text
                fontSize="xs"
                fontWeight="600"
                color={owned ? "text.primary" : "text.muted"}
                mb={1}
                isTruncated
              >
                {beast.name || beast.beast}
              </Text>
              <Badge
                variant={beast.typeName.toLowerCase() as "magical" | "hunter" | "brute"}
                mb={1}
              >
                {beast.typeName}
              </Badge>
              <Text fontSize="xs" color="text.secondary">
                T{beast.tier} / Lv {beast.level}
              </Text>
              <Text fontSize="xs" color="text.gold" fontFamily="mono">
                HP {beast.health}
              </Text>
            </Box>
          );
        })}
      </SimpleGrid>
    </Flex>
  );
}
