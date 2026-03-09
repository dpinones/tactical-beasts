import {
  Box,
  Button,
  Flex,
  Heading,
  Input,
  Text,
  VStack,
  HStack,
  Spinner,
  Badge,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Textarea,
} from "@chakra-ui/react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGameSettings } from "../hooks/useGameQuery";
import { useDenshokanActions } from "../hooks/useDenshokanActions";
import { toast } from "sonner";

export function GameSettingsPage() {
  const navigate = useNavigate();
  const { settings, loading, refetch } = useGameSettings();
  const { createSettings, isLoading: isCreating } = useDenshokanActions();

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [minTier, setMinTier] = useState(2);
  const [maxTier, setMaxTier] = useState(4);
  const [maxT2, setMaxT2] = useState(1);
  const [maxT3, setMaxT3] = useState(2);
  const [beastsPerPlayer, setBeastsPerPlayer] = useState(3);

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    try {
      await createSettings(name.trim(), description.trim(), minTier, maxTier, maxT2, maxT3, beastsPerPlayer);
      toast.success("Settings created successfully");
      setShowForm(false);
      setName("");
      setDescription("");
      // Wait for Torii to index the new settings
      setTimeout(() => refetch(), 2000);
    } catch (e: any) {
      toast.error(`Failed to create settings: ${e.message}`);
    }
  };

  return (
    <Flex direction="column" minH="100vh" p={6} maxW="700px" mx="auto">
      <Flex justify="space-between" align="center" mb={6}>
        <Heading
          size="lg"
          fontFamily="heading"
          color="green.300"
          textTransform="uppercase"
          letterSpacing="0.08em"
        >
          Game Settings
        </Heading>
        <HStack gap={2}>
          <Button variant="primary" size="sm" onClick={() => setShowForm(!showForm)}>
            {showForm ? "Cancel" : "New Settings"}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
            Back
          </Button>
        </HStack>
      </Flex>

      {/* Create form */}
      {showForm && (
        <Box
          bg="surface.panel"
          border="1px solid"
          borderColor="green.600"
          borderRadius="12px"
          p={5}
          mb={6}
        >
          <VStack align="stretch" gap={4}>
            <Text fontFamily="heading" fontSize="sm" color="green.300" textTransform="uppercase" letterSpacing="0.1em">
              Create New Settings
            </Text>

            <Box>
              <Text fontSize="xs" color="text.secondary" mb={1}>Name</Text>
              <Input
                size="sm"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Standard Match"
              />
            </Box>

            <Box>
              <Text fontSize="xs" color="text.secondary" mb={1}>Description</Text>
              <Textarea
                size="sm"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description of these settings..."
                rows={2}
              />
            </Box>

            <HStack gap={4}>
              <Box flex={1}>
                <Text fontSize="xs" color="text.secondary" mb={1}>Min Tier</Text>
                <NumberInput size="sm" min={1} max={5} value={minTier} onChange={(_, v) => setMinTier(v || 1)}>
                  <NumberInputField />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
              </Box>
              <Box flex={1}>
                <Text fontSize="xs" color="text.secondary" mb={1}>Max Tier</Text>
                <NumberInput size="sm" min={1} max={5} value={maxTier} onChange={(_, v) => setMaxTier(v || 5)}>
                  <NumberInputField />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
              </Box>
            </HStack>

            <HStack gap={4}>
              <Box flex={1}>
                <Text fontSize="xs" color="text.secondary" mb={1}>Max T2 per team</Text>
                <NumberInput size="sm" min={0} max={5} value={maxT2} onChange={(_, v) => setMaxT2(v || 0)}>
                  <NumberInputField />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
              </Box>
              <Box flex={1}>
                <Text fontSize="xs" color="text.secondary" mb={1}>Max T3 per team</Text>
                <NumberInput size="sm" min={0} max={5} value={maxT3} onChange={(_, v) => setMaxT3(v || 0)}>
                  <NumberInputField />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
              </Box>
              <Box flex={1}>
                <Text fontSize="xs" color="text.secondary" mb={1}>Beasts/Player</Text>
                <NumberInput size="sm" min={1} max={5} value={beastsPerPlayer} onChange={(_, v) => setBeastsPerPlayer(v || 3)}>
                  <NumberInputField />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
              </Box>
            </HStack>

            <Button
              variant="primary"
              size="sm"
              onClick={handleCreate}
              isLoading={isCreating}
            >
              Create Settings
            </Button>
          </VStack>
        </Box>
      )}

      {/* Settings list */}
      {loading ? (
        <Flex justify="center" py={10}>
          <Spinner color="green.400" size="lg" />
        </Flex>
      ) : settings.length === 0 ? (
        <Box bg="surface.card" borderRadius="10px" p={6} textAlign="center">
          <Text color="text.muted" fontSize="sm">
            No settings found.
          </Text>
        </Box>
      ) : (
        <VStack align="stretch" gap={3}>
          {settings.map((s) => {
            const isDefault = s.settings_id === 1;
            return (
              <Box
                key={s.settings_id}
                bg="surface.panel"
                border="1px solid"
                borderColor={isDefault ? "green.600" : "surface.border"}
                borderRadius="12px"
                p={4}
              >
                <Flex justify="space-between" align="center" mb={2}>
                  <HStack gap={2}>
                    <Text fontSize="sm" fontWeight="700" color="text.primary">
                      Settings #{s.settings_id}
                    </Text>
                    {isDefault && (
                      <Badge variant="magical" fontSize="8px">DEFAULT</Badge>
                    )}
                  </HStack>
                </Flex>
                <HStack gap={4} flexWrap="wrap">
                  <Box>
                    <Text fontSize="9px" color="text.secondary" textTransform="uppercase">Tier Range</Text>
                    <Text fontSize="xs" fontFamily="mono" color="text.gold">
                      T{s.min_tier} — T{s.max_tier}
                    </Text>
                  </Box>
                  <Box>
                    <Text fontSize="9px" color="text.secondary" textTransform="uppercase">Max T2</Text>
                    <Text fontSize="xs" fontFamily="mono">{s.max_t2_per_team}</Text>
                  </Box>
                  <Box>
                    <Text fontSize="9px" color="text.secondary" textTransform="uppercase">Max T3</Text>
                    <Text fontSize="xs" fontFamily="mono">{s.max_t3_per_team}</Text>
                  </Box>
                  <Box>
                    <Text fontSize="9px" color="text.secondary" textTransform="uppercase">Beasts/Player</Text>
                    <Text fontSize="xs" fontFamily="mono">{s.beasts_per_player}</Text>
                  </Box>
                </HStack>
              </Box>
            );
          })}
        </VStack>
      )}
    </Flex>
  );
}
