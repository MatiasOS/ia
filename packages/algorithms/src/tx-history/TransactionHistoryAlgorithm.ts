import { hexToNumber } from "@openscan/utils";
import type { SupportedNetwork } from "@openscan/network-connectors";
import type {
  Algorithm,
  AlgorithmResult,
  TxHistoryParams,
  TxHistoryPage,
  TxHistoryEntry,
} from "../shared/types.js";

const SUPPORTED_CHAINS = [1, 10, 56, 137, 8453, 42161, 43114, 31337, 11155111];
const DEFAULT_BLOCK_WINDOW = 10_000;

interface EthLog {
  address: string;
  topics: string[];
  data: string;
  blockNumber: string;
  transactionHash: string;
  transactionIndex: string;
  blockHash: string;
  logIndex: string;
  removed: boolean;
}

interface EthTransaction {
  hash: string;
  blockNumber: string;
  from: string;
  to: string | null;
  value: string;
  gas: string;
  gasPrice: string;
  input: string;
}

interface EthTransactionReceipt {
  status: string;
  gasUsed: string;
}

export class TransactionHistoryAlgorithm
  implements Algorithm<TxHistoryParams, TxHistoryPage>
{
  readonly name = "tx-history";
  readonly description = "Retrieve transaction history for an address via on-chain log scanning";
  readonly supportedChains = SUPPORTED_CHAINS;

  async execute(params: TxHistoryParams): Promise<AlgorithmResult<TxHistoryPage>> {
    const startTime = Date.now();
    let rpcCalls = 0;

    const nc = await import("@openscan/network-connectors");

    const config = {
      type: (params.strategyType ?? "fallback") as "fallback" | "parallel" | "race",
      rpcUrls: params.rpcUrls,
    };
    const client = nc.ClientFactory.createClient(
      params.chainId as SupportedNetwork,
      config,
    );

    try {
      // Get latest block number
      const latestResult = await client.execute<string>("eth_blockNumber", []);
      rpcCalls++;

      if (!latestResult.success || !latestResult.data) {
        return {
          success: false,
          error: { code: "RPC_ERROR", message: "Failed to get block number" },
        };
      }

      const latestBlock = Number(hexToNumber(latestResult.data));
      const fromBlock = params.pagination?.fromBlock
        ? Number(params.pagination.fromBlock)
        : Math.max(0, latestBlock - DEFAULT_BLOCK_WINDOW);
      const toBlock = params.pagination?.toBlock
        ? Number(params.pagination.toBlock)
        : latestBlock;
      const pageSize = params.pagination?.pageSize ?? 100;

      const paddedAddress = `0x${params.address.slice(2).toLowerCase().padStart(64, "0")}`;

      // Scan Transfer events (ERC-20 topic) where address is sender or receiver
      const transferTopic =
        "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

      // Get outgoing transfers
      const outgoingResult = await client.execute<EthLog[]>("eth_getLogs", [
        {
          fromBlock: `0x${fromBlock.toString(16)}`,
          toBlock: `0x${toBlock.toString(16)}`,
          topics: [transferTopic, paddedAddress],
        },
      ]);
      rpcCalls++;

      // Get incoming transfers
      const incomingResult = await client.execute<EthLog[]>("eth_getLogs", [
        {
          fromBlock: `0x${fromBlock.toString(16)}`,
          toBlock: `0x${toBlock.toString(16)}`,
          topics: [transferTopic, null, paddedAddress],
        },
      ]);
      rpcCalls++;

      const allLogs: EthLog[] = [];
      if (outgoingResult.success && outgoingResult.data) {
        allLogs.push(...outgoingResult.data);
      }
      if (incomingResult.success && incomingResult.data) {
        allLogs.push(...incomingResult.data);
      }

      // Deduplicate by transaction hash and sort by block number descending
      const txHashSet = new Set<string>();
      const uniqueTxHashes: string[] = [];
      for (const log of allLogs) {
        if (!txHashSet.has(log.transactionHash)) {
          txHashSet.add(log.transactionHash);
          uniqueTxHashes.push(log.transactionHash);
        }
      }

      // Fetch transaction details for unique hashes (limited to pageSize)
      const entries: TxHistoryEntry[] = [];
      const hashesToFetch = uniqueTxHashes.slice(0, pageSize);

      for (const txHash of hashesToFetch) {
        const txResult = await client.execute<EthTransaction>(
          "eth_getTransactionByHash",
          [txHash],
        );
        rpcCalls++;

        if (!txResult.success || !txResult.data) continue;
        const tx = txResult.data;

        const receiptResult = await client.execute<EthTransactionReceipt>(
          "eth_getTransactionReceipt",
          [txHash],
        );
        rpcCalls++;

        const receipt = receiptResult.data;

        entries.push({
          hash: tx.hash,
          blockNumber: Number(hexToNumber(tx.blockNumber)),
          timestamp: 0,
          from: tx.from,
          to: tx.to,
          value: tx.value,
          gasUsed: receipt?.gasUsed ?? tx.gas,
          gasPrice: tx.gasPrice,
          status: receipt?.status === "0x1" ? "success" : "failure",
          methodId: tx.input.length >= 10 ? tx.input.slice(0, 10) : undefined,
        });
      }

      // Sort by block number descending
      entries.sort((a, b) => b.blockNumber - a.blockNumber);

      return {
        success: true,
        data: {
          entries,
          address: params.address,
          chainId: params.chainId,
        },
        pagination: {
          hasMore: uniqueTxHashes.length > pageSize,
          nextCursor:
            uniqueTxHashes.length > pageSize ? String(fromBlock) : undefined,
        },
        metadata: {
          chainId: params.chainId,
          duration: Date.now() - startTime,
          rpcCalls,
          archivalRequired: fromBlock < latestBlock - 128,
          timestamp: Date.now(),
        },
      };
    } finally {
      await client.close();
    }
  }
}
