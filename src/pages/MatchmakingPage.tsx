import { Box, Flex, Heading, Text, Spinner, Button } from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";

export function MatchmakingPage() {
  const navigate = useNavigate();

  return (
    <Flex
      direction="column"
      align="center"
      justify="center"
      minH="100vh"
      gap={6}
      p={4}
    >
      <Heading
        size="lg"
        fontFamily="heading"
        color="green.300"
        textTransform="uppercase"
        letterSpacing="0.08em"
      >
        Matchmaking
      </Heading>

      <Box
        bg="surface.panel"
        border="1px solid"
        borderColor="surface.border"
        borderRadius="3px"
        p={8}
        textAlign="center"
      >
        <Spinner size="lg" color="green.400" mb={4} />
        <Text fontSize="sm" color="text.secondary">
          Buscando partida...
        </Text>
      </Box>

      <Button variant="secondary" onClick={() => navigate("/")}>
        Cancel
      </Button>
    </Flex>
  );
}
