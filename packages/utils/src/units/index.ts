const ETH_DECIMALS = 18;
const GWEI_DECIMALS = 9;

/**
 * Format a bigint value with the given number of decimal places.
 */
export function formatUnits(value: string | bigint, decimals: number): string {
  const bi = typeof value === "string" ? BigInt(value) : value;
  const negative = bi < 0n;
  const abs = negative ? -bi : bi;
  const divisor = 10n ** BigInt(decimals);
  const whole = abs / divisor;
  const remainder = abs % divisor;
  const remainderStr = remainder.toString().padStart(decimals, "0").replace(/0+$/, "");
  const result = remainderStr ? `${whole}.${remainderStr}` : whole.toString();
  return negative ? `-${result}` : result;
}

/**
 * Parse a decimal string into a bigint with the given number of decimal places.
 */
export function parseUnits(value: string, decimals: number): bigint {
  const [whole, fraction = ""] = value.split(".");
  const paddedFraction = fraction.slice(0, decimals).padEnd(decimals, "0");
  return BigInt(`${whole}${paddedFraction}`);
}

/**
 * Convert wei to ether.
 */
export function weiToEther(wei: string | bigint): string {
  return formatUnits(wei, ETH_DECIMALS);
}

/**
 * Convert ether to wei.
 */
export function etherToWei(ether: string): bigint {
  return parseUnits(ether, ETH_DECIMALS);
}

/**
 * Convert wei to gwei.
 */
export function weiToGwei(wei: string | bigint): string {
  return formatUnits(wei, GWEI_DECIMALS);
}

/**
 * Convert gwei to wei.
 */
export function gweiToWei(gwei: string): bigint {
  return parseUnits(gwei, GWEI_DECIMALS);
}
