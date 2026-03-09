import { Flex, Heading, Text, Spinner, Button } from "@chakra-ui/react";
import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useGameActions } from "../hooks/useGameActions";
import { useGameQuery } from "../hooks/useGameQuery";
import { updateGameInviteGameId } from "../services/supabase";
import { requestBotOpponent } from "../services/botApi";
import { BeastClothesline } from "../components/BeastClothesline";

type Phase = "searching" | "waiting" | "waiting-friend" | "waiting-bot" | "matched" | "cancelling" | "error";

export function MatchmakingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { findMatch, cancelMatchmaking, createFriendlyGame } = useGameActions();

  const waitingForFriend = (location.state as any)?.waitingForFriend || false;
  const isPractice = (location.state as any)?.isPractice || false;
  const practiceGameId = (location.state as any)?.gameId as number | undefined;
  const inviteId = (location.state as any)?.inviteId || null;
  const friendName = (location.state as any)?.friendName || "friend";
  const settingsId = (location.state as any)?.settingsId as number | undefined;

  const initialPhase: Phase = isPractice ? "waiting-bot" : waitingForFriend ? "waiting-friend" : "searching";
  const [phase, setPhase] = useState<Phase>(initialPhase);
  const [gameId, setGameId] = useState<number | null>(isPractice && practiceGameId ? practiceGameId : null);
  const [errorMsg, setErrorMsg] = useState("");
  const calledRef = useRef(false);

  // Friend mode: create game and wait for friend to accept
  useEffect(() => {
    if (!waitingForFriend || calledRef.current) return;
    calledRef.current = true;

    (async () => {
      const id = await createFriendlyGame(settingsId);
      if (!id) {
        setPhase("error");
        setErrorMsg("Failed to create game");
        return;
      }
      setGameId(id);
      // Update the invite with the game_id so friend can join
      if (inviteId) {
        await updateGameInviteGameId(inviteId, id);
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Practice mode: request bot opponent for existing game
  useEffect(() => {
    if (!isPractice || !practiceGameId || calledRef.current) return;
    calledRef.current = true;

    (async () => {
      try {
        await requestBotOpponent(practiceGameId);
      } catch (err: any) {
        console.error("Bot request failed:", err);
        setPhase("error");
        setErrorMsg(err.message || "Failed to connect bot opponent");
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Normal matchmaking mode
  useEffect(() => {
    if (waitingForFriend || isPractice || calledRef.current) return;
    calledRef.current = true;

    (async () => {
      const id = await findMatch();
      if (!id) {
        setPhase("error");
        setErrorMsg("Failed to find match");
        return;
      }
      setGameId(id);
      setPhase("waiting");
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Step 2: Poll game state to detect when opponent joins
  const { game: polledGame } = useGameQuery(gameId);

  useEffect(() => {
    if (!polledGame || !gameId) return;
    if (phase !== "waiting" && phase !== "waiting-friend" && phase !== "waiting-bot") return;

    // If player2 is set, match found (normal, friend, or bot mode)
    if (polledGame.player2 && polledGame.player2 !== "0x0") {
      setPhase("matched");
      navigate(`/team-select/match/${gameId}`, {
        state: { fromMatchmaking: !waitingForFriend, isPractice },
      });
    }
  }, [phase, polledGame, gameId, navigate]);

  // Handle cancel
  const handleCancel = async () => {
    setPhase("cancelling");
    try {
      await cancelMatchmaking();
    } catch (e) {
      console.error("Cancel matchmaking failed:", e);
    }
    navigate("/");
  };

  if (phase === "searching") {
    return (
      <Flex direction="column" align="center" justify="center" minH="100vh" gap={6} p={4}>
        <BeastClothesline />
        <Heading
          size="lg"
          fontFamily="heading"
          color="green.300"
          textTransform="uppercase"
          letterSpacing="0.08em"
        >
          Matchmaking
        </Heading>
        <Spinner size="lg" color="green.400" />
        <Text fontSize="sm" color="text.secondary">
          Buscando partida...
        </Text>
        <Button variant="secondary" onClick={handleCancel}>
          Cancel
        </Button>
      </Flex>
    );
  }

  if (phase === "error") {
    return (
      <Flex direction="column" align="center" justify="center" minH="100vh" gap={4}>
        <Text fontSize="sm" color="danger.300">{errorMsg}</Text>
        <Button variant="secondary" onClick={() => navigate("/")}>Back to Home</Button>
      </Flex>
    );
  }

  if (phase === "cancelling") {
    return (
      <Flex direction="column" align="center" justify="center" minH="100vh" gap={4}>
        <Spinner size="lg" color="green.400" />
        <Text fontSize="sm" color="text.secondary">Cancelling...</Text>
      </Flex>
    );
  }

  // Phase: waiting for bot
  if (phase === "waiting-bot") {
    return (
      <Flex direction="column" align="center" justify="center" minH="100vh" gap={6} p={4}>
        <BeastClothesline />
        <Heading
          size="lg"
          fontFamily="heading"
          color="red.300"
          textTransform="uppercase"
          letterSpacing="0.08em"
        >
          Practice Mode
        </Heading>
        <Spinner size="lg" color="red.300" />
        <Text fontSize="sm" color="text.secondary">
          Connecting bot opponent...
        </Text>
        {gameId && (
          <Text fontSize="xs" color="text.muted" mt={2}>
            Game #{gameId}
          </Text>
        )}
        <Button variant="secondary" onClick={handleCancel}>
          Cancel
        </Button>
      </Flex>
    );
  }

  // Phase: waiting for friend
  if (phase === "waiting-friend") {
    return (
      <Flex direction="column" align="center" justify="center" minH="100vh" gap={6} p={4}>
        <BeastClothesline />
        <Heading
          size="lg"
          fontFamily="heading"
          color="green.300"
          textTransform="uppercase"
          letterSpacing="0.08em"
        >
          Friendly Match
        </Heading>
        <Spinner size="lg" color="green.400" />
        <Text fontSize="sm" color="text.secondary">
          Waiting for {friendName} to accept...
        </Text>
        {gameId && (
          <Text fontSize="xs" color="text.muted" mt={2}>
            Game #{gameId}
          </Text>
        )}
        <Button variant="secondary" onClick={handleCancel}>
          Cancel
        </Button>
      </Flex>
    );
  }

  // Phase: waiting
  return (
    <Flex direction="column" align="center" justify="center" minH="100vh" gap={6} p={4}>
      <BeastClothesline />
      <Heading
        size="lg"
        fontFamily="heading"
        color="green.300"
        textTransform="uppercase"
        letterSpacing="0.08em"
      >
        Matchmaking
      </Heading>
      <Spinner size="lg" color="green.400" />
      <Text fontSize="sm" color="text.secondary">
        Waiting for opponent...
      </Text>
      {gameId && (
        <Text fontSize="xs" color="text.muted" mt={2}>
          Game #{gameId}
        </Text>
      )}
      <Button variant="secondary" onClick={handleCancel}>
        Cancel
      </Button>
    </Flex>
  );
}
