/** Universal result envelope for all operations */
export interface OpResult<T> {
  success: boolean;
  data?: T;
  error?: OpError;
  metadata?: OpMetadata;
}

export interface OpError {
  code: string;
  message: string;
  details?: unknown;
}

export interface OpMetadata {
  chainId: number | string;
  duration: number;
  rpcCalls: number;
  archivalRequired: boolean;
  timestamp: number;
}

export interface AddressInfo {
  address: string;
  isValid: boolean;
  type: "eoa" | "contract" | "unknown";
  checksummed: string;
  chainType: "evm" | "bitcoin";
}

export interface DecodedInput {
  methodId: string;
  methodName?: string;
  params: DecodedParam[];
}

export interface DecodedParam {
  name: string;
  type: string;
  value: unknown;
}

export interface DecodedEvent {
  name: string;
  signature: string;
  params: DecodedParam[];
}

export interface EIP712Domain {
  name?: string;
  version?: string;
  chainId?: number;
  verifyingContract?: string;
  salt?: string;
}

export interface EIP712Types {
  [key: string]: Array<{ name: string; type: string }>;
}
