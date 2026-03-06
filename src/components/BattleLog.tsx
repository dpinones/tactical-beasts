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
      return "#FF3333";
    case "ko":
      return "#FF3333";
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
      maxH="300px"
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
          fontSize="xs"
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
            <Text fontSize="xs" color="text.muted">
              Waiting for actions...
            </Text>
          ) : (
            events.map((event, i) => (
              <Flex key={i} gap={2} align="flex-start">
                <Text
                  fontSize="xs"
                  color="text.muted"
                  fontFamily="mono"
                  minW="20px"
                >
                  {i + 1}.
                </Text>
                <Text fontSize="xs" color={eventColor(event.type)}>
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
