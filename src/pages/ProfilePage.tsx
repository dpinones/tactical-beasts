import { Box, Flex, Heading, Text, VStack, Button } from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "../dojo/WalletContext";

function truncateAddr(addr: string): string {
  if (!addr) return "---";
  return addr.slice(0, 6) + "..." + addr.slice(-4);
}

export function ProfilePage() {
  const navigate = useNavigate();
  const { finalAccount } = useWallet();

  return (
    <Flex direction="column" minH="100vh" p={6} maxW="600px" mx="auto">
      {/* Header */}
      <Flex justify="space-between" align="center" mb={6}>
        <Heading
          size="lg"
          fontFamily="heading"
          color="green.300"
          textTransform="uppercase"
          letterSpacing="0.08em"
        >
          Profile
        </Heading>
        <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
          Back
        </Button>
      </Flex>

      <Box
        bg="surface.panel"
        border="1px solid"
        borderColor="surface.border"
        borderRadius="3px"
        p={5}
      >
        <VStack align="stretch" gap={4}>
          <Box>
            <Text fontSize="xs" color="text.secondary" textTransform="uppercase" letterSpacing="0.1em">
              Address
            </Text>
            <Text fontSize="sm" fontFamily="mono">
              {truncateAddr(finalAccount?.address || "")}
            </Text>
          </Box>

          <Box>
            <Text fontSize="xs" color="text.secondary" textTransform="uppercase" letterSpacing="0.1em">
              Games Played
            </Text>
            <Text fontSize="lg" color="text.gold" fontFamily="mono" fontWeight="700">
              0
            </Text>
          </Box>

          <Box>
            <Text fontSize="xs" color="text.secondary" textTransform="uppercase" letterSpacing="0.1em">
              Victories
            </Text>
            <Text fontSize="lg" color="green.300" fontFamily="mono" fontWeight="700">
              0
            </Text>
          </Box>

          <Box>
            <Text fontSize="xs" color="text.secondary" textTransform="uppercase" letterSpacing="0.1em">
              K/D Ratio
            </Text>
            <Text fontSize="lg" fontFamily="mono" fontWeight="700">
              --
            </Text>
          </Box>

          <Box>
            <Text fontSize="xs" color="text.secondary" textTransform="uppercase" letterSpacing="0.1em">
              Favorite Beast
            </Text>
            <Text fontSize="sm" color="text.muted">
              No games yet
            </Text>
          </Box>
        </VStack>
      </Box>
    </Flex>
  );
}
