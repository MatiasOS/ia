/**
 * Convert a hex string to a bigint.
 */
export function hexToNumber(hex: string): bigint {
  if (!hex.startsWith("0x")) {
    throw new Error(`Invalid hex string: ${hex}`);
  }
  return BigInt(hex);
}

/**
 * Convert a bigint or number to a hex string.
 */
export function numberToHex(n: bigint | number): string {
  return `0x${BigInt(n).toString(16)}`;
}

/**
 * Convert a hex string to a UTF-8 string.
 */
export function hexToUtf8(hex: string): string {
  const cleaned = hex.startsWith("0x") ? hex.slice(2) : hex;
  const bytes: number[] = [];
  for (let i = 0; i < cleaned.length; i += 2) {
    const byte = Number.parseInt(cleaned.slice(i, i + 2), 16);
    if (byte !== 0) bytes.push(byte);
  }
  return new TextDecoder().decode(new Uint8Array(bytes));
}

/**
 * Pad a hex string to a given byte length (left-padded with zeros).
 */
export function padHex(hex: string, byteLength: number): string {
  const cleaned = hex.startsWith("0x") ? hex.slice(2) : hex;
  return `0x${cleaned.padStart(byteLength * 2, "0")}`;
}

/**
 * Check if a string is a valid hex string.
 */
export function isHexString(value: string): boolean {
  return /^0x[0-9a-fA-F]*$/.test(value);
}

/**
 * Strip trailing zero bytes from hex data.
 */
export function stripTrailingZeros(hex: string): string {
  const cleaned = hex.startsWith("0x") ? hex.slice(2) : hex;
  const stripped = cleaned.replace(/(00)+$/, "");
  return `0x${stripped}`;
}
