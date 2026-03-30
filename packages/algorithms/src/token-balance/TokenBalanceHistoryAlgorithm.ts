import { hexToNumber } from "@openscan/utils";
import type { SupportedNetwork } from "@openscan/network-connectors";
import type {
  Algorithm,
  AlgorithmResult,
  TokenBalanceParams,
  TokenBalancePage,
  TokenBalanceEntry,
} from "../shared/types.js";

const SUPPORTED_CHAINS = [1, 10, 56, 137, 8453, 42161, 43114, 31337, 11155111];

// ERC-20 Transfer event signature
const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

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

export class TokenBalanceHistoryAlgorithm
  implements Algorithm<TokenBalanceParams, TokenBalancePage>
{
  readonly name = "token-balance-history";
  readonly description = "Track ERC-20 token balance changes via Transfer event logs";
  readonly supportedChains = SUPPORTED_CHAINS;

  async execute(params: TokenBalanceParams): Promise<AlgorithmResult<TokenBalancePage>> {
    const startTime = Date.now();
    let rpcCalls = 0;

    const nc = await import("@openscan/network-connectors");

    const config = {
      type: (params.strategyType ?? "fallback") as "fallback" | "parallel" | "race",
      rpcUrls: params.rpcUrls,
    };
    const client = nc.ClientFactory.createClient(params.chainId as SupportedNetwork, config);

    try {
      const paddedAddress = `0x${params.address.slice(2).toLowerCase().padStart(64, "0")}`;

      const fromBlock = params.pagination?.fromBlock
        ? typeof params.pagination.fromBlock === "number"
          ? `0x${params.pagination.fromBlock.toString(16)}`
          : params.pagination.fromBlock
        : "earliest";
      const toBlock = params.pagination?.toBlock
        ? typeof params.pagination.toBlock === "number"
          ? `0x${params.pagination.toBlock.toString(16)}`
          : params.pagination.toBlock
        : "latest";

      // Get Transfer events FROM address (outgoing)
      const outgoingResult = await client.execute<EthLog[]>("eth_getLogs", [
        {
          address: params.tokenAddress,
          topics: [TRANSFER_TOPIC, paddedAddress],
          fromBlock,
          toBlock,
        },
      ]);
      rpcCalls++;

      // Get Transfer events TO address (incoming)
      const incomingResult = await client.execute<EthLog[]>("eth_getLogs", [
        {
          address: params.tokenAddress,
          topics: [TRANSFER_TOPIC, null, paddedAddress],
          fromBlock,
          toBlock,
        },
      ]);
      rpcCalls++;

      const allLogs: Array<EthLog & { isIncoming: boolean }> = [];

      if (outgoingResult.success && outgoingResult.data) {
        for (const log of outgoingResult.data) {
          allLogs.push({ ...log, isIncoming: false });
        }
      }
      if (incomingResult.success && incomingResult.data) {
        for (const log of incomingResult.data) {
          allLogs.push({ ...log, isIncoming: true });
        }
      }

      // Sort by block number then log index
      allLogs.sort((a, b) => {
        const blockDiff = Number(hexToNumber(a.blockNumber)) - Number(hexToNumber(b.blockNumber));
        if (blockDiff !== 0) return blockDiff;
        return Number(hexToNumber(a.logIndex)) - Number(hexToNumber(b.logIndex));
      });

      let runningBalance = 0n;
      const entries: TokenBalanceEntry[] = allLogs.map((log) => {
        const value = BigInt(log.data);
        const change = log.isIncoming ? value : -value;
        runningBalance += change;

        return {
          blockNumber: Number(hexToNumber(log.blockNumber)),
          timestamp: 0,
          balance: runningBalance.toString(),
          change: change.toString(),
          txHash: log.transactionHash,
        };
      });

      return {
        success: true,
        data: {
          entries,
          address: params.address,
          tokenAddress: params.tokenAddress,
          chainId: params.chainId,
        },
        metadata: {
          chainId: params.chainId,
          duration: Date.now() - startTime,
          rpcCalls,
          archivalRequired: fromBlock === "earliest",
          timestamp: Date.now(),
        },
      };
    } finally {
      await client.close();
    }
  }
}
