import { hexToNumber } from "@openscan/utils";
import type { SupportedNetwork } from "@openscan/network-connectors";
import type {
  Algorithm,
  AlgorithmResult,
  TxHistoryParams,
  TxHistoryPage,
  TxHistoryEntry,
  TxSearchOptions,
  TxSearchResult,
} from "../shared/types.js";

const SUPPORTED_CHAINS = [1, 10, 56, 137, 8453, 42161, 43114, 31337, 11155111];
const INITIAL_RANGE = 100_000;
const MAX_SEGMENTS = 8;
const BATCH_SIZE = 8;

interface EthTransaction {
  hash: string;
  blockNumber: string;
  from: string;
  to: string | null;
  value: string;
  gas: string;
  gasPrice: string;
  input: string;
  nonce: string;
}

interface EthTransactionReceipt {
  status: string;
  gasUsed: string;
  transactionHash: string;
  logs?: Array<{
    topics?: string[];
    data?: string;
  }>;
}

interface EthBlock {
  number: string;
  timestamp: string;
  transactions: (string | EthTransaction)[];
}

interface AddressState {
  nonce: number;
  balance: bigint;
}

// biome-ignore lint/suspicious/noExplicitAny: RPC client from dynamic peer dep import
type RpcClient = {
  execute: <T>(method: string, params: any[]) => Promise<{ success: boolean; data?: T | null }>;
  close: () => Promise<void>;
};

function toHex(n: number): string {
  return `0x${n.toString(16)}`;
}

async function batchExecute<T>(
  tasks: Array<() => Promise<T>>,
  batchSize: number,
): Promise<T[]> {
  const results: T[] = [];
  for (let i = 0; i < tasks.length; i += batchSize) {
    const batch = tasks.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map((fn) => fn()));
    results.push(...batchResults);
  }
  return results;
}

export class TransactionHistoryAlgorithm
  implements Algorithm<TxHistoryParams, TxHistoryPage>
{
  readonly name = "tx-history";
  readonly description =
    "Retrieve transaction history for an address via binary search on state changes";
  readonly supportedChains = SUPPORTED_CHAINS;

  private client: RpcClient | null = null;
  private nonceCache = new Map<string, number>();
  private balanceCache = new Map<string, bigint>();
  private rpcCalls = 0;

  /**
   * Initialize with an externally-provided RPC client.
   * Use this when integrating with an app that manages its own client lifecycle.
   * The caller is responsible for closing the client.
   */
  initClient(client: RpcClient): void {
    this.client = client;
  }

  /** Clear internal nonce/balance caches. Call between different address searches. */
  clearCache(): void {
    this.nonceCache.clear();
    this.balanceCache.clear();
  }

  // -- State queries --

  private async getNonce(address: string, block: number): Promise<number> {
    const key = `${address}:${block}`;
    const cached = this.nonceCache.get(key);
    if (cached !== undefined) return cached;
    const client = this.client!;
    const result = await client.execute<string>("eth_getTransactionCount", [
      address,
      toHex(block),
    ]);
    this.rpcCalls++;
    const nonce = Number(hexToNumber(result.data || "0x0"));
    this.nonceCache.set(key, nonce);
    return nonce;
  }

  private async getBalance(address: string, block: number): Promise<bigint> {
    const key = `${address}:${block}`;
    const cached = this.balanceCache.get(key);
    if (cached !== undefined) return cached;
    const client = this.client!;
    const result = await client.execute<string>("eth_getBalance", [
      address,
      toHex(block),
    ]);
    this.rpcCalls++;
    const balance = BigInt(result.data || "0x0");
    this.balanceCache.set(key, balance);
    return balance;
  }

  private async getState(address: string, block: number): Promise<AddressState> {
    const [nonce, balance] = await Promise.all([
      this.getNonce(address, block),
      this.getBalance(address, block),
    ]);
    return { nonce, balance };
  }

  private async getStatesInBatches(
    address: string,
    blocks: number[],
  ): Promise<Map<number, AddressState>> {
    const results = new Map<number, AddressState>();
    const tasks = blocks.map((block) => async () => {
      const state = await this.getState(address, block);
      return { block, state };
    });
    const batchResults = await batchExecute(tasks, BATCH_SIZE);
    for (const { block, state } of batchResults) {
      results.set(block, state);
    }
    return results;
  }

  // -- Segmentation --

  private getOptimalSegmentCount(
    startState: AddressState,
    endState: AddressState,
    blockRange: number,
  ): number {
    const nonceDelta = endState.nonce - startState.nonce;
    const balanceChanged = startState.balance !== endState.balance;

    if (nonceDelta === 0 && !balanceChanged) return 0;
    if (blockRange <= 100) return 2;

    if (nonceDelta > 0) {
      if (nonceDelta <= 2) return 2;
      if (nonceDelta <= 10) return 4;
      return MAX_SEGMENTS;
    }

    return 2;
  }

  private calculateBoundaries(
    startBlock: number,
    endBlock: number,
    segmentCount: number,
  ): number[] {
    const segmentSize = Math.floor((endBlock - startBlock) / segmentCount);
    const boundaries: number[] = [startBlock];
    for (let i = 1; i < segmentCount; i++) {
      boundaries.push(startBlock + segmentSize * i);
    }
    boundaries.push(endBlock);
    return boundaries;
  }

  // -- Range finding --

  /**
   * Find the smallest recent block range containing address activity.
   * Uses exponential (galloping) search from the given block, doubling each step.
   * Returns null if the address has no on-chain activity.
   */
  async findRecentActivityRange(
    address: string,
    latestBlock?: number,
    signal?: AbortSignal,
  ): Promise<{ fromBlock: number; toBlock: number } | null> {
    if (!latestBlock) {
      const result = await this.client!.execute<string>("eth_blockNumber", []);
      this.rpcCalls++;
      if (!result.data) return null;
      latestBlock = Number(hexToNumber(result.data));
    }

    const latestState = await this.getState(address, latestBlock);
    if (latestState.nonce === 0 && latestState.balance === 0n) return null;

    let range = INITIAL_RANGE;
    let prevBoundary = latestBlock;

    while (true) {
      if (signal?.aborted) return null;
      const boundary = Math.max(latestBlock - range, 0);
      const boundaryState = await this.getState(address, boundary);

      if (
        boundaryState.nonce !== latestState.nonce ||
        boundaryState.balance !== latestState.balance
      ) {
        return { fromBlock: boundary, toBlock: prevBoundary };
      }

      if (boundary === 0) break;
      prevBoundary = boundary;
      range *= 2;
    }

    return { fromBlock: 0, toBlock: latestBlock };
  }

  /**
   * Get the block range and total sent transaction count for an address.
   * Uses binary search on nonce only — much faster than a full transaction search.
   */
  async getTransactionRange(
    address: string,
  ): Promise<{ startBlock: number; endBlock: number; totalSent: number } | null> {
    const client = this.client!;
    const blockResult = await client.execute<string>("eth_blockNumber", []);
    this.rpcCalls++;
    if (!blockResult.data) return null;

    const latestBlock = Number(hexToNumber(blockResult.data));
    const currentNonce = await this.getNonce(address, latestBlock);
    if (currentNonce === 0) return null;

    // Binary search for first block where nonce became 1 (first sent tx)
    let lo = 0;
    let hi = latestBlock;
    while (lo < hi) {
      const mid = Math.floor((lo + hi) / 2);
      const nonce = await this.getNonce(address, mid);
      if (nonce >= 1) {
        hi = mid;
      } else {
        lo = mid + 1;
      }
    }
    const startBlock = lo;

    // Binary search for first block where nonce reached currentNonce (last sent tx)
    lo = startBlock;
    hi = latestBlock;
    while (lo < hi) {
      const mid = Math.floor((lo + hi) / 2);
      const nonce = await this.getNonce(address, mid);
      if (nonce >= currentNonce) {
        hi = mid;
      } else {
        lo = mid + 1;
      }
    }
    const endBlock = lo;

    return { startBlock, endBlock, totalSent: currentNonce };
  }

  // -- Binary search --

  private async findActivityBlocks(
    address: string,
    startBlock: number,
    endBlock: number,
    startState: AddressState,
    endState: AddressState,
    maxBlocks: number,
    foundBlocks: Set<number>,
    signal?: AbortSignal,
  ): Promise<void> {
    if (signal?.aborted) return;
    if (foundBlocks.size >= maxBlocks) return;

    if (endBlock - startBlock <= 1) {
      const nonceChanged = startState.nonce !== endState.nonce;
      const balanceChanged = startState.balance !== endState.balance;
      if (nonceChanged || balanceChanged) {
        foundBlocks.add(endBlock);
      }
      return;
    }

    const blockRange = endBlock - startBlock;
    const segmentCount = this.getOptimalSegmentCount(startState, endState, blockRange);
    if (segmentCount === 0) return;

    if (segmentCount <= 2) {
      const midBlock = Math.floor((startBlock + endBlock) / 2);
      const midState = await this.getState(address, midBlock);

      const rightChanged =
        midState.nonce !== endState.nonce || midState.balance !== endState.balance;
      const leftChanged =
        startState.nonce !== midState.nonce || startState.balance !== midState.balance;

      if (rightChanged) {
        await this.findActivityBlocks(
          address, midBlock, endBlock, midState, endState, maxBlocks, foundBlocks, signal,
        );
      }
      if (leftChanged && foundBlocks.size < maxBlocks) {
        await this.findActivityBlocks(
          address, startBlock, midBlock, startState, midState, maxBlocks, foundBlocks, signal,
        );
      }
      return;
    }

    // Multi-segment path
    const boundaries = this.calculateBoundaries(startBlock, endBlock, segmentCount);
    const internalBlocks = boundaries.slice(1, -1);
    const stateMap = await this.getStatesInBatches(address, internalBlocks);
    stateMap.set(startBlock, startState);
    stateMap.set(endBlock, endState);

    for (let i = segmentCount - 1; i >= 0; i--) {
      if (signal?.aborted) break;
      if (foundBlocks.size >= maxBlocks) break;
      const segStart = boundaries[i] as number;
      const segEnd = boundaries[i + 1] as number;
      const segStartState = stateMap.get(segStart);
      const segEndState = stateMap.get(segEnd);
      if (!segStartState || !segEndState) continue;

      const hasChanges =
        segStartState.nonce !== segEndState.nonce ||
        segStartState.balance !== segEndState.balance;

      if (hasChanges) {
        await this.findActivityBlocks(
          address, segStart, segEnd, segStartState, segEndState, maxBlocks, foundBlocks, signal,
        );
      }
    }
  }

  // -- Block transaction fetching --

  private async fetchBlockReceipts(
    blockNum: number,
  ): Promise<Map<string, EthTransactionReceipt>> {
    const client = this.client!;
    const receipts = new Map<string, EthTransactionReceipt>();
    try {
      const result = await client.execute<EthTransactionReceipt[]>(
        "eth_getBlockReceipts",
        [toHex(blockNum)],
      );
      this.rpcCalls++;
      if (result.data && Array.isArray(result.data)) {
        for (const receipt of result.data) {
          if (receipt?.transactionHash) {
            receipts.set(receipt.transactionHash.toLowerCase(), receipt);
          }
        }
        return receipts;
      }
    } catch {
      // Not supported — caller will use individual fetches
    }
    return receipts;
  }

  private async fetchIndividualReceipts(
    hashes: string[],
  ): Promise<Map<string, EthTransactionReceipt>> {
    const client = this.client!;
    const receipts = new Map<string, EthTransactionReceipt>();
    const tasks = hashes.map((hash) => async () => {
      const result = await client.execute<EthTransactionReceipt>(
        "eth_getTransactionReceipt",
        [hash],
      );
      this.rpcCalls++;
      if (result.data) receipts.set(hash.toLowerCase(), result.data);
    });
    await batchExecute(tasks, BATCH_SIZE);
    return receipts;
  }

  private async fetchBlockTransactions(
    blockNum: number,
    normalizedAddress: string,
    signal?: AbortSignal,
  ): Promise<TxHistoryEntry[]> {
    if (signal?.aborted) return [];
    const client = this.client!;
    const blockResult = await client.execute<EthBlock>("eth_getBlockByNumber", [
      toHex(blockNum),
      true,
    ]);
    this.rpcCalls++;
    const block = blockResult.data;
    if (!block?.transactions) return [];

    const timestamp = Number(hexToNumber(block.timestamp || "0x0"));

    const directTxs: Array<{ tx: EthTransaction; type: "sent" | "received" }> = [];
    const otherTxs: EthTransaction[] = [];

    for (const raw of block.transactions) {
      if (typeof raw === "string") continue;
      const txFrom = raw.from?.toLowerCase();
      const txTo = raw.to?.toLowerCase();
      const isSent = txFrom === normalizedAddress;
      const isReceived = txTo === normalizedAddress;

      if (isSent) {
        directTxs.push({ tx: raw, type: "sent" });
      } else if (isReceived) {
        directTxs.push({ tx: raw, type: "received" });
      } else {
        otherTxs.push(raw);
      }
    }

    // Fetch receipts
    let receipts = await this.fetchBlockReceipts(blockNum);
    if (receipts.size === 0) {
      const neededHashes = directTxs.map(({ tx }) => tx.hash);
      if (directTxs.length === 0) {
        for (const tx of otherTxs) neededHashes.push(tx.hash);
      }
      if (neededHashes.length > 0) {
        receipts = await this.fetchIndividualReceipts(neededHashes);
      }
    }

    const buildEntry = (
      tx: EthTransaction,
      type: "sent" | "received" | "internal",
      receipt: EthTransactionReceipt | undefined,
    ): TxHistoryEntry => ({
      hash: tx.hash,
      blockNumber: blockNum,
      timestamp,
      from: tx.from,
      to: tx.to,
      value: tx.value,
      gasUsed: receipt?.gasUsed ?? tx.gas,
      gasPrice: tx.gasPrice,
      status: receipt?.status === "0x1" ? "success" : "failure",
      type,
      methodId: tx.input.length >= 10 ? tx.input.slice(0, 10) : undefined,
    });

    const entries: TxHistoryEntry[] = [];

    for (const { tx, type } of directTxs) {
      entries.push(buildEntry(tx, type, receipts.get(tx.hash.toLowerCase())));
    }

    // Internal transaction detection when no direct match found
    if (directTxs.length === 0 && otherTxs.length > 0) {
      const strippedAddress = normalizedAddress.replace("0x", "");

      const inputMatches: EthTransaction[] = [];
      const remaining: EthTransaction[] = [];

      for (const tx of otherTxs) {
        if (tx.input?.toLowerCase().includes(strippedAddress)) {
          inputMatches.push(tx);
        } else {
          remaining.push(tx);
        }
      }

      for (const tx of inputMatches) {
        entries.push(buildEntry(tx, "internal", receipts.get(tx.hash.toLowerCase())));
      }

      if (inputMatches.length === 0) {
        for (const tx of remaining) {
          const receipt = receipts.get(tx.hash.toLowerCase());
          const logs = receipt?.logs || [];
          let found = false;

          for (const log of logs) {
            if (log.topics) {
              for (const topic of log.topics) {
                if (topic.toLowerCase().includes(strippedAddress)) {
                  found = true;
                  break;
                }
              }
            }
            if (!found && log.data?.toLowerCase().includes(strippedAddress)) {
              found = true;
            }
            if (found) break;
          }

          if (found) {
            entries.push(buildEntry(tx, "internal", receipt));
          }
        }
      }
    }

    return entries;
  }

  // -- Public search methods --

  /**
   * Search for all transactions of an address using binary search on state changes.
   * Supports progress callbacks, streaming results, and abort signals.
   *
   * Requires `initClient()` to be called first with an RPC client.
   * The caller is responsible for closing the client.
   */
  async searchAddressActivity(
    address: string,
    options: TxSearchOptions = {},
  ): Promise<TxSearchResult> {
    const {
      limit = 100,
      fromBlock: optFromBlock,
      toBlock: optToBlock,
      onProgress,
      onTransactionsFound,
      signal,
    } = options;

    const searchStart = performance.now();
    this.rpcCalls = 0;
    const normalizedAddress = address.toLowerCase();

    // Resolve latest block
    const blockResult = await this.client!.execute<string>("eth_blockNumber", []);
    this.rpcCalls++;
    if (!blockResult.data) {
      return {
        blocks: [],
        entries: [],
        stats: {
          totalBlocks: 0, totalTxs: 0, sentCount: 0, receivedCount: 0,
          internalCount: 0, rpcCalls: this.rpcCalls, elapsedMs: 0,
        },
      };
    }

    const latestBlock = Number(hexToNumber(blockResult.data));
    let toBlock = optToBlock ?? latestBlock;
    let fromBlock: number;

    if (optFromBlock !== undefined) {
      fromBlock = optFromBlock;
    } else {
      onProgress?.({
        phase: "searching", current: 0, total: 0,
        message: "Finding activity range...",
      });
      const range = await this.findRecentActivityRange(normalizedAddress, toBlock, signal);
      if (!range || signal?.aborted) {
        return {
          blocks: [],
          entries: [],
          stats: {
            totalBlocks: 0, totalTxs: 0, sentCount: 0, receivedCount: 0,
            internalCount: 0, rpcCalls: this.rpcCalls,
            elapsedMs: performance.now() - searchStart,
          },
        };
      }
      fromBlock = range.fromBlock;
      toBlock = Math.min(toBlock, range.toBlock);
    }

    onProgress?.({
      phase: "searching", current: 0, total: 0,
      message: "Binary searching for transaction blocks...",
      blockRange: { from: fromBlock, to: toBlock },
    });

    const [startState, endState] = await Promise.all([
      this.getState(normalizedAddress, fromBlock),
      this.getState(normalizedAddress, toBlock),
    ]);

    if (startState.nonce === endState.nonce && startState.balance === endState.balance) {
      return {
        blocks: [],
        entries: [],
        stats: {
          totalBlocks: 0, totalTxs: 0, sentCount: 0, receivedCount: 0,
          internalCount: 0, rpcCalls: this.rpcCalls,
          elapsedMs: performance.now() - searchStart,
        },
      };
    }

    // Find blocks with activity
    const foundBlocks = new Set<number>();
    await this.findActivityBlocks(
      normalizedAddress, fromBlock, toBlock, startState, endState,
      limit > 0 ? limit + 1 : Number.MAX_SAFE_INTEGER,
      foundBlocks, signal,
    );

    const sortedBlocks = Array.from(foundBlocks).sort((a, b) => b - a);
    const blocksToFetch = limit > 0 ? sortedBlocks.slice(0, limit) : sortedBlocks;

    // Fetch transactions
    onProgress?.({
      phase: "fetching", current: 0, total: blocksToFetch.length,
      message: `Fetching transactions from ${blocksToFetch.length} blocks...`,
    });

    const allEntries: TxHistoryEntry[] = [];
    let fetched = 0;

    for (let i = 0; i < blocksToFetch.length; i += 4) {
      if (signal?.aborted) break;
      const batch = blocksToFetch.slice(i, i + 4);
      const tasks = batch.map(
        (block) => () => this.fetchBlockTransactions(block, normalizedAddress, signal),
      );
      const batchResults = await batchExecute(tasks, 4);
      const batchEntries = batchResults.flat();
      allEntries.push(...batchEntries);
      fetched += batch.length;

      if (batchEntries.length > 0) {
        onTransactionsFound?.(batchEntries);
      }
      onProgress?.({
        phase: "fetching", current: fetched, total: blocksToFetch.length,
        message: `Fetching transactions (${fetched}/${blocksToFetch.length})...`,
      });
    }

    allEntries.sort((a, b) => b.blockNumber - a.blockNumber);

    const stats = {
      totalBlocks: blocksToFetch.length,
      totalTxs: allEntries.length,
      sentCount: allEntries.filter((e) => e.type === "sent").length,
      receivedCount: allEntries.filter((e) => e.type === "received").length,
      internalCount: allEntries.filter((e) => e.type === "internal").length,
      rpcCalls: this.rpcCalls,
      elapsedMs: performance.now() - searchStart,
    };

    return { blocks: blocksToFetch, entries: allEntries, stats };
  }

  // -- Algorithm interface (execute) --

  /**
   * Algorithm interface entry point used by CLI and LangChain adapter.
   * Creates its own client and manages the full lifecycle.
   */
  async execute(params: TxHistoryParams): Promise<AlgorithmResult<TxHistoryPage>> {
    const startTime = Date.now();
    this.rpcCalls = 0;
    this.clearCache();

    const nc = await import("@openscan/network-connectors");
    const config = {
      type: (params.strategyType ?? "fallback") as "fallback" | "parallel" | "race",
      rpcUrls: params.rpcUrls,
    };
    const client = nc.ClientFactory.createClient(
      params.chainId as SupportedNetwork,
      config,
    );
    this.initClient(client as unknown as RpcClient);

    try {
      const result = await this.searchAddressActivity(params.address, {
        limit: params.pagination?.pageSize ?? 100,
        fromBlock:
          params.pagination?.fromBlock !== undefined
            ? Number(params.pagination.fromBlock)
            : undefined,
        toBlock:
          params.pagination?.cursor
            ? Number(params.pagination.cursor)
            : params.pagination?.toBlock !== undefined
              ? Number(params.pagination.toBlock)
              : undefined,
      });

      // Get latest block for archivalRequired calculation
      const latestResult = await client.execute<string>("eth_blockNumber", []);
      const latestBlock = latestResult.data
        ? Number(hexToNumber(latestResult.data))
        : 0;

      const lowestBlock = result.blocks[result.blocks.length - 1];
      const hasMore = result.blocks.length > (params.pagination?.pageSize ?? 100);
      const pageEntries = hasMore
        ? result.entries.slice(0, params.pagination?.pageSize ?? 100)
        : result.entries;
      const nextCursor =
        hasMore && lowestBlock !== undefined ? String(lowestBlock - 1) : undefined;

      const fromBlock = result.blocks.length > 0
        ? result.blocks[result.blocks.length - 1] as number
        : latestBlock;

      return {
        success: true,
        data: {
          entries: pageEntries,
          address: params.address,
          chainId: params.chainId,
        },
        pagination: { hasMore, nextCursor },
        metadata: {
          chainId: params.chainId,
          duration: Date.now() - startTime,
          rpcCalls: this.rpcCalls,
          archivalRequired: fromBlock < latestBlock - 128,
          timestamp: Date.now(),
        },
      };
    } catch (err) {
      return {
        success: false,
        error: {
          code: "RPC_ERROR",
          message: err instanceof Error ? err.message : "Unknown error",
        },
      };
    } finally {
      await client.close();
      this.client = null;
    }
  }
}
