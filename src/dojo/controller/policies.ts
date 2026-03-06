import { getContractByName } from "@dojoengine/core";
import { getManifest } from "../getManifest";
import { setupWorld } from "../typescript/contracts.gen";
import { VRF_PROVIDER_ADDRESS } from "./constants";

const DOJO_NAMESPACE =
  import.meta.env.VITE_DOJO_NAMESPACE || "RPS";

const ENABLE_VRF = import.meta.env.VITE_ENABLE_VRF === "true";

const VRF_POLICY = {
  vrf: {
    name: "VRF",
    description: "Cartridge VRF Provider",
    contract_address: VRF_PROVIDER_ADDRESS,
    methods: [
      {
        entrypoint: "request_random",
        description: "Request a random number",
      },
    ],
  },
};

const manifest = getManifest();

interface Method {
  name: string;
  entrypoint: string;
}

interface ContractPolicy {
  methods: Method[];
}

interface Policies {
  contracts: Record<string, ContractPolicy>;
}

const formatEntrypoint = (entrypoint: string): string => {
  return entrypoint
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

const sortMethods = (methods: Method[]): Method[] => {
  return [...methods].sort((a, b) =>
    a.entrypoint.localeCompare(b.entrypoint)
  );
};

const sortContracts = (
  contracts: Record<string, ContractPolicy>
): Record<string, ContractPolicy> => {
  return Object.fromEntries(
    Object.entries(contracts)
      .sort(([addressA], [addressB]) =>
        addressA.toLowerCase().localeCompare(addressB.toLowerCase())
      )
      .map(([address, policy]) => [address, policy])
  );
};

const generatePolicies = (): Policies => {
  const mockProvider = {
    execute: () => Promise.resolve({}),
    call: () => Promise.resolve({}),
  };

  const world = setupWorld(mockProvider as any);

  const policiesContracts: Record<string, ContractPolicy> = {};

  Object.entries(world).forEach(([systemName, systemObj]) => {
    const contractAddress = getContractByName(
      manifest,
      DOJO_NAMESPACE,
      systemName
    )?.address;

    if (!contractAddress) {
      console.warn(`Contract address not found for ${systemName}`);
      return;
    }

    const methods: string[] = [];

    Object.entries(systemObj as Record<string, unknown>).forEach(
      ([methodName, methodValue]) => {
        if (
          !methodName.startsWith("build") &&
          typeof methodValue === "function"
        ) {
          if (!methodName.startsWith("get")) {
            let entrypoint = methodName;
            if (/[A-Z]/.test(entrypoint)) {
              entrypoint = entrypoint.replace(/([A-Z])/g, "_$1").toLowerCase();
              if (entrypoint.startsWith("_")) {
                entrypoint = entrypoint.substring(1);
              }
            }
            methods.push(entrypoint);
          }
        }
      }
    );

    if (methods.length > 0) {
      const formattedMethods = methods.map((method) => ({
        name: formatEntrypoint(method),
        entrypoint: method,
      }));

      policiesContracts[contractAddress] = {
        methods: sortMethods(formattedMethods),
      };
    }
  });

  // Add VRF policy if enabled
  if (ENABLE_VRF) {
    policiesContracts[VRF_POLICY.vrf.contract_address] = {
      methods: sortMethods(
        VRF_POLICY.vrf.methods.map((method) => ({
          name: formatEntrypoint(method.entrypoint),
          entrypoint: method.entrypoint,
        }))
      ),
    };
  }

  return { contracts: sortContracts(policiesContracts) };
};

export const policies = generatePolicies();
