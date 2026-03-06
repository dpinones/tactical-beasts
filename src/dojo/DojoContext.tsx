import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  ReactNode,
} from "react";
import { Account, AccountInterface, RpcProvider } from "starknet";
import { BurnerProvider, useBurnerManager } from "@dojoengine/create-burner";

import { useAccountStore } from "./accountStore";
import { SetupResult } from "./setup";
import { controller } from "./controller/controller";
import { useWallet } from "./WalletContext";
import { rpcUrl } from "../config/cartridgeUrls";

const CHAIN = import.meta.env.VITE_CHAIN?.trim() || "";
const USE_CONTROLLER_ONLY = CHAIN === "sepolia" || CHAIN === "mainnet";

interface DojoAccount {
  create: () => void;
  list: () => any[];
  get: (id: string) => any;
  select: (id: string) => void;
  account: Account | AccountInterface;
  isDeploying: boolean;
  clear: () => void;
  accountDisplay: string;
}

interface SwitchSuccessPayload {
  username: string;
  account: AccountInterface;
}

interface DojoContextType extends SetupResult {
  masterAccount: Account | AccountInterface | null;
  account: DojoAccount;
  useBurnerAcc: boolean;
  switchToController: (
    onSuccess?: (payload: SwitchSuccessPayload) => void
  ) => void;
  logout: () => void;
  accountType: "burner" | "controller" | null;
}

export interface DojoResult {
  setup: DojoContextType;
  account: DojoAccount;
  masterAccount: Account | AccountInterface | null;
}

export function displayAddress(string: string) {
  if (string === undefined) return "unknown";
  return string.substring(0, 6) + "..." + string.substring(string.length - 4);
}

export const DojoContext = createContext<DojoContextType | null>(null);

const useMasterAccount = (rpcProvider: RpcProvider) => {
  const masterAddress = import.meta.env.VITE_MASTER_ADDRESS;
  const privateKey = import.meta.env.VITE_MASTER_PRIVATE_KEY;
  return useMemo(
    () =>
      masterAddress && privateKey
        ? new Account({
            provider: rpcProvider,
            address: masterAddress,
            signer: privateKey,
          })
        : null,
    [rpcProvider, masterAddress, privateKey]
  );
};

const useRpcProvider = () => {
  return useMemo(
    () =>
      new RpcProvider({
        nodeUrl: rpcUrl,
      }),
    []
  );
};

type DojoProviderProps = {
  children: ReactNode;
  value: SetupResult;
};

export const DojoProvider = ({ children, value }: DojoProviderProps) => {
  const currentValue = useContext(DojoContext);
  if (currentValue) throw new Error("DojoProvider can only be used once");

  const rpcProvider = useRpcProvider();
  const masterAccount = useMasterAccount(rpcProvider);

  if (USE_CONTROLLER_ONLY) {
    return (
      <DojoContextProvider value={value} masterAccount={masterAccount}>
        {children}
      </DojoContextProvider>
    );
  }

  return (
    <BurnerProvider
      initOptions={{
        masterAccount: masterAccount!,
        accountClassHash:
          import.meta.env.VITE_PUBLIC_ACCOUNT_CLASS_HASH ||
          "0x07dc7899aa655b0aae51eadff6d801a58e97dd99cf4666ee59e704249e51adf2",
        rpcProvider,
        feeTokenAddress:
          import.meta.env.VITE_NETWORK_FEE_TOKEN ||
          "0x49d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
      }}
    >
      <DojoContextProvider value={value} masterAccount={masterAccount}>
        {children}
      </DojoContextProvider>
    </BurnerProvider>
  );
};

export const useDojo = (): DojoResult => {
  const contextValue = useContext(DojoContext);
  if (!contextValue)
    throw new Error("The `useDojo` hook must be used within a `DojoProvider`");

  return {
    setup: contextValue,
    account: contextValue.account,
    masterAccount: contextValue.masterAccount,
  };
};

type DojoContextProviderProps = Omit<DojoProviderProps, "controllerAccount"> & {
  masterAccount: Account | null;
};

const DojoContextProvider = ({
  children,
  value,
  masterAccount,
}: DojoContextProviderProps) => {
  const {
    finalAccount,
    accountType,
    switchToController,
    controllerAccount,
    burnerAccount,
    isControllerConnected,
    onSuccessCallback,
    logout,
  } = useWallet();

  const burnerHooks = USE_CONTROLLER_ONLY
    ? { create: () => {}, list: () => [], get: () => undefined as any, select: () => {}, isDeploying: false, clear: () => {} }
    : useBurnerManager({ burnerManager: value.burnerManager! });

  const { create, list, get, select, isDeploying, clear } = burnerHooks;

  useEffect(() => {
    if (
      accountType === "controller" &&
      isControllerConnected &&
      controllerAccount
    ) {
      useAccountStore.getState().setAccount(controllerAccount);
      if (controller) {
        controller.username()?.then((newUsername) => {
          if (newUsername && onSuccessCallback.current) {
            onSuccessCallback.current({
              username: newUsername,
              account: controllerAccount,
            });
            onSuccessCallback.current = null;
          }
        });
      }
    } else if (accountType === "burner" && burnerAccount) {
      useAccountStore.getState().setAccount(burnerAccount);
    }
  }, [
    accountType,
    isControllerConnected,
    controllerAccount,
    burnerAccount,
    onSuccessCallback,
  ]);

  return (
    <DojoContext.Provider
      value={{
        ...value,
        masterAccount,
        useBurnerAcc: accountType === "burner",
        switchToController,
        logout,
        accountType,
        account: {
          create,
          list,
          get,
          select,
          clear,
          account: finalAccount as Account,
          isDeploying,
          accountDisplay: displayAddress(
            (finalAccount as Account | AccountInterface)?.address || ""
          ),
        },
      }}
    >
      {children}
    </DojoContext.Provider>
  );
};
