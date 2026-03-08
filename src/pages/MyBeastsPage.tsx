import {
  Box,
  Flex,
  Heading,
  Text,
  SimpleGrid,
  Badge,
  Button,
  HStack,
  Image,
  Input,
  Skeleton,
} from "@chakra-ui/react";
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useOwnedBeasts } from "../hooks/useOwnedBeasts";
import type { OwnedBeast } from "../api/beastsApi";
import { getSubclass, getSubclassName } from "../data/beasts";

type TypeFilter = "all" | "Magic" | "Hunter" | "Brute";
type TierFilter = "all" | 2 | 3 | 4;
type SortKey = "power" | "level" | "health" | "name";
type ImageMode = "beast" | "nft";

function beastImagePath(name: string, mode: ImageMode) {
  if (mode === "nft") return `/nfts/static/regular/${name.toLowerCase()}.png`;
  return `/beasts/${name.toLowerCase()}.png`;
}

function fullName(b: OwnedBeast) {
  const parts = [b.prefix, b.suffix].filter(Boolean);
  const nameStr = parts.length > 0 ? `"${parts.join(" ")}" ` : "";
  return `${nameStr}${b.name}`;
}

function sortBeasts(beasts: OwnedBeast[], key: SortKey): OwnedBeast[] {
  return [...beasts].sort((a, b) => {
    switch (key) {
      case "power":
        return b.power - a.power;
      case "level":
        return b.level - a.level;
      case "health":
        return b.health - a.health;
      case "name":
        return a.name.localeCompare(b.name);
    }
  });
}

function badgeVariant(type: string): "magical" | "hunter" | "brute" {
  if (type === "Magic") return "magical";
  return type.toLowerCase() as "hunter" | "brute";
}

export function MyBeastsPage() {
  const navigate = useNavigate();
  const { beasts, isLoading, error, refetch } = useOwnedBeasts();

  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [tierFilter, setTierFilter] = useState<TierFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("power");
  const [imageMode, setImageMode] = useState<ImageMode>("beast");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    let result = beasts;

    if (typeFilter !== "all") {
      result = result.filter((b) => b.type === typeFilter);
    }
    if (tierFilter !== "all") {
      result = result.filter((b) => b.tier === tierFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (b) =>
          b.name.toLowerCase().includes(q) ||
          b.prefix?.toLowerCase().includes(q) ||
          b.suffix?.toLowerCase().includes(q)
      );
    }

    return sortBeasts(result, sortKey);
  }, [beasts, typeFilter, tierFilter, sortKey, search]);

  return (
    <Flex direction="column" minH="100vh" p={6} maxW="1100px" mx="auto">
      {/* Header */}
      <Flex justify="space-between" align="center" mb={6}>
        <Flex align="baseline" gap={3}>
          <Heading
            size="lg"
            fontFamily="heading"
            color="green.300"
            textTransform="uppercase"
            letterSpacing="0.08em"
          >
            My Beasts
          </Heading>
          {!isLoading && !error && (
            <Text fontSize="sm" color="text.secondary">
              {beasts.length} owned
            </Text>
          )}
        </Flex>
        <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
          Back
        </Button>
      </Flex>

      {/* Filters */}
      <Flex direction="column" gap={3} mb={5}>
        {/* Type + Tier */}
        <Flex gap={4} wrap="wrap" align="center">
          <HStack gap={1}>
            {(["all", "Magic", "Hunter", "Brute"] as TypeFilter[]).map((t) => (
              <Button
                key={t}
                size="sm"
                variant={typeFilter === t ? "primary" : "secondary"}
                onClick={() => setTypeFilter(t)}
              >
                {t === "all" ? "All" : t === "Magic" ? "Magical" : t}
              </Button>
            ))}
          </HStack>

          <HStack gap={1}>
            {(["all", 2, 3, 4] as TierFilter[]).map((t) => (
              <Button
                key={String(t)}
                size="xs"
                variant={tierFilter === t ? "primary" : "secondary"}
                onClick={() => setTierFilter(t)}
              >
                {t === "all" ? "All" : `T${t}`}
              </Button>
            ))}
          </HStack>
        </Flex>

        {/* Sort + Search */}
        <Flex gap={3} wrap="wrap" align="center">
          <HStack gap={1}>
            {(
              [
                ["power", "Power"],
                ["level", "Level"],
                ["health", "HP"],
                ["name", "Name"],
              ] as [SortKey, string][]
            ).map(([key, label]) => (
              <Button
                key={key}
                size="xs"
                variant={sortKey === key ? "gold" : "secondary"}
                onClick={() => setSortKey(key)}
              >
                {label}
              </Button>
            ))}
          </HStack>

          <Input
            size="sm"
            placeholder="Search by name..."
            maxW="220px"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <Button
            size="xs"
            variant={imageMode === "nft" ? "primary" : "secondary"}
            onClick={() =>
              setImageMode((m) => (m === "beast" ? "nft" : "beast"))
            }
          >
            {imageMode === "nft" ? "NFT" : "Beast"}
          </Button>
        </Flex>
      </Flex>

      {/* Content */}
      {isLoading ? (
        <SimpleGrid columns={{ base: 2, sm: 3, md: 4 }} gap={3}>
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton
              key={i}
              height="260px"
              borderRadius="12px"
              startColor="surface.panel"
              endColor="surface.overlay"
            />
          ))}
        </SimpleGrid>
      ) : error ? (
        <Flex
          direction="column"
          align="center"
          justify="center"
          py={16}
          gap={4}
        >
          <Text color="danger.300">Failed to load beasts</Text>
          <Text fontSize="xs" color="text.muted">
            {error.message}
          </Text>
          <Button size="sm" variant="primary" onClick={() => refetch()}>
            Retry
          </Button>
        </Flex>
      ) : beasts.length === 0 ? (
        <Flex
          direction="column"
          align="center"
          justify="center"
          py={16}
          gap={3}
        >
          <Text color="text.secondary" fontSize="md">
            No beasts found
          </Text>
          <Text fontSize="xs" color="text.muted" textAlign="center" maxW="300px">
            Play Loot Survivor to earn beast NFTs, then bring them here for
            tactical combat.
          </Text>
        </Flex>
      ) : filtered.length === 0 ? (
        <Flex align="center" justify="center" py={16}>
          <Text color="text.muted">No beasts match your filters</Text>
        </Flex>
      ) : (
        <SimpleGrid columns={{ base: 2, sm: 3, md: 4 }} gap={3}>
          {filtered.map((beast) => (
            <BeastCard key={beast.token_id} beast={beast} imageMode={imageMode} />
          ))}
        </SimpleGrid>
      )}
    </Flex>
  );
}

function BeastCard({ beast, imageMode }: { beast: OwnedBeast; imageMode: ImageMode }) {
  return (
    <Box
      bg="surface.card"
      border="1px solid"
      borderColor="surface.border"
      borderRadius="12px"
      overflow="hidden"
      transition="border-color 0.2s, box-shadow 0.2s"
      _hover={{
        borderColor: "surface.borderLight",
        boxShadow: "0 8px 18px rgba(0, 0, 0, 0.32), 0 0 0 1px rgba(135, 180, 155, 0.2)",
      }}
    >
      {/* Image */}
      <Box position="relative" bg="surface.panel">
        <Image
          src={beastImagePath(beast.name, imageMode)}
          alt={beast.name}
          w="100%"
          h="140px"
          objectFit="contain"
          p={2}
          loading="lazy"
          fallback={
            <Flex
              w="100%"
              h="140px"
              align="center"
              justify="center"
              bg="surface.panel"
            >
              <Text fontSize="2xl" color="text.muted">
                ?
              </Text>
            </Flex>
          }
        />
        {/* Shiny / Animated indicators */}
        {(beast.shiny || beast.animated) && (
          <HStack position="absolute" top={1} right={1} gap={1}>
            {beast.shiny && (
              <Badge fontSize="9px" bg="gold.400" color="black" px={1}>
                SHINY
              </Badge>
            )}
            {beast.animated && (
              <Badge fontSize="9px" bg="green.400" color="black" px={1}>
                ANIM
              </Badge>
            )}
          </HStack>
        )}
      </Box>

      {/* Info */}
      <Box p={2.5}>
        <Text
          fontSize="xs"
          fontWeight="700"
          color="text.primary"
          mb={1}
          noOfLines={1}
          title={fullName(beast)}
        >
          {fullName(beast)}
        </Text>

        <Flex align="center" gap={2} mb={1}>
          <Badge variant={badgeVariant(beast.type)}>
            {beast.type === "Magic" ? "Magical" : beast.type}
          </Badge>
          <Text fontSize="xs" color="text.secondary">
            T{beast.tier}
          </Text>
        </Flex>

        <Flex justify="space-between" align="center" mb={2}>
          <Text fontSize="9px" color="text.secondary" textTransform="uppercase" letterSpacing="0.08em">
            {getSubclassName(getSubclass(beast.id))}
          </Text>
          <Text fontSize="8px" color="text.muted" fontFamily="mono">
            #{beast.token_id}
          </Text>
        </Flex>

        <Flex justify="space-between" mb={1}>
          <Text fontSize="xs" color="text.secondary">
            Lv
          </Text>
          <Text fontSize="xs" color="text.gold" fontFamily="mono">
            {beast.level}
          </Text>
        </Flex>

        <Flex justify="space-between" mb={1}>
          <Text fontSize="xs" color="text.secondary">
            Power
          </Text>
          <Text fontSize="xs" color="text.gold" fontFamily="mono">
            {beast.power}
          </Text>
        </Flex>

        <Flex justify="space-between" mb={1}>
          <Text fontSize="xs" color="text.secondary">
            HP
          </Text>
          <Text fontSize="xs" color="text.gold" fontFamily="mono">
            {beast.health}
          </Text>
        </Flex>

        {beast.adventurers_killed > 0 && (
          <Flex justify="space-between">
            <Text fontSize="xs" color="text.secondary">
              Kills
            </Text>
            <Text fontSize="xs" color="danger.300" fontFamily="mono">
              {beast.adventurers_killed}
            </Text>
          </Flex>
        )}
      </Box>
    </Box>
  );
}
