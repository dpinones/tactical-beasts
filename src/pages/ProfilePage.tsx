import { Box, Flex, Heading, Text, VStack, Button, Spinner } from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "../dojo/WalletContext";
import { usePlayerProfile } from "../hooks/useGameQuery";

function truncateAddr(addr: string): string {
  if (!addr) return "---";
  return addr.slice(0, 6) + "..." + addr.slice(-4);
}

function formatKD(kills: number, deaths: number): string {
  if (deaths === 0) return kills > 0 ? `${kills}/0` : "--";
  return `${kills}/${deaths}`;
}

export function ProfilePage() {
  const navigate = useNavigate();
  const { finalAccount } = useWallet();
  const { profile, loading } = usePlayerProfile(finalAccount?.address || null);

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

      {loading ? (
        <Flex justify="center" py={10}>
          <Spinner color="green.400" size="lg" />
        </Flex>
      ) : (
        <Box
          bg="surface.panel"
          border="1px solid"
          borderColor="surface.border"
          borderRadius="12px"
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
                {profile?.games_played ?? 0}
              </Text>
            </Box>

            <Box>
              <Text fontSize="xs" color="text.secondary" textTransform="uppercase" letterSpacing="0.1em">
                Victories
              </Text>
              <Text fontSize="lg" color="green.300" fontFamily="mono" fontWeight="700">
                {profile?.wins ?? 0}
              </Text>
            </Box>

            <Box>
              <Text fontSize="xs" color="text.secondary" textTransform="uppercase" letterSpacing="0.1em">
                Losses
              </Text>
              <Text fontSize="lg" color="danger.300" fontFamily="mono" fontWeight="700">
                {profile?.losses ?? 0}
              </Text>
            </Box>

            <Box>
              <Text fontSize="xs" color="text.secondary" textTransform="uppercase" letterSpacing="0.1em">
                Abandons
              </Text>
              <Text fontSize="lg" color="text.muted" fontFamily="mono" fontWeight="700">
                {profile?.abandons ?? 0}
              </Text>
            </Box>

            <Box>
              <Text fontSize="xs" color="text.secondary" textTransform="uppercase" letterSpacing="0.1em">
                K/D
              </Text>
              <Text fontSize="lg" fontFamily="mono" fontWeight="700">
                {formatKD(profile?.total_kills ?? 0, profile?.total_deaths ?? 0)}
              </Text>
            </Box>
          </VStack>
        </Box>
      )}
    </Flex>
  );
}
