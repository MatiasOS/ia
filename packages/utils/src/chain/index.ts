/**
 * Chain-specific normalization utilities.
 */

/**
 * Convert satoshis to BTC.
 */
export function satoshiToBtc(satoshi: number | bigint): string {
  const sat = BigInt(satoshi);
  const btc = Number(sat) / 100_000_000;
  return btc.toFixed(8).replace(/\.?0+$/, "");
}

/**
 * Convert BTC to satoshis.
 */
export function btcToSatoshi(btc: string | number): bigint {
  const value = typeof btc === "string" ? Number.parseFloat(btc) : btc;
  return BigInt(Math.round(value * 100_000_000));
}

/**
 * Normalize a chain ID to a consistent format.
 * EVM chains use numbers, Bitcoin chains use CAIP-2/BIP122 strings.
 */
export function normalizeChainId(chainId: number | string): number | string {
  if (typeof chainId === "string" && chainId.startsWith("bip122:")) {
    return chainId;
  }
  return typeof chainId === "string" ? Number.parseInt(chainId, 10) : chainId;
}

/**
 * Check if a chain ID represents a Bitcoin network.
 */
export function isBitcoinChain(chainId: number | string): boolean {
  return typeof chainId === "string" && chainId.startsWith("bip122:");
}

/**
 * Check if a chain ID represents an EVM network.
 */
export function isEVMChain(chainId: number | string): boolean {
  return typeof chainId === "number" || !chainId.startsWith("bip122:");
}

/**
 * Parameters for building OpenScan verification links.
 */
export interface VerifyLinkParams {
  chainId: number | string;
  address?: string;
  txHash?: string;
  blockNumber?: number | string;
}

const OPENSCAN_BASE = "https://openscan.eth.link/#";

/**
 * Build a single OpenScan verification URL based on available parameters.
 * Priority: txHash > address > blockNumber > chain-only.
 */
export function buildVerifyUrl(params: VerifyLinkParams): string {
  const base = `${OPENSCAN_BASE}/${params.chainId}`;
  if (params.txHash) return `${base}/tx/${params.txHash}`;
  if (params.address) return `${base}/address/${params.address}`;
  if (params.blockNumber !== undefined) return `${base}/block/${params.blockNumber}`;
  return base;
}

/**
 * Build an array of OpenScan verification links for a result.
 */
export function buildVerificationLinks(params: VerifyLinkParams): string[] {
  return [buildVerifyUrl(params)];
}
