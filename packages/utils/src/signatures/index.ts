export interface ParsedSignature {
  r: string;
  s: string;
  v: number;
}

/**
 * Parse a hex-encoded signature into r, s, v components.
 */
export function parseSignature(sig: string): ParsedSignature {
  const cleaned = sig.startsWith("0x") ? sig.slice(2) : sig;
  if (cleaned.length !== 130) {
    throw new Error(`Invalid signature length: expected 130 hex chars, got ${cleaned.length}`);
  }

  return {
    r: `0x${cleaned.slice(0, 64)}`,
    s: `0x${cleaned.slice(64, 128)}`,
    v: Number.parseInt(cleaned.slice(128, 130), 16),
  };
}

/**
 * Format r, s, v components into a hex-encoded signature.
 */
export function formatSignature(r: string, s: string, v: number): string {
  const rClean = r.startsWith("0x") ? r.slice(2) : r;
  const sClean = s.startsWith("0x") ? s.slice(2) : s;
  return `0x${rClean.padStart(64, "0")}${sClean.padStart(64, "0")}${v.toString(16).padStart(2, "0")}`;
}
