import { useState } from "react";
import {
  Box,
  Flex,
  Text,
  VStack,
  HStack,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalCloseButton,
  ModalBody,
  Image,
} from "@chakra-ui/react";
import { keyframes } from "@emotion/react";
import { motion, AnimatePresence } from "framer-motion";
import { create } from "zustand";
import { playClick } from "../stores/audioStore";

const MotionBox = motion(Box);

// =============================================================================
// Global store — open/close from anywhere
// =============================================================================

interface HowToStore {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

export const useHowToStore = create<HowToStore>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  toggle: () => set((s) => ({ isOpen: !s.isOpen })),
}));

// =============================================================================
// Trigger button — place this anywhere to open the guide
// =============================================================================

export function HowToButton() {
  const { toggle } = useHowToStore();

  return (
    <Box
      as="button"
      onClick={() => { playClick(); toggle(); }}
      position="relative"
      w="40px"
      h="40px"
      display="flex"
      alignItems="center"
      justifyContent="center"
      bg="rgba(18,30,18,0.85)"
      border="1px solid"
      borderColor="surface.border"
      borderRadius="10px"
      color="text.secondary"
      fontSize="16px"
      cursor="pointer"
      _hover={{ borderColor: "green.400", color: "green.300" }}
      transition="all 0.2s"
      title="Field Manual"
      mr={2}
    >
      <Text
        fontFamily="heading"
        fontSize="16px"
        fontWeight="700"
        lineHeight="1"
        mt="-1px"
      >
        ?
      </Text>
    </Box>
  );
}

// =============================================================================
// Section definitions
// =============================================================================

type SectionId =
  | "overview"
  | "triangle"
  | "damage"
  | "counter"
  | "subclasses"
  | "board"
  | "turns"
  | "team"
  | "ranking";

interface NavItem {
  id: SectionId;
  label: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: "overview", label: "Overview", icon: "I" },
  { id: "triangle", label: "Combat", icon: "II" },
  { id: "damage", label: "Damage", icon: "III" },
  { id: "counter", label: "Counter", icon: "IV" },
  { id: "subclasses", label: "Classes", icon: "V" },
  { id: "board", label: "Board", icon: "VI" },
  { id: "turns", label: "Turns", icon: "VII" },
  { id: "team", label: "Team", icon: "VIII" },
  { id: "ranking", label: "Ranking", icon: "IX" },
];

// =============================================================================
// Animations
// =============================================================================

const runeGlow = keyframes`
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.7; }
`;

const scanline = keyframes`
  0% { transform: translateY(-100%); }
  100% { transform: translateY(100vh); }
`;

// =============================================================================
// Ornamental components
// =============================================================================

function SectionDivider() {
  return (
    <Flex align="center" gap={3} my={5} px={2}>
      <Box flex={1} h="1px" bg="linear-gradient(90deg, transparent, #4D6D5B 40%, #87B49B 50%, #4D6D5B 60%, transparent)" />
      <Box w="6px" h="6px" transform="rotate(45deg)" bg="#87B49B" opacity={0.5} />
      <Box flex={1} h="1px" bg="linear-gradient(90deg, transparent, #4D6D5B 40%, #87B49B 50%, #4D6D5B 60%, transparent)" />
    </Flex>
  );
}

function Rune({ char, color = "#87B49B" }: { char: string; color?: string }) {
  return (
    <Box
      as="span"
      fontFamily="heading"
      fontSize="lg"
      color={color}
      opacity={0.6}
      animation={`${runeGlow} 4s ease-in-out infinite`}
      textShadow={`0 0 12px ${color}44`}
      userSelect="none"
    >
      {char}
    </Box>
  );
}

function StatBlock({ label, value, color = "#D8B880" }: { label: string; value: string; color?: string }) {
  return (
    <Box textAlign="center" minW="60px">
      <Text fontFamily="mono" fontSize="sm" fontWeight="700" color={color} lineHeight="1">
        {value}
      </Text>
      <Text fontSize="11px" color="text.muted" textTransform="uppercase" letterSpacing="0.12em" mt="2px">
        {label}
      </Text>
    </Box>
  );
}

// =============================================================================
// Section: Overview
// =============================================================================

function OverviewSection() {
  return (
    <VStack align="stretch" gap={4}>
      <Text fontSize="sm" color="text.secondary" lineHeight="1.7">
        PvP 1v1 tactical combat on a hex grid. Build a team of 3 beast NFTs from
        the Loot Survivor ecosystem and outmaneuver your opponent with positioning,
        type advantages, and subclass abilities.
      </Text>

      <Box
        bg="rgba(15, 23, 20, 0.7)"
        border="1px solid"
        borderColor="#4D6D5B"
        borderRadius="12px"
        p={4}
        position="relative"
        overflow="hidden"
      >
        <Box
          position="absolute" top={0} right={0} w="120px" h="120px"
          bg="radial-gradient(circle, rgba(135,180,155,0.06) 0%, transparent 70%)"
          pointerEvents="none"
        />
        <Text fontSize="12px" color="#87B49B" textTransform="uppercase" letterSpacing="0.15em" fontWeight="700" mb={3}>
          Match Flow
        </Text>
        {[
          { step: "01", title: "Queue or Invite", desc: "Ranked matchmaking or challenge a friend" },
          { step: "02", title: "Select Team", desc: "Pick 3 beasts in 30 seconds" },
          { step: "03", title: "Coin Flip", desc: "Determines who goes first" },
          { step: "04", title: "Battle", desc: "Plan all actions, then execute together" },
          { step: "05", title: "Victory", desc: "Eliminate all 3 enemy beasts to win" },
        ].map((item, i) => (
          <Flex key={i} align="flex-start" gap={3} mb={i < 4 ? 3 : 0}>
            <Text
              fontFamily="mono"
              fontSize="11px"
              color="#4D6D5B"
              fontWeight="700"
              minW="20px"
              mt="1px"
            >
              {item.step}
            </Text>
            <Box flex={1}>
              <Text fontSize="sm" fontWeight="600" color="text.primary" lineHeight="1.2">
                {item.title}
              </Text>
              <Text fontSize="12px" color="text.muted" mt="1px">
                {item.desc}
              </Text>
            </Box>
            {i < 4 && (
              <Box position="absolute" left="30px" mt="18px" w="1px" h="12px" bg="#365043" />
            )}
          </Flex>
        ))}
      </Box>

      <Flex gap={3}>
        <InfoChip label="Grid" value="49 hexes" />
        <InfoChip label="Obstacles" value="6 random" />
        <InfoChip label="Team" value="3 beasts" />
      </Flex>
    </VStack>
  );
}

function InfoChip({ label, value }: { label: string; value: string }) {
  return (
    <Box
      flex={1}
      bg="rgba(28, 45, 37, 0.5)"
      border="1px solid #365043"
      borderRadius="8px"
      p={2}
      textAlign="center"
    >
      <Text fontFamily="mono" fontSize="sm" fontWeight="700" color="#A7D5BF">
        {value}
      </Text>
      <Text fontSize="12px" color="text.muted" textTransform="uppercase" letterSpacing="0.1em" mt="1px">
        {label}
      </Text>
    </Box>
  );
}

// =============================================================================
// Section: Combat Triangle
// =============================================================================

function CombatTriangleSection() {
  return (
    <VStack align="stretch" gap={4}>
      <Text fontSize="sm" color="text.secondary" lineHeight="1.7">
        Inherited from Death Mountain. Each beast type has a natural advantage against
        one type and a disadvantage against another.
      </Text>

      {/* Triangle diagram */}
      <Box
        position="relative"
        w="100%"
        h="220px"
        bg="rgba(15, 23, 20, 0.5)"
        borderRadius="12px"
        border="1px solid #365043"
        overflow="hidden"
      >
        {/* Background grid pattern */}
        <Box
          position="absolute" inset={0} opacity={0.04}
          backgroundImage="radial-gradient(circle, #87B49B 1px, transparent 1px)"
          backgroundSize="20px 20px"
        />

        {/* MAGICAL node - top center */}
        <TriangleNode
          name="Magical"
          color="#A7D5BF"
          borderColor="#6D9A82"
          bgColor="rgba(135, 180, 155, 0.12)"
          top="18px"
          left="50%"
          transform="translateX(-50%)"
          beastImg="warlock"
        />

        {/* BRUTE node - bottom left */}
        <TriangleNode
          name="Brute"
          color="#C78989"
          borderColor="#9A6262"
          bgColor="rgba(199, 137, 137, 0.12)"
          bottom="18px"
          left="15%"
          beastImg="yeti"
        />

        {/* HUNTER node - bottom right */}
        <TriangleNode
          name="Hunter"
          color="#DEC398"
          borderColor="#A67C49"
          bgColor="rgba(189, 145, 84, 0.12)"
          bottom="18px"
          right="15%"
          beastImg="jaguar"
        />

        {/* SVG arrows */}
        <Box as="svg" position="absolute" inset={0} w="100%" h="100%" pointerEvents="none">
          {/* Magical → Brute (strong) */}
          <ArrowLine x1="42%" y1="38%" x2="28%" y2="65%" color="#A7D5BF" />
          {/* Brute → Hunter (strong) */}
          <ArrowLine x1="38%" y1="82%" x2="62%" y2="82%" color="#C78989" />
          {/* Hunter → Magical (strong) */}
          <ArrowLine x1="72%" y1="65%" x2="58%" y2="38%" color="#DEC398" />
        </Box>
      </Box>

      {/* Modifier cards */}
      <Flex gap={3}>
        <Box flex={1} bg="rgba(135, 180, 155, 0.08)" border="1px solid #365043" borderRadius="10px" p={3} textAlign="center">
          <Text fontFamily="mono" fontSize="md" fontWeight="800" color="#A7D5BF">+50%</Text>
          <Text fontSize="11px" color="text.muted" textTransform="uppercase" letterSpacing="0.1em" mt={1}>
            Strong vs
          </Text>
        </Box>
        <Box flex={1} bg="rgba(199, 137, 137, 0.08)" border="1px solid #4D3028" borderRadius="10px" p={3} textAlign="center">
          <Text fontFamily="mono" fontSize="md" fontWeight="800" color="#C78989">-50%</Text>
          <Text fontSize="11px" color="text.muted" textTransform="uppercase" letterSpacing="0.1em" mt={1}>
            Weak vs
          </Text>
        </Box>
        <Box flex={1} bg="rgba(154, 169, 155, 0.06)" border="1px solid #365043" borderRadius="10px" p={3} textAlign="center">
          <Text fontFamily="mono" fontSize="md" fontWeight="800" color="#9AA99B">0%</Text>
          <Text fontSize="11px" color="text.muted" textTransform="uppercase" letterSpacing="0.1em" mt={1}>
            Same type
          </Text>
        </Box>
      </Flex>
    </VStack>
  );
}

function TriangleNode({
  name, color, borderColor, bgColor, beastImg, ...posProps
}: {
  name: string; color: string; borderColor: string; bgColor: string; beastImg: string;
  top?: string; bottom?: string; left?: string; right?: string; transform?: string;
}) {
  return (
    <VStack
      position="absolute"
      gap={1}
      zIndex={2}
      {...posProps}
    >
      <Box
        w="52px" h="52px"
        borderRadius="full"
        bg={bgColor}
        border="2px solid"
        borderColor={borderColor}
        overflow="hidden"
        display="flex"
        alignItems="center"
        justifyContent="center"
        boxShadow={`0 0 20px ${color}22`}
      >
        <Image
          src={`/beasts/${beastImg}.png`}
          alt={name}
          w="42px" h="42px"
          objectFit="contain"
          filter={`drop-shadow(0 0 4px ${color}44)`}
        />
      </Box>
      <Text
        fontSize="12px"
        fontWeight="700"
        color={color}
        textTransform="uppercase"
        letterSpacing="0.1em"
        textShadow={`0 0 8px ${color}44`}
      >
        {name}
      </Text>
    </VStack>
  );
}

function ArrowLine({ x1, y1, x2, y2, color }: { x1: string; y1: string; x2: string; y2: string; color: string }) {
  return (
    <line
      x1={x1} y1={y1} x2={x2} y2={y2}
      stroke={color}
      strokeWidth="1.5"
      strokeDasharray="4 3"
      opacity={0.5}
    />
  );
}

// =============================================================================
// Section: Damage Formula
// =============================================================================

function DamageSection() {
  return (
    <VStack align="stretch" gap={4}>
      {/* Main formula */}
      <Box
        bg="rgba(15, 23, 20, 0.7)"
        border="1px solid"
        borderColor="#4D6D5B"
        borderRadius="12px"
        p={4}
        textAlign="center"
        position="relative"
        overflow="hidden"
      >
        <Box
          position="absolute" inset={0}
          bg="linear-gradient(135deg, rgba(135,180,155,0.03) 0%, transparent 50%, rgba(216,184,128,0.03) 100%)"
          pointerEvents="none"
        />
        <Text fontSize="11px" color="text.muted" textTransform="uppercase" letterSpacing="0.15em" mb={2}>
          Base Damage
        </Text>
        <Flex align="center" justify="center" gap={2}>
          <Text fontFamily="mono" fontSize="lg" fontWeight="800" color="#D8B880">
            Level
          </Text>
          <Text fontFamily="heading" fontSize="xl" color="#4D6D5B" fontWeight="300">
            x
          </Text>
          <Text fontFamily="mono" fontSize="lg" fontWeight="800" color="#D8B880">
            (6 - Tier)
          </Text>
        </Flex>
        <Text fontSize="12px" color="text.muted" mt={2}>
          From Death Mountain combat rules
        </Text>
      </Box>

      {/* Tier multiplier table */}
      <Box
        bg="rgba(15, 23, 20, 0.5)"
        border="1px solid #365043"
        borderRadius="12px"
        overflow="hidden"
      >
        <Box px={3} py={2} borderBottom="1px solid #365043">
          <Text fontSize="11px" color="#87B49B" textTransform="uppercase" letterSpacing="0.12em" fontWeight="700">
            Tier Multipliers
          </Text>
        </Box>
        {[
          { tier: "T2", mult: "x4", example: "40", color: "#DEC398", bar: 80 },
          { tier: "T3", mult: "x3", example: "30", color: "#9AA99B", bar: 60 },
          { tier: "T4", mult: "x2", example: "20", color: "#6F7F72", bar: 40 },
        ].map((row) => (
          <Flex key={row.tier} align="center" px={3} py={2} borderBottom="1px solid #24372E" gap={3}>
            <Text fontFamily="mono" fontSize="sm" fontWeight="700" color={row.color} minW="24px">
              {row.tier}
            </Text>
            <Text fontFamily="mono" fontSize="sm" color="text.secondary" minW="24px">
              {row.mult}
            </Text>
            <Box flex={1} h="4px" bg="#0D1512" borderRadius="2px" overflow="hidden">
              <Box h="100%" w={`${row.bar}%`} bg={`linear-gradient(90deg, ${row.color}66, ${row.color})`} borderRadius="2px" />
            </Box>
            <Text fontFamily="mono" fontSize="12px" color="text.muted" minW="36px" textAlign="right">
              Lv10={row.example}
            </Text>
          </Flex>
        ))}
      </Box>

      {/* Modifiers stack */}
      <Box
        bg="rgba(15, 23, 20, 0.5)"
        border="1px solid #365043"
        borderRadius="12px"
        overflow="hidden"
      >
        <Box px={3} py={2} borderBottom="1px solid #365043">
          <Text fontSize="11px" color="#87B49B" textTransform="uppercase" letterSpacing="0.12em" fontWeight="700">
            Modifiers (applied in order)
          </Text>
        </Box>
        {[
          { order: "1", name: "Type Advantage", effect: "x1.5 or x0.5", color: "#A7D5BF" },
          { order: "2", name: "Attack Potion", effect: "x1.1 (one per game)", color: "#DEC398" },
          { order: "3", name: "Critical Hit", effect: "x2 (luck % chance)", color: "#C78989" },
          { order: "4", name: "Subclass Passive", effect: "Varies by class", color: "#B5C8D8" },
        ].map((mod) => (
          <Flex key={mod.order} align="center" px={3} py={2} borderBottom="1px solid #1A2D24" gap={3}>
            <Box
              w="18px" h="18px" borderRadius="full"
              bg={`${mod.color}11`}
              border="1px solid"
              borderColor={`${mod.color}44`}
              display="flex" alignItems="center" justifyContent="center"
            >
              <Text fontFamily="mono" fontSize="12px" color={mod.color} fontWeight="700">
                {mod.order}
              </Text>
            </Box>
            <Text fontSize="sm" color="text.primary" flex={1} fontWeight="500">
              {mod.name}
            </Text>
            <Text fontFamily="mono" fontSize="12px" color={mod.color}>
              {mod.effect}
            </Text>
          </Flex>
        ))}
      </Box>

      <Flex
        align="center"
        gap={2}
        bg="rgba(199, 137, 137, 0.06)"
        border="1px solid #432525"
        borderRadius="8px"
        px={3} py={2}
      >
        <Text fontSize="sm" color="#C78989" fontWeight="600">Min damage:</Text>
        <Text fontFamily="mono" fontSize="sm" color="#C78989" fontWeight="700">2</Text>
        <Text fontSize="12px" color="text.muted" ml={1}>always guaranteed</Text>
      </Flex>
    </VStack>
  );
}

// =============================================================================
// Section: Counter-Attack
// =============================================================================

function CounterSection() {
  return (
    <VStack align="stretch" gap={4}>
      <Text fontSize="sm" color="text.secondary" lineHeight="1.7">
        When you attack an enemy beast and it survives, it automatically
        counter-attacks your beast.
      </Text>

      {/* Visual diagram */}
      <Box
        bg="rgba(15, 23, 20, 0.7)"
        border="1px solid #4D6D5B"
        borderRadius="12px"
        p={4}
        position="relative"
        overflow="hidden"
      >
        <Box
          position="absolute" inset={0} opacity={0.03}
          backgroundImage="repeating-linear-gradient(0deg, #87B49B 0px, transparent 1px, transparent 24px)"
          pointerEvents="none"
        />

        <Flex align="center" justify="space-between" mb={4}>
          <VStack gap={1}>
            <Box
              w="44px" h="44px" borderRadius="10px"
              bg="rgba(135, 180, 155, 0.1)" border="1px solid #6D9A82"
              display="flex" alignItems="center" justifyContent="center"
            >
              <Text fontSize="xl">&#x2694;</Text>
            </Box>
            <Text fontSize="11px" color="#A7D5BF" textTransform="uppercase" letterSpacing="0.1em">
              Attacker
            </Text>
          </VStack>

          <VStack gap={0} flex={1} mx={3}>
            <Flex align="center" w="100%">
              <Box flex={1} h="1px" bg="linear-gradient(90deg, #A7D5BF, #4D6D5B)" />
              <Text fontSize="12px" color="#A7D5BF" mx={1} fontFamily="mono" fontWeight="700">100%</Text>
              <Text fontSize="12px" color="#4D6D5B" mr={1}>&#x25B6;</Text>
            </Flex>
            <Flex align="center" w="100%" mt={1}>
              <Text fontSize="12px" color="#4D6D5B" ml={1}>&#x25C0;</Text>
              <Text fontSize="12px" color="#C78989" mx={1} fontFamily="mono" fontWeight="700">20%</Text>
              <Box flex={1} h="1px" bg="linear-gradient(90deg, #4D6D5B, #C78989)" />
            </Flex>
          </VStack>

          <VStack gap={1}>
            <Box
              w="44px" h="44px" borderRadius="10px"
              bg="rgba(199, 137, 137, 0.1)" border="1px solid #9A6262"
              display="flex" alignItems="center" justifyContent="center"
            >
              <Text fontSize="xl">&#x1F6E1;</Text>
            </Box>
            <Text fontSize="11px" color="#C78989" textTransform="uppercase" letterSpacing="0.1em">
              Defender
            </Text>
          </VStack>
        </Flex>

        <Box h="1px" bg="#365043" mb={3} />

        <VStack align="stretch" gap={2}>
          <Flex align="center" gap={2}>
            <Box w="4px" h="4px" borderRadius="full" bg="#A7D5BF" />
            <Text fontSize="12px" color="text.secondary">
              Counter deals <Text as="span" color="#D8B880" fontFamily="mono" fontWeight="700">20%</Text> of defender's normal damage
            </Text>
          </Flex>
          <Flex align="center" gap={2}>
            <Box w="4px" h="4px" borderRadius="full" bg="#A7D5BF" />
            <Text fontSize="12px" color="text.secondary">
              Includes type advantage but <Text as="span" color="#C78989" fontWeight="600">no potion bonus</Text>
            </Text>
          </Flex>
          <Flex align="center" gap={2}>
            <Box w="4px" h="4px" borderRadius="full" bg="#C78989" />
            <Text fontSize="12px" color="text.secondary">
              <Text as="span" color="#C78989" fontWeight="600">Can kill</Text> your attacker
            </Text>
          </Flex>
        </VStack>
      </Box>
    </VStack>
  );
}

// =============================================================================
// Section: Subclasses
// =============================================================================

const SUBCLASS_DATA = [
  {
    type: "Magical",
    typeColor: "#A7D5BF",
    typeBorder: "#6D9A82",
    typeBg: "rgba(135, 180, 155, 0.06)",
    classes: [
      { name: "Warlock", role: "Glass Cannon", move: 2, range: 3, passive: "Siphon", passiveDesc: "Heals 15% of damage dealt", passiveColor: "#9EBCAD", beast: "chimera" },
      { name: "Enchanter", role: "Support", move: 2, range: 2, passive: "Regen", passiveDesc: "+8% max HP at creation", passiveColor: "#A7D5BF", beast: "goblin" },
    ],
  },
  {
    type: "Hunter",
    typeColor: "#DEC398",
    typeBorder: "#A67C49",
    typeBg: "rgba(189, 145, 84, 0.06)",
    classes: [
      { name: "Stalker", role: "Assassin", move: 3, range: 1, passive: "1st Strike", passiveDesc: "+15% vs full HP targets", passiveColor: "#CDAE79", beast: "phoenix" },
      { name: "Ranger", role: "Sniper", move: 2, range: 4, passive: "Exposed", passiveDesc: "+30% damage taken if adjacent", passiveColor: "#D1A071", beast: "jaguar" },
    ],
  },
  {
    type: "Brute",
    typeColor: "#E0B6B6",
    typeBorder: "#9A6262",
    typeBg: "rgba(199, 137, 137, 0.06)",
    classes: [
      { name: "Juggernaut", role: "Tank", move: 2, range: 1, passive: "Fortify", passiveDesc: "-10% dmg if didn't move", passiveColor: "#8BAE9C", beast: "yeti" },
      { name: "Berserker", role: "Bruiser", move: 2, range: 1, passive: "Rage", passiveDesc: "+12% dmg below 50% HP", passiveColor: "#C78989", beast: "ogre" },
    ],
  },
];

function SubclassesSection() {
  return (
    <VStack align="stretch" gap={4}>
      <Text fontSize="sm" color="text.secondary" lineHeight="1.7">
        Each beast type splits into 2 subclasses with unique movement, range, and
        passive abilities.
      </Text>

      {SUBCLASS_DATA.map((type) => (
        <Box key={type.type}>
          {/* Type header */}
          <Flex align="center" gap={2} mb={2}>
            <Box w="8px" h="2px" bg={type.typeColor} borderRadius="1px" />
            <Text
              fontSize="12px"
              color={type.typeColor}
              textTransform="uppercase"
              letterSpacing="0.15em"
              fontWeight="700"
            >
              {type.type}
            </Text>
            <Box flex={1} h="1px" bg={`${type.typeColor}22`} />
          </Flex>

          <VStack gap={2}>
            {type.classes.map((cls) => (
              <Box
                key={cls.name}
                bg={type.typeBg}
                border="1px solid"
                borderColor={`${type.typeBorder}55`}
                borderRadius="10px"
                p={3}
                w="100%"
                position="relative"
                overflow="hidden"
              >
                {/* Beast image watermark */}
                <Box
                  position="absolute"
                  right="-8px" bottom="-8px"
                  w="70px" h="70px"
                  opacity={0.12}
                  pointerEvents="none"
                >
                  <Image
                    src={`/beasts/${cls.beast}.png`}
                    alt=""
                    w="100%" h="100%"
                    objectFit="contain"
                  />
                </Box>

                <Flex justify="space-between" align="flex-start" mb={2}>
                  <Box>
                    <Text fontSize="sm" fontWeight="700" color={type.typeColor} fontFamily="heading" letterSpacing="0.05em">
                      {cls.name}
                    </Text>
                    <Text fontSize="11px" color="text.muted" textTransform="uppercase" letterSpacing="0.1em">
                      {cls.role}
                    </Text>
                  </Box>
                  <HStack gap={3}>
                    <StatBlock label="Move" value={String(cls.move)} color={cls.move === 3 ? "#A7D5BF" : "#9AA99B"} />
                    <StatBlock label="Range" value={String(cls.range)} color={cls.range >= 3 ? "#D8B880" : "#9AA99B"} />
                  </HStack>
                </Flex>

                {/* Passive */}
                <Flex
                  align="center"
                  gap={2}
                  bg="rgba(15, 23, 20, 0.5)"
                  borderRadius="6px"
                  px={2} py={1.5}
                  border="1px solid"
                  borderColor={`${cls.passiveColor}22`}
                >
                  <Box w="6px" h="6px" borderRadius="full" bg={cls.passiveColor} opacity={0.7}
                    boxShadow={`0 0 6px ${cls.passiveColor}66`}
                  />
                  <Text fontSize="12px" color={cls.passiveColor} fontWeight="600">
                    {cls.passive}
                  </Text>
                  <Text fontSize="12px" color="text.muted">
                    {cls.passiveDesc}
                  </Text>
                </Flex>
              </Box>
            ))}
          </VStack>
        </Box>
      ))}

      <SectionDivider />

      {/* Tactical tips */}
      <Box
        bg="rgba(15, 23, 20, 0.5)"
        border="1px solid #365043"
        borderRadius="10px"
        p={3}
      >
        <Text fontSize="11px" color="#87B49B" textTransform="uppercase" letterSpacing="0.12em" fontWeight="700" mb={2}>
          Tactical Notes
        </Text>
        <VStack align="stretch" gap={2}>
          {[
            { cls: "Stalker", tip: "Only class with 3 movement. Closes gaps fast and punishes fresh targets.", color: "#CDAE79" },
            { cls: "Ranger", tip: "Longest range (4) but Exposed makes it fragile at close range. Keep distance.", color: "#D1A071" },
            { cls: "Warlock", tip: "Sustains through Siphon but has low HP. Hit hard and heal back.", color: "#9EBCAD" },
            { cls: "Juggernaut", tip: "Rewards holding ground. Move into position and stay put.", color: "#8BAE9C" },
            { cls: "Berserker", tip: "Gets stronger as it takes damage. Dangerous to leave alive at low HP.", color: "#C78989" },
          ].map((note) => (
            <Flex key={note.cls} align="flex-start" gap={2}>
              <Text fontSize="12px" color={note.color} fontWeight="700" minW="64px">
                {note.cls}
              </Text>
              <Text fontSize="12px" color="text.muted" flex={1}>
                {note.tip}
              </Text>
            </Flex>
          ))}
        </VStack>
      </Box>
    </VStack>
  );
}

// =============================================================================
// Section: Board
// =============================================================================

function BoardSection() {
  // Mini hex grid representation: rows [6, 7, 8, 7, 8, 7, 6]
  const rows = [6, 7, 8, 7, 8, 7, 6];

  return (
    <VStack align="stretch" gap={4}>
      <Text fontSize="sm" color="text.secondary" lineHeight="1.7">
        The battlefield is a hex grid with 7 rows and 49 total cells.
        6 obstacles are randomly placed each match.
      </Text>

      {/* Mini hex grid preview */}
      <Box
        bg="rgba(15, 23, 20, 0.7)"
        border="1px solid #4D6D5B"
        borderRadius="12px"
        p={4}
        position="relative"
        overflow="hidden"
      >
        <Flex direction="column" align="center" gap="2px">
          {rows.map((cols, rowIdx) => (
            <Flex
              key={rowIdx}
              gap="3px"
              justify="center"
              ml={rowIdx % 2 === 1 ? "10px" : "0"}
            >
              {Array.from({ length: cols }).map((_, colIdx) => {
                const isP1Spawn = rowIdx >= 2 && rowIdx <= 4 && colIdx <= 1;
                const isP2Spawn = rowIdx >= 2 && rowIdx <= 4 && colIdx >= cols - 2;
                const isObstacle = (rowIdx === 1 && colIdx === 3) || (rowIdx === 5 && colIdx === 4);
                return (
                  <Box
                    key={colIdx}
                    w="16px" h="14px"
                    bg={
                      isObstacle ? "rgba(79, 44, 44, 0.4)"
                      : isP1Spawn ? "rgba(135, 180, 155, 0.15)"
                      : isP2Spawn ? "rgba(199, 137, 137, 0.15)"
                      : "rgba(28, 45, 37, 0.3)"
                    }
                    border="1px solid"
                    borderColor={
                      isObstacle ? "#6B3A3A"
                      : isP1Spawn ? "#4D6D5B"
                      : isP2Spawn ? "#6B4D4D"
                      : "#2B4538"
                    }
                    borderRadius="3px"
                    transition="all 0.2s"
                  />
                );
              })}
            </Flex>
          ))}
        </Flex>

        {/* Labels */}
        <Flex justify="space-between" mt={3} px={2}>
          <Flex align="center" gap={1}>
            <Box w="8px" h="8px" bg="rgba(135, 180, 155, 0.15)" border="1px solid #4D6D5B" borderRadius="2px" />
            <Text fontSize="12px" color="#A7D5BF" textTransform="uppercase" letterSpacing="0.05em">P1 Spawn</Text>
          </Flex>
          <Flex align="center" gap={1}>
            <Box w="8px" h="8px" bg="rgba(79, 44, 44, 0.4)" border="1px solid #6B3A3A" borderRadius="2px" />
            <Text fontSize="12px" color="#C78989" textTransform="uppercase" letterSpacing="0.05em">Obstacle</Text>
          </Flex>
          <Flex align="center" gap={1}>
            <Box w="8px" h="8px" bg="rgba(199, 137, 137, 0.15)" border="1px solid #6B4D4D" borderRadius="2px" />
            <Text fontSize="12px" color="#E0B6B6" textTransform="uppercase" letterSpacing="0.05em">P2 Spawn</Text>
          </Flex>
        </Flex>
      </Box>

      {/* Grid specs */}
      <Flex gap={3}>
        {[
          { label: "Rows", value: "7", detail: "[6-7-8-7-8-7-6]" },
          { label: "Cells", value: "49", detail: "Total hexes" },
          { label: "Obstacles", value: "6", detail: "Random per match" },
        ].map((spec) => (
          <Box
            key={spec.label}
            flex={1}
            bg="rgba(28, 45, 37, 0.5)"
            border="1px solid #365043"
            borderRadius="8px"
            p={2}
            textAlign="center"
          >
            <Text fontFamily="mono" fontSize="sm" fontWeight="700" color="#A7D5BF">
              {spec.value}
            </Text>
            <Text fontSize="12px" color="text.muted" textTransform="uppercase" letterSpacing="0.08em">
              {spec.label}
            </Text>
            <Text fontSize="12px" color="text.muted" mt="1px">
              {spec.detail}
            </Text>
          </Box>
        ))}
      </Flex>

      <Text fontSize="12px" color="text.muted" lineHeight="1.6">
        Movement uses hex distance with offset-to-cube conversion.
        Player 1 always spawns on the left side, Player 2 on the right.
      </Text>
    </VStack>
  );
}

// =============================================================================
// Section: Turns
// =============================================================================

function TurnsSection() {
  return (
    <VStack align="stretch" gap={4}>
      <Text fontSize="sm" color="text.secondary" lineHeight="1.7">
        This is NOT alternating single-beast actions. Each turn, you plan
        actions for ALL your beasts, then they all execute together.
      </Text>

      {/* Turn flow diagram */}
      <Box
        bg="rgba(15, 23, 20, 0.7)"
        border="1px solid #4D6D5B"
        borderRadius="12px"
        p={4}
      >
        {[
          { step: "1", title: "Plan Actions", desc: "Assign one action to each beast: Move, Attack, or Skip", color: "#A7D5BF", icon: "&#x1F4CB;" },
          { step: "2", title: "Confirm Turn", desc: "Lock in all actions at once", color: "#D8B880", icon: "&#x2714;" },
          { step: "3", title: "Execute", desc: "All your beasts' actions resolve simultaneously", color: "#87B49B", icon: "&#x26A1;" },
          { step: "4", title: "Opponent's Turn", desc: "They plan and execute their turn the same way", color: "#9AA99B", icon: "&#x1F504;" },
        ].map((item, i) => (
          <Box key={i}>
            <Flex align="center" gap={3}>
              <Box
                w="28px" h="28px" borderRadius="8px"
                bg={`${item.color}11`}
                border="1px solid"
                borderColor={`${item.color}44`}
                display="flex" alignItems="center" justifyContent="center"
                flexShrink={0}
              >
                <Text fontFamily="mono" fontSize="12px" color={item.color} fontWeight="700">
                  {item.step}
                </Text>
              </Box>
              <Box flex={1}>
                <Text fontSize="sm" fontWeight="600" color={item.color}>
                  {item.title}
                </Text>
                <Text fontSize="12px" color="text.muted">
                  {item.desc}
                </Text>
              </Box>
            </Flex>
            {i < 3 && (
              <Box ml="13px" w="1px" h="12px" bg="#365043" my="2px" />
            )}
          </Box>
        ))}
      </Box>

      {/* Actions reference */}
      <Flex gap={3}>
        {[
          { action: "Move", desc: "Reposition on the grid", color: "#A7D5BF" },
          { action: "Attack", desc: "Strike an enemy in range", color: "#C78989" },
          { action: "Skip", desc: "Hold position (Fortify!)", color: "#9AA99B" },
        ].map((a) => (
          <Box
            key={a.action}
            flex={1}
            bg="rgba(28, 45, 37, 0.4)"
            border="1px solid #365043"
            borderRadius="8px"
            p={2}
            textAlign="center"
          >
            <Text fontFamily="mono" fontSize="sm" fontWeight="700" color={a.color}>
              {a.action}
            </Text>
            <Text fontSize="12px" color="text.muted" mt="2px">
              {a.desc}
            </Text>
          </Box>
        ))}
      </Flex>

      <Box
        bg="rgba(216, 184, 128, 0.06)"
        border="1px solid rgba(166, 124, 73, 0.3)"
        borderRadius="8px"
        px={3} py={2}
      >
        <Text fontSize="12px" color="#D8B880" fontWeight="600">
          Tip: Skipping with a Juggernaut activates Fortify (-10% damage taken next turn).
        </Text>
      </Box>
    </VStack>
  );
}

// =============================================================================
// Section: Team Building
// =============================================================================

function TeamSection() {
  return (
    <VStack align="stretch" gap={4}>
      <Text fontSize="sm" color="text.secondary" lineHeight="1.7">
        Build your team wisely. Tier restrictions keep matches balanced,
        and the 30-second timer adds pressure.
      </Text>

      {/* Tier restrictions */}
      <Box
        bg="rgba(15, 23, 20, 0.7)"
        border="1px solid #4D6D5B"
        borderRadius="12px"
        overflow="hidden"
      >
        <Box px={3} py={2} borderBottom="1px solid #365043">
          <Text fontSize="11px" color="#87B49B" textTransform="uppercase" letterSpacing="0.12em" fontWeight="700">
            Ranked Rules
          </Text>
        </Box>
        {[
          { rule: "Allowed Tiers", value: "T2, T3, T4", detail: "T1 and T5 excluded", color: "#D8B880" },
          { rule: "Max T2 per team", value: "1", detail: "Prevents stacking rares", color: "#DEC398" },
          { rule: "Max T3 per team", value: "2", detail: "Balanced composition", color: "#9AA99B" },
          { rule: "T4 limit", value: "None", detail: "Freely available", color: "#6F7F72" },
          { rule: "Team size", value: "3 beasts", detail: "", color: "#A7D5BF" },
        ].map((r) => (
          <Flex key={r.rule} align="center" px={3} py={2} borderBottom="1px solid #1A2D24" gap={2}>
            <Text fontSize="12px" color="text.secondary" flex={1}>
              {r.rule}
            </Text>
            <Text fontFamily="mono" fontSize="sm" fontWeight="700" color={r.color} minW="60px" textAlign="right">
              {r.value}
            </Text>
          </Flex>
        ))}
      </Box>

      {/* Timer callout */}
      <Box
        bg="rgba(199, 137, 137, 0.06)"
        border="1px solid #432525"
        borderRadius="8px"
        px={3} py={2}
      >
        <Flex align="center" gap={2}>
          <Text fontFamily="mono" fontSize="lg" color="#C78989" fontWeight="800">30s</Text>
          <Box>
            <Text fontSize="12px" color="#C78989" fontWeight="600">
              Selection Timer
            </Text>
            <Text fontSize="12px" color="text.muted">
              Auto-selects default beasts if time runs out
            </Text>
          </Box>
        </Flex>
      </Box>

      {/* Strategy tips */}
      <Box
        bg="rgba(15, 23, 20, 0.5)"
        border="1px solid #365043"
        borderRadius="10px"
        p={3}
      >
        <Text fontSize="11px" color="#87B49B" textTransform="uppercase" letterSpacing="0.12em" fontWeight="700" mb={2}>
          Team Building Tips
        </Text>
        <VStack align="stretch" gap={2}>
          {[
            "Cover all 3 types (Magical, Hunter, Brute) for the combat triangle",
            "Mix subclass roles: a tank, a damage dealer, and a flexible pick",
            "Your last selection is remembered for faster re-queuing",
            "Custom settings in friendly games can change all these rules",
          ].map((tip, i) => (
            <Flex key={i} align="flex-start" gap={2}>
              <Box w="4px" h="4px" borderRadius="full" bg="#87B49B" mt="5px" flexShrink={0} />
              <Text fontSize="12px" color="text.muted">{tip}</Text>
            </Flex>
          ))}
        </VStack>
      </Box>
    </VStack>
  );
}

// =============================================================================
// Section: Ranking
// =============================================================================

function RankingSection() {
  return (
    <VStack align="stretch" gap={4}>
      <Text fontSize="sm" color="text.secondary" lineHeight="1.7">
        Ranked matchmaking contributes to a league-style leaderboard.
        Consistency matters: winning and winning efficiently are both rewarded.
      </Text>

      {/* Score formula */}
      <Box
        bg="rgba(15, 23, 20, 0.7)"
        border="1px solid #4D6D5B"
        borderRadius="12px"
        p={4}
        textAlign="center"
        position="relative"
        overflow="hidden"
      >
        <Box
          position="absolute" inset={0}
          bg="linear-gradient(135deg, rgba(216,184,128,0.04) 0%, transparent 50%, rgba(135,180,155,0.04) 100%)"
          pointerEvents="none"
        />
        <Text fontSize="11px" color="text.muted" textTransform="uppercase" letterSpacing="0.15em" mb={3}>
          Score Formula
        </Text>
        <Flex align="center" justify="center" gap={1} flexWrap="wrap">
          <Text fontFamily="mono" fontSize="sm" color="#D8B880" fontWeight="700">(wins x 500)</Text>
          <Text fontFamily="heading" fontSize="md" color="#4D6D5B">+</Text>
          <Text fontFamily="mono" fontSize="sm" color="#A7D5BF" fontWeight="700">(kills x 50)</Text>
          <Text fontFamily="heading" fontSize="md" color="#4D6D5B">+</Text>
          <Text fontFamily="mono" fontSize="sm" color="#87B49B" fontWeight="700">(alive x 30)</Text>
        </Flex>
      </Box>

      {/* Score breakdown */}
      <Box
        bg="rgba(15, 23, 20, 0.5)"
        border="1px solid #365043"
        borderRadius="12px"
        overflow="hidden"
      >
        {[
          { component: "Win", points: "500", desc: "Winning the match", color: "#D8B880", bar: 100 },
          { component: "Kill", points: "50", desc: "Each enemy beast eliminated", color: "#A7D5BF", bar: 30 },
          { component: "Beast Alive", points: "30", desc: "Each of your beasts surviving", color: "#87B49B", bar: 18 },
        ].map((item, i) => (
          <Box key={i} px={3} py={2.5} borderBottom={i < 2 ? "1px solid #24372E" : "none"}>
            <Flex justify="space-between" align="center" mb={1}>
              <Text fontSize="sm" fontWeight="600" color={item.color}>
                {item.component}
              </Text>
              <Text fontFamily="mono" fontSize="sm" fontWeight="700" color={item.color}>
                +{item.points}
              </Text>
            </Flex>
            <Box h="3px" bg="#0D1512" borderRadius="2px" overflow="hidden" mb={1}>
              <Box h="100%" w={`${item.bar}%`} bg={`linear-gradient(90deg, ${item.color}66, ${item.color})`} borderRadius="2px" />
            </Box>
            <Text fontSize="11px" color="text.muted">{item.desc}</Text>
          </Box>
        ))}
      </Box>

      {/* Tracked stats */}
      <Box
        bg="rgba(28, 45, 37, 0.4)"
        border="1px solid #365043"
        borderRadius="10px"
        p={3}
      >
        <Text fontSize="11px" color="#87B49B" textTransform="uppercase" letterSpacing="0.12em" fontWeight="700" mb={2}>
          Tracked Stats
        </Text>
        <Flex flexWrap="wrap" gap={2}>
          {["Games Played", "Wins", "Losses", "Total Kills", "Total Deaths", "Abandons"].map((stat) => (
            <Box
              key={stat}
              bg="rgba(15, 23, 20, 0.5)"
              borderRadius="6px"
              px={2} py={1}
              border="1px solid #24372E"
            >
              <Text fontSize="11px" color="text.secondary" fontFamily="mono">
                {stat}
              </Text>
            </Box>
          ))}
        </Flex>
      </Box>

      <Box
        bg="rgba(216, 184, 128, 0.06)"
        border="1px solid rgba(166, 124, 73, 0.3)"
        borderRadius="8px"
        px={3} py={2}
      >
        <Text fontSize="12px" color="#D8B880" fontWeight="600">
          Friendly matches do not count towards ranking or stats.
        </Text>
      </Box>
    </VStack>
  );
}

// =============================================================================
// Section renderer
// =============================================================================

function SectionContent({ section }: { section: SectionId }) {
  switch (section) {
    case "overview": return <OverviewSection />;
    case "triangle": return <CombatTriangleSection />;
    case "damage": return <DamageSection />;
    case "counter": return <CounterSection />;
    case "subclasses": return <SubclassesSection />;
    case "board": return <BoardSection />;
    case "turns": return <TurnsSection />;
    case "team": return <TeamSection />;
    case "ranking": return <RankingSection />;
  }
}

// =============================================================================
// Main HowToGuide component
// =============================================================================

export function HowToGuide() {
  const { isOpen, close } = useHowToStore();
  const [activeSection, setActiveSection] = useState<SectionId>("overview");

  return (
    <Modal isOpen={isOpen} onClose={close} size="xl" scrollBehavior="inside" isCentered>
      <ModalOverlay bg="rgba(4, 8, 6, 0.7)" backdropFilter="blur(6px)" />
      <ModalContent
        bg="#0F1714"
        border="1px solid #4D6D5B"
        borderRadius="16px"
        maxW="500px"
        maxH="85vh"
        overflow="hidden"
        mx={4}
      >
        <ModalCloseButton
          color="#9AA99B"
          top={3}
          right={3}
          zIndex={10}
          _hover={{ color: "#E5DED0" }}
        />

        {/* Header */}
        <Box
          px={5} pt={5} pb={3}
          borderBottom="1px solid #365043"
          position="relative"
          overflow="hidden"
          flexShrink={0}
        >
          {/* Decorative scanline */}
          <Box
            position="absolute" inset={0}
            opacity={0.015}
            pointerEvents="none"
            backgroundImage="repeating-linear-gradient(0deg, transparent, transparent 2px, #A7D5BF 2px, #A7D5BF 3px)"
          />

          <Flex align="center" gap={3} mb={3}>
            <Rune char="&#x2726;" color="#87B49B" />
            <Box>
              <Text
                fontFamily="heading"
                fontSize="xl"
                fontWeight="600"
                color="text.primary"
                textTransform="uppercase"
                letterSpacing="0.1em"
                lineHeight="1"
              >
                Field Manual
              </Text>
              <Text fontSize="11px" color="text.muted" textTransform="uppercase" letterSpacing="0.2em" mt="2px">
                Tactical Beasts
              </Text>
            </Box>
          </Flex>

          {/* Section navigation */}
          <Flex
            gap={0}
            overflowX="auto"
            mx={-5} px={5}
            pb={1}
            css={{
              "&::-webkit-scrollbar": { display: "none" },
              scrollbarWidth: "none",
            }}
          >
            {NAV_ITEMS.map((item) => {
              const isActive = activeSection === item.id;
              return (
                <Box
                  key={item.id}
                  as="button"
                  onClick={() => setActiveSection(item.id)}
                  px={2.5}
                  py={1.5}
                  borderRadius="6px"
                  bg={isActive ? "rgba(135, 180, 155, 0.12)" : "transparent"}
                  border="1px solid"
                  borderColor={isActive ? "#4D6D5B" : "transparent"}
                  cursor="pointer"
                  flexShrink={0}
                  transition="all 0.2s"
                  _hover={{
                    bg: isActive ? "rgba(135, 180, 155, 0.12)" : "rgba(135, 180, 155, 0.06)",
                  }}
                  position="relative"
                >
                  <Text
                    fontSize="11px"
                    fontFamily="mono"
                    color={isActive ? "#A7D5BF" : "text.muted"}
                    fontWeight={isActive ? "700" : "500"}
                    textTransform="uppercase"
                    letterSpacing="0.08em"
                    whiteSpace="nowrap"
                  >
                    {item.label}
                  </Text>
                  {isActive && (
                    <Box
                      position="absolute"
                      bottom="-4px"
                      left="50%"
                      transform="translateX(-50%)"
                      w="16px" h="1px"
                      bg="#A7D5BF"
                      borderRadius="1px"
                    />
                  )}
                </Box>
              );
            })}
          </Flex>
        </Box>

        {/* Body */}
        <ModalBody px={5} py={4}>
          <AnimatePresence mode="wait">
            <MotionBox
              key={activeSection}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {/* Section title */}
              <Flex align="center" gap={2} mb={4}>
                <Text
                  fontFamily="heading"
                  fontSize="md"
                  color="#87B49B"
                  fontWeight="600"
                  textTransform="uppercase"
                  letterSpacing="0.1em"
                >
                  {NAV_ITEMS.find(n => n.id === activeSection)?.icon}
                </Text>
                <Box w="8px" h="1px" bg="#4D6D5B" />
                <Text
                  fontFamily="heading"
                  fontSize="lg"
                  color="text.primary"
                  fontWeight="500"
                  letterSpacing="0.05em"
                >
                  {NAV_ITEMS.find(n => n.id === activeSection)?.label}
                </Text>
              </Flex>

              <SectionContent section={activeSection} />
            </MotionBox>
          </AnimatePresence>
        </ModalBody>

        {/* Footer ornament */}
        <Box
          h="40px"
          borderTop="1px solid #365043"
          display="flex"
          alignItems="center"
          justifyContent="center"
          gap={3}
          flexShrink={0}
        >
          <Box w="20px" h="1px" bg="linear-gradient(90deg, transparent, #4D6D5B)" />
          <Rune char="&#x2726;" />
          <Text fontSize="12px" color="text.muted" textTransform="uppercase" letterSpacing="0.2em" fontFamily="mono">
            Pilosaurio
          </Text>
          <Rune char="&#x2726;" />
          <Box w="20px" h="1px" bg="linear-gradient(90deg, #4D6D5B, transparent)" />
        </Box>
      </ModalContent>
    </Modal>
  );
}
