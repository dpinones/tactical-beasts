import { hash } from "starknet";

export function generateSalt(): string {
  const bytes = new Uint8Array(31);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return "0x" + hex;
}

export function computeCommitment(moveValue: number, salt: string): string {
  return hash.computePoseidonHashOnElements([moveValue, salt]);
}
