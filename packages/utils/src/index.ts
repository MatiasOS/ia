// Types
export type {
  OpResult,
  OpError,
  OpMetadata,
  AddressInfo,
  DecodedInput,
  DecodedParam,
  DecodedEvent,
  EIP712Domain,
  EIP712Types,
} from "./types.js";

// ABI
export { encodeABI, decodeABI } from "./abi/index.js";
export type { AbiFunction, AbiEvent, AbiInput } from "./abi/index.js";

// Transaction
export { decodeTxInput } from "./tx/index.js";

// Events
export { decodeEventLog } from "./events/index.js";
export type { LogEntry } from "./events/index.js";

// Address
export { validateAddress, detectAddressType } from "./address/index.js";

// Hex
export {
  hexToNumber,
  numberToHex,
  hexToUtf8,
  padHex,
  isHexString,
  stripTrailingZeros,
} from "./hex/index.js";

// Units
export {
  formatUnits,
  parseUnits,
  weiToEther,
  etherToWei,
  weiToGwei,
  gweiToWei,
} from "./units/index.js";

// Signatures
export { parseSignature, formatSignature } from "./signatures/index.js";
export type { ParsedSignature } from "./signatures/index.js";

// Chain
export {
  satoshiToBtc,
  btcToSatoshi,
  normalizeChainId,
  isBitcoinChain,
  isEVMChain,
  buildVerifyUrl,
  buildVerificationLinks,
} from "./chain/index.js";
export type { VerifyLinkParams } from "./chain/index.js";

// EIP-712
export { encodeTypedData, hashTypedData } from "./eip712/index.js";
