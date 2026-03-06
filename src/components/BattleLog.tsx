import { Box, Flex, Text, VStack } from "@chakra-ui/react";
import { BattleEvent } from "../domain/types";
import { useRef, useEffect } from "react";

interface BattleLogProps {
  events: BattleEvent[];
}

function eventColor(type: BattleEvent["type"]): string {
  switch (type) {
    case "attack":
    case "counterattack":
      return "#E84040";
    case "ko":
      return "#E84040";
    case "extra_life":
      return "#FFD700";
    case "crit":
      return "#FFD700";
    case "move":
      return "#33FF66";
    case "potion":
      return "#33FF66";
    case "wait":
      return "#556655";
    default:
      return "#7A8A7A";
  }
}

function eventSymbol(type: BattleEvent["type"]): string {
  switch (type) {
    case "attack":
    case "counterattack":
      return "[ATK]";
    case "ko":
      return "[KO]";
    case "move":
      return "[MOV]";
    case "crit":
      return "[CRT]";
    case "extra_life":
      return "[+HP]";
    case "potion":
      return "[POT]";
    case "wait":
      return "[---]";
    default:
      return "";
  }
}

function eventBg(type: BattleEvent["type"]): string | undefined {
  switch (type) {
    case "ko":
      return "rgba(232,64,64,0.08)";
    case "crit":
      return "rgba(255,215,0,0.08)";
    default:
      return undefined;
  }
}

export function BattleLog({ events }: BattleLogProps) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [events.length]);

  return (
    <Box
      bg="surface.panel"
      border="1px solid"
      borderColor="surface.border"
      borderRadius="3px"
      h="100%"
      overflow="hidden"
      display="flex"
      flexDirection="column"
    >
      <Box
        px={3}
        py={2}
        borderBottom="1px solid"
        borderColor="surface.border"
      >
        <Text
          fontFamily="heading"
          fontSize="sm"
          fontWeight="600"
          color="green.300"
          textTransform="uppercase"
          letterSpacing="0.1em"
        >
          Battle Log
        </Text>
      </Box>
      <Box flex={1} overflowY="auto" px={3} py={2}>
        <VStack align="stretch" gap={1}>
          {events.length === 0 ? (
            <Text fontSize="sm" color="text.muted">
              Waiting for actions...
            </Text>
          ) : (
            events.map((event, i) => (
              <Flex
                key={i}
                gap={2}
                align="flex-start"
                borderLeft="2px solid"
                borderLeftColor={eventColor(event.type)}
                px={3}
                py={1.5}
                borderRadius="2px"
                bg={eventBg(event.type)}
                className="battle-log-entry-appear"
              >
                <Text
                  fontSize="xs"
                  color={eventColor(event.type)}
                  fontFamily="mono"
                  fontWeight="700"
                  minW="32px"
                  flexShrink={0}
                >
                  {eventSymbol(event.type)}
                </Text>
                <Text fontSize="sm" color={eventColor(event.type)}>
                  {event.message}
                </Text>
              </Flex>
            ))
          )}
          <div ref={endRef} />
        </VStack>
      </Box>
    </Box>
  );
}
