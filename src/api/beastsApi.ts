const SUMMIT_API_URL = "https://summit-production-69ed.up.railway.app";

export const DEV_WALLET =
  "0x02a1EaD645bA883D1e3C2aC1c649fEe74bCB1f2798B3Df6504F44083ad06B8FA";

export interface OwnedBeast {
  token_id: number;
  id: number;
  name: string;
  prefix: string;
  suffix: string;
  type: string;
  tier: number;
  level: number;
  health: number;
  power: number;
  current_health: number;
  current_level: number;
  shiny: boolean;
  animated: boolean;
  adventurers_killed: number;
}

export async function fetchBeastsByOwner(
  owner: string
): Promise<OwnedBeast[]> {
  const res = await fetch(`${SUMMIT_API_URL}/beasts/${owner}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch beasts: ${res.status}`);
  }
  return res.json();
}
