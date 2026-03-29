import type { AddressInfo } from "../types.js";

/**
 * Compute EIP-55 checksum for an Ethereum address using a simple keccak-free approach.
 * For production, integrate a proper keccak256 implementation.
 */
function toChecksumAddress(address: string): string {
  // Placeholder: returns lowercase address.
  // Full EIP-55 requires keccak256 which needs either a dependency or manual implementation.
  return address.toLowerCase();
}

/**
 * Validate an address and return info about it.
 */
export function validateAddress(address: string, chainType?: string): AddressInfo {
  const type = chainType ?? detectChainType(address);

  if (type === "evm") {
    const isValid = /^0x[0-9a-fA-F]{40}$/.test(address);
    return {
      address,
      isValid,
      type: "unknown",
      checksummed: isValid ? toChecksumAddress(address) : address,
      chainType: "evm",
    };
  }

  if (type === "bitcoin") {
    // Basic Bitcoin address validation (P2PKH, P2SH, Bech32)
    const isValid =
      /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(address) ||
      /^bc1[a-zA-HJ-NP-Z0-9]{25,90}$/.test(address) ||
      /^tb1[a-zA-HJ-NP-Z0-9]{25,90}$/.test(address);
    return {
      address,
      isValid,
      type: "unknown",
      checksummed: address,
      chainType: "bitcoin",
    };
  }

  return {
    address,
    isValid: false,
    type: "unknown",
    checksummed: address,
    chainType: "evm",
  };
}

/**
 * Detect chain type from address format.
 */
function detectChainType(address: string): "evm" | "bitcoin" {
  if (address.startsWith("0x")) return "evm";
  if (
    address.startsWith("1") ||
    address.startsWith("3") ||
    address.startsWith("bc1") ||
    address.startsWith("tb1")
  ) {
    return "bitcoin";
  }
  return "evm";
}

/**
 * Detect if an address is an EOA or contract by checking its code.
 * Requires @openscan/network-connectors as a peer dependency.
 */
export async function detectAddressType(
  address: string,
  // biome-ignore lint/suspicious/noExplicitAny: NetworkClient type from peer dep
  client: any,
): Promise<AddressInfo> {
  const info = validateAddress(address);
  if (!info.isValid) return info;

  try {
    const result = await client.execute("eth_getCode", [address, "latest"]);
    if (result.success && result.data && result.data !== "0x") {
      info.type = "contract";
    } else {
      info.type = "eoa";
    }
  } catch {
    info.type = "unknown";
  }

  return info;
}
