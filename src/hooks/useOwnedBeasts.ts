import { useQuery } from "react-query";
import { useWallet } from "../dojo/WalletContext";
import { fetchBeastsByOwner, DEV_WALLET } from "../api/beastsApi";

export function useOwnedBeasts() {
  const { finalAccount, accountType } = useWallet();

  const address =
    accountType === "controller" && finalAccount
      ? finalAccount.address
      : DEV_WALLET;

  const { data, isLoading, error, refetch } = useQuery(
    ["ownedBeasts", address],
    () => fetchBeastsByOwner(address),
    { staleTime: 60_000, enabled: !!address }
  );

  return {
    beasts: data ?? [],
    isLoading,
    error: error as Error | null,
    refetch,
  };
}
