import { useQuery } from "react-query";
import { useWallet } from "../dojo/WalletContext";
import { fetchBeastsByOwner, OwnedBeast } from "../api/beastsApi";
import { isValidTier } from "../data/beasts";
import beastsAverage from "../../beasts-average.json";

// Local dev beasts mapped from beasts-average.json (already T2-T4 only)
const LOCAL_BEASTS: OwnedBeast[] = (beastsAverage as any[]).map((b) => ({
  token_id: b.tokenId,
  id: b.beastId,
  name: b.beast,
  prefix: b.prefix || "",
  suffix: b.suffix || "",
  type: b.type,
  tier: b.tier,
  level: b.level,
  health: b.health,
  power: b.power,
  current_health: b.health,
  current_level: b.level,
  shiny: b.shiny || false,
  animated: b.animated || false,
  adventurers_killed: b.adventurersKilled || 0,
}));

export function useOwnedBeasts() {
  const { finalAccount, accountType } = useWallet();
  const isLocal = accountType !== "controller";

  const { data, isLoading, error, refetch } = useQuery(
    ["ownedBeasts", finalAccount?.address],
    () => fetchBeastsByOwner(finalAccount!.address),
    { staleTime: 60_000, enabled: !isLocal && !!finalAccount }
  );

  // Filter out T1 and T5 beasts — only T2-T4 allowed in tactical combat
  const allBeasts = isLocal ? LOCAL_BEASTS : (data ?? []);
  const validBeasts = allBeasts.filter((b) => isValidTier(b.tier));

  return {
    beasts: validBeasts,
    isLoading: isLocal ? false : isLoading,
    error: isLocal ? null : (error as Error | null),
    refetch,
  };
}
