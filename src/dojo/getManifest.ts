import manifestSlot from "../../manifest_slot.json";
import manifestSepolia from "../../manifest_sepolia.json";

const CHAIN = import.meta.env.VITE_CHAIN?.trim() || "";

const normalizeManifest = (manifest: any) => {
  const abis = Array.isArray(manifest?.abis)
    ? manifest.abis
    : Array.isArray(manifest?.world?.abi)
      ? manifest.world.abi
      : [];

  if (!Array.isArray(manifest?.contracts)) {
    return { ...manifest, abis };
  }

  const contracts = manifest.contracts.map((contract: any) => {
    if (Array.isArray(contract?.abi) && contract.abi.length > 0) {
      return contract;
    }
    return { ...contract, abi: abis };
  });

  return { ...manifest, abis, contracts };
};

const selectManifest = () => {
  switch (CHAIN) {
    case "sepolia":
      return manifestSepolia;
    case "mainnet":
      return manifestSlot; // TODO: add manifest_mainnet.json when available
    default:
      return manifestSlot;
  }
};

const resolvedManifest = normalizeManifest(selectManifest());

export const getManifest = () => resolvedManifest;
