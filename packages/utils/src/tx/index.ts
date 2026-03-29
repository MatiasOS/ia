import type { AbiFunction } from "../abi/index.js";
import { decodeABI } from "../abi/index.js";
import type { DecodedInput } from "../types.js";

/**
 * Decode transaction input data.
 * If an ABI array is provided, attempts to match the method ID and decode parameters.
 */
export function decodeTxInput(data: string, abi?: AbiFunction[]): DecodedInput {
  const cleaned = data.startsWith("0x") ? data.slice(2) : data;

  if (cleaned.length < 8) {
    return { methodId: `0x${cleaned}`, params: [] };
  }

  const methodId = `0x${cleaned.slice(0, 8)}`;

  if (!abi || abi.length === 0) {
    return { methodId, params: [] };
  }

  // Try to find matching function in ABI by checking all functions
  // In production, this would compute keccak256 selectors for matching
  // For now, we return the raw method ID and no decoded params
  // Consumers should provide pre-computed selectors or use a keccak256 library
  for (const fn of abi) {
    if (fn.type !== "function") continue;
    // If the ABI entry has a pre-computed selector that matches
    // biome-ignore lint/suspicious/noExplicitAny: selector may be added as custom property
    const selector = (fn as any).selector as string | undefined;
    if (selector === methodId) {
      const params = decodeABI(fn, data);
      return { methodId, methodName: fn.name, params };
    }
  }

  return { methodId, params: [] };
}
