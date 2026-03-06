import { Button, Flex, Heading, Text, Spinner } from "@chakra-ui/react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "../dojo/WalletContext";

const CHAIN = import.meta.env.VITE_CHAIN;

export function HomePage() {
  const {
    finalAccount,
    switchToController,
    connectAsGuest,
    isLoadingWallet,
    connectionStatus,
    setConnectionStatus,
  } = useWallet();

  const navigate = useNavigate();
  const allowGuest = CHAIN !== "mainnet" && CHAIN !== "sepolia";

  useEffect(() => {
    if (finalAccount) {
      navigate("/game");
    }
  }, [finalAccount, navigate]);

  return (
    <Flex
      direction="column"
      align="center"
      justify="center"
      minH="100vh"
      gap={8}
      p={4}
    >
      <Heading size="2xl" textAlign="center">
        Rock Paper Scissors
      </Heading>
      <Text fontSize="lg" color="gray.400" textAlign="center" maxW="500px">
        On-chain Rock Paper Scissors with commit-reveal.
        Connect with Cartridge Controller or play as guest.
      </Text>

      <Flex direction="row" gap={4}>
        {isLoadingWallet && connectionStatus !== "selecting" ? (
          <Spinner size="lg" color="white" />
        ) : (
          <>
            <Button
              size="lg"
              colorScheme="blue"
              onClick={() => {
                setConnectionStatus("connecting_controller");
                switchToController();
              }}
            >
              Login
            </Button>
            {allowGuest && (
              <Button
                size="lg"
                variant="outline"
                colorScheme="whiteAlpha"
                onClick={connectAsGuest}
              >
                Guest
              </Button>
            )}
          </>
        )}
      </Flex>
    </Flex>
  );
}
