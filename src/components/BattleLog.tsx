import { Flex, Text, VStack } from "@chakra-ui/react";
import { BattleEvent } from "../domain/types";
import { useRef, useEffect } from "react";

interface BattleLogProps {
  events: BattleEvent[];
}

function eventColor(type: BattleEvent["type"]): string {
  switch (type) {
    case "attack":
    case "counterattack":
      return "#C78989";
    case "ko":
      return "#C78989";
    case "extra_life":
      return "#CDAE79";
    case "crit":
      return "#CDAE79";
    case "move":
      return "#A7D5BF";
    case "potion":
      return "#A7D5BF";
    case "passive":
      return "#9EBCAD";
    default:
      return "#9AA99B";
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
    case "passive":
      return "[PSV]";
    default:
      return "";
  }
}

function eventBg(type: BattleEvent["type"]): string | undefined {
  switch (type) {
    case "ko":
      return "rgba(199,137,137,0.12)";
    case "crit":
      return "rgba(205,174,121,0.12)";
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
    <VStack align="stretch" gap={1}>
      {events.length === 0 ? (
        <Text fontSize="xs" color="#A7D5BF" fontFamily="mono" opacity={0.6}>
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
            borderRadius="8px"
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
            <Text fontSize="xs" color={eventColor(event.type)}>
              {event.message}
            </Text>
          </Flex>
        ))
      )}
      <div ref={endRef} />
    </VStack>
  );
}
