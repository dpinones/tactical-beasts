import ControllerConnector from "@cartridge/connector/controller";
import { constants, shortString } from "starknet";
import { rpcUrl, slotInstance } from "../../config/cartridgeUrls";
import { policies } from "./policies";

const CHAIN =
  slotInstance ||
  import.meta.env.VITE_CHAIN ||
  "";

const getChainId = (chain: string) => {
  if (chain === "mainnet") {
    return constants.StarknetChainId.SN_MAIN;
  } else if (chain === "sepolia") {
    return constants.StarknetChainId.SN_SEPOLIA;
  } else {
    throw new Error(`Chain ${chain} not supported`);
  }
};

export const getSlotChainId = (slot: string) => {
  return shortString.encodeShortString(
    `WP_${slot.toUpperCase().replaceAll("-", "_")}`
  );
};

// Controller is only available for Slot or mainnet/sepolia deployments
export const isControllerAvailable = !!CHAIN;

function createController(): ControllerConnector | null {
  if (!CHAIN) return null;

  const defaultChainId =
    CHAIN === "mainnet" || CHAIN === "sepolia"
      ? getChainId(CHAIN)
      : getSlotChainId(CHAIN);

  const controllerOptions: any = {
    defaultChainId,
    policies,
  };

  // Only add optional fields if they have values
  const preset = import.meta.env.VITE_CONTROLLER_PRESET;
  if (preset) {
    controllerOptions.preset = preset;
  }

  if (CHAIN !== "mainnet" && CHAIN !== "sepolia") {
    controllerOptions.slot = CHAIN;
  }

  return new ControllerConnector(controllerOptions);
}

export const controller = createController();
