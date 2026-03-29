import type { EIP712Domain, EIP712Types } from "../types.js";

/**
 * Encode EIP-712 typed data into a structured format.
 * Note: Full EIP-712 hashing requires keccak256.
 * This module provides the encoding structure; consumers should
 * use a keccak256 library for the actual hash computation.
 */
export function encodeTypedData(
  domain: EIP712Domain,
  types: EIP712Types,
  value: Record<string, unknown>,
): string {
  // Return a JSON representation of the structured data
  // Full EIP-712 encoding requires keccak256 for type hashing
  return JSON.stringify({ domain, types, value });
}

/**
 * Hash EIP-712 typed data.
 * Placeholder: requires keccak256 implementation.
 */
export function hashTypedData(
  _domain: EIP712Domain,
  _types: EIP712Types,
  _value: Record<string, unknown>,
): string {
  throw new Error(
    "hashTypedData requires a keccak256 implementation. " +
      "Use encodeTypedData() for structure, then hash with your preferred library.",
  );
}
