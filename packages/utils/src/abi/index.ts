import type { DecodedParam } from "../types.js";

export interface AbiInput {
  name: string;
  type: string;
  components?: AbiInput[];
  indexed?: boolean;
}

export interface AbiFunction {
  name: string;
  type: "function" | "constructor" | "event" | "fallback" | "receive";
  inputs: AbiInput[];
  outputs?: AbiInput[];
  stateMutability?: string;
}

export type AbiEvent = AbiFunction;

/**
 * Compute the 4-byte function selector from a function signature.
 * Uses a simple hash since we don't want keccak256 as a dependency.
 * For production, integrate a proper keccak256 implementation.
 */
export function functionSelector(signature: string): string {
  // Placeholder: In production, this should use keccak256(signature).slice(0, 10)
  // For now, we provide the structure and consumers can pass ABIs with known selectors
  void signature;
  throw new Error(
    "functionSelector requires a keccak256 implementation. Use decodeTxInput with a full ABI instead.",
  );
}

/**
 * Encode function call data from ABI and arguments.
 * This is a simplified encoder for common types.
 */
export function encodeABI(abi: AbiFunction, args: unknown[]): string {
  void abi;
  void args;
  throw new Error("encodeABI is not yet implemented. Use ethers.js or viem for ABI encoding.");
}

/**
 * Decode ABI-encoded data using function/event ABI.
 */
export function decodeABI(abi: AbiFunction, data: string): DecodedParam[] {
  const params: DecodedParam[] = [];
  const stripped = data.startsWith("0x") ? data.slice(2) : data;

  // Skip the 4-byte selector if present in function call data
  const offset = abi.type === "function" && stripped.length > 8 ? 8 : 0;
  const paramData = stripped.slice(offset);

  for (let i = 0; i < abi.inputs.length; i++) {
    const input = abi.inputs[i];
    if (!input) continue;
    const chunk = paramData.slice(i * 64, (i + 1) * 64);

    let value: unknown;
    if (input.type === "address") {
      value = `0x${chunk.slice(24)}`;
    } else if (input.type.startsWith("uint") || input.type.startsWith("int")) {
      value = BigInt(`0x${chunk}`).toString();
    } else if (input.type === "bool") {
      value = BigInt(`0x${chunk}`) !== 0n;
    } else {
      value = `0x${chunk}`;
    }

    params.push({ name: input.name, type: input.type, value });
  }

  return params;
}
