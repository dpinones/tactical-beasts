import { Box, Flex, Text, VStack } from "@chakra-ui/react";

interface CoinFlipIntroProps {
  revealResult: boolean;
  iGoFirst?: boolean;
  myName?: string;
  enemyName?: string;
}

export function CoinFlipIntro({ revealResult, iGoFirst, myName, enemyName }: CoinFlipIntroProps) {
  return (
    <Flex
      direction="column"
      align="center"
      justify="center"
      minH="100vh"
      bgImage="url('/seleccion%20de%20bestias.png')"
      bgSize="cover"
      bgPosition="center"
      className="coin-flip-screen"
      px={4}
    >
      <VStack gap={2} mb={8} textAlign="center">
        <Text
          fontSize={{ base: "lg", md: "2xl" }}
          color="#C7D9CE"
          fontFamily="heading"
          textTransform="uppercase"
          letterSpacing="0.08em"
        >
          Tossing Coin
        </Text>
        <Text fontSize={{ base: "sm", md: "md" }} color="rgba(205, 222, 212, 0.9)" fontFamily="mono">
          Deciding attacker and defender
        </Text>
      </VStack>

      <Box className="coin-flip-stage">
        <Box className="coin-flip-shadow" />
        <Box className="coin-3d">
          <Box className="coin-face coin-face--heads">
            <img src="/coin_face_heads.svg" alt="Heads" />
          </Box>
          <Box className="coin-face coin-face--tails">
            <img src="/coin_face_tails.svg" alt="Tails" />
          </Box>
        </Box>
      </Box>

      <VStack
        mt={8}
        className={`coin-result ${revealResult ? "coin-result--visible" : ""}`}
        textAlign="center"
      >
        <Text fontFamily="heading" fontSize={{ base: "md", md: "xl" }} color={iGoFirst ? "#A7D5BF" : "#C78989"} letterSpacing="0.06em">
          {iGoFirst ? "You go first!" : "Opponent goes first!"}
        </Text>
        <Text fontSize={{ base: "sm", md: "md" }} color="#D4C6AD" fontFamily="mono">
          {iGoFirst
            ? `${myName || "You"} attacks · ${enemyName || "Opponent"} defends`
            : `${enemyName || "Opponent"} attacks · ${myName || "You"} defends`}
        </Text>
      </VStack>
    </Flex>
  );
}
