import { Box, Image } from "@chakra-ui/react";
import { keyframes } from "@emotion/react";
import { useMemo } from "react";

const BEAST_NAMES = [
  "ammit", "anansi", "balrog", "banshee", "basilisk", "bear", "behemoth",
  "berserker", "bigfoot", "chimera", "chupacabra", "colossus", "cyclops",
  "direwolf", "dragon", "draugr", "ent", "ettin", "fairy", "fenrir",
  "ghoul", "giant", "gnome", "goblin", "golem", "gorgon", "griffin",
  "harpy", "hippogriff", "hydra", "jaguar", "jiangshi", "jotunn",
  "juggernaut", "kappa", "kelpie", "kitsune", "kraken", "leprechaun",
  "leviathan", "lich", "manticore", "mantis", "minotaur", "nemeanlion",
  "nephilim", "nue", "ogre", "oni", "orc", "pegasus", "phoenix", "pixie",
  "qilin", "rakshasa", "rat", "roc", "satori", "skeleton", "skinwalker",
  "spider", "sprite", "tarrasque", "titan", "troll", "typhon", "vampire",
  "warlock", "wendigo", "weretiger", "werewolf", "wolf", "wraith", "wyvern", "yeti",
];

const CARD_WIDTH = 140;
const CARD_GAP = 30;
const VISIBLE_COUNT = 12;
const TOTAL_WIDTH = VISIBLE_COUNT * (CARD_WIDTH + CARD_GAP);

const scroll = keyframes`
  0% { transform: translateX(0); }
  100% { transform: translateX(-${TOTAL_WIDTH}px); }
`;

const swing = keyframes`
  0%, 100% { transform: rotate(-3deg); }
  50% { transform: rotate(3deg); }
`;

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function BeastClothesline() {
  const beasts = useMemo(() => {
    const shuffled = shuffleArray(BEAST_NAMES);
    const selected = shuffled.slice(0, VISIBLE_COUNT);
    return [...selected, ...selected];
  }, []);

  return (
    <Box w="100%" overflow="hidden" position="relative" h="220px">
      {/* Rope */}
      <Box
        position="absolute"
        top="30px"
        left="-5%"
        right="-5%"
        h="4px"
        bg="linear-gradient(90deg, transparent 0%, #6D4F2E 5%, #A67C49 20%, #6D4F2E 50%, #A67C49 80%, #6D4F2E 95%, transparent 100%)"
        zIndex={1}
        borderRadius="6px"
        boxShadow="0 2px 4px rgba(0,0,0,0.3)"
      />

      {/* Scrolling cards */}
      <Box
        display="flex"
        css={{ animation: `${scroll} ${VISIBLE_COUNT * 2.5}s linear infinite` }}
        position="relative"
        top="0"
        pt="10px"
      >
        {beasts.map((name, i) => (
          <Box
            key={`${name}-${i}`}
            flex="0 0 auto"
            w={`${CARD_WIDTH}px`}
            mx={`${CARD_GAP / 2}px`}
            display="flex"
            flexDirection="column"
            alignItems="center"
            transformOrigin="top center"
            css={{
              animation: `${swing} ${2 + (i % 3) * 0.5}s ease-in-out infinite`,
              animationDelay: `${(i % 5) * 0.3}s`,
            }}
          >
            {/* Clip */}
            <Box
              w="16px"
              h="24px"
              bg="linear-gradient(180deg, #A67C49 0%, #6D4F2E 100%)"
              borderRadius="6px 6px 0 0"
              zIndex={2}
              position="relative"
              boxShadow="0 2px 4px rgba(0,0,0,0.3)"
            />

            {/* Card */}
            <Box
              w={`${CARD_WIDTH}px`}
              h="160px"
              bg="linear-gradient(145deg, #2A3E36 0%, #1A2A24 100%)"
              border="2px solid"
              borderColor="rgba(166, 124, 73, 0.45)"
              borderRadius="12px"
              overflow="hidden"
              boxShadow="0 4px 12px rgba(0,0,0,0.5)"
              position="relative"
              mt="-2px"
            >
              <Image
                src={`/beasts/${name}.png`}
                alt={name}
                w="100%"
                h="100%"
                objectFit="cover"
              />
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
