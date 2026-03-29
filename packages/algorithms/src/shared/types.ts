import type { OpResult, OpError, OpMetadata } from "@openscan/utils";

export type { OpResult, OpError, OpMetadata };

export interface AlgorithmParams {
  chainId: number | string;
  rpcUrls: string[];
  strategyType?: "fallback" | "parallel" | "race";
}

export interface PaginationParams {
  fromBlock?: number | string;
  toBlock?: number | string;
  pageSize?: number;
  cursor?: string;
}

export interface AlgorithmResult<T> extends OpResult<T> {
  pagination?: {
    hasMore: boolean;
    nextCursor?: string;
    totalBlocks?: number;
  };
}

/** Algorithm interface contract */
export interface Algorithm<TParams, TResult> {
  readonly name: string;
  readonly description: string;
  readonly supportedChains: (number | string)[];
  execute(params: TParams): Promise<AlgorithmResult<TResult>>;
}

/** Transaction History */
export interface TxHistoryParams extends AlgorithmParams {
  address: string;
  pagination?: PaginationParams;
}

export interface TxHistoryEntry {
  hash: string;
  blockNumber: number;
  timestamp: number;
  from: string;
  to: string | null;
  value: string;
  gasUsed: string;
  gasPrice: string;
  status: "success" | "failure";
  methodId?: string;
  decodedMethod?: string;
}

export interface TxHistoryPage {
  entries: TxHistoryEntry[];
  address: string;
  chainId: number | string;
}

/** Token Balance History */
export interface TokenBalanceParams extends AlgorithmParams {
  address: string;
  tokenAddress: string;
  pagination?: PaginationParams;
}

export interface TokenBalanceEntry {
  blockNumber: number;
  timestamp: number;
  balance: string;
  change: string;
  txHash: string;
}

export interface TokenBalancePage {
  entries: TokenBalanceEntry[];
  address: string;
  tokenAddress: string;
  chainId: number | string;
}

/** Gas Price History */
export interface GasPriceParams extends AlgorithmParams {
  pagination?: PaginationParams;
  granularity?: "block" | "hour" | "day";
}

export interface GasPriceEntry {
  blockNumber: number;
  timestamp: number;
  baseFee: string;
  avgGasPrice: string;
  minGasPrice: string;
  maxGasPrice: string;
  gasUsedRatio: number;
}

export interface GasPricePage {
  entries: GasPriceEntry[];
  chainId: number | string;
}
