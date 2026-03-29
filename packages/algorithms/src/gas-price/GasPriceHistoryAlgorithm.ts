import { hexToNumber, weiToGwei } from "@openscan/utils";
import type { SupportedNetwork } from "@openscan/network-connectors";
import type {
  Algorithm,
  AlgorithmResult,
  GasPriceParams,
  GasPricePage,
  GasPriceEntry,
} from "../shared/types.js";

const SUPPORTED_CHAINS = [1, 10, 56, 137, 8453, 42161, 43114, 31337, 11155111];

export class GasPriceHistoryAlgorithm implements Algorithm<GasPriceParams, GasPricePage> {
  readonly name = "gas-price-history";
  readonly description = "Retrieve gas price history using eth_feeHistory";
  readonly supportedChains = SUPPORTED_CHAINS;

  async execute(params: GasPriceParams): Promise<AlgorithmResult<GasPricePage>> {
    const startTime = Date.now();
    let rpcCalls = 0;

    // Dynamic import to keep network-connectors as peer dep
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
      const blockCount = params.pagination?.pageSize ?? 100;
      const newestBlock = params.pagination?.toBlock ?? "latest";

      const feeResult = await client.execute<{
        baseFeePerGas: string[];
        gasUsedRatio: number[];
        oldestBlock: string;
      }>("eth_feeHistory", [
        `0x${blockCount.toString(16)}`,
        typeof newestBlock === "number" ? `0x${newestBlock.toString(16)}` : newestBlock,
        [25, 50, 75],
      ]);
      rpcCalls++;

      if (!feeResult.success || !feeResult.data) {
        return {
          success: false,
          error: {
            code: "RPC_ERROR",
            message: feeResult.errors?.[0]?.error ?? "eth_feeHistory failed",
          },
        };
      }

      const { baseFeePerGas, gasUsedRatio, oldestBlock } = feeResult.data;
      const startBlock = Number(hexToNumber(oldestBlock));

      const entries: GasPriceEntry[] = baseFeePerGas.slice(0, -1).map((baseFee, i) => ({
        blockNumber: startBlock + i,
        timestamp: 0,
        baseFee,
        avgGasPrice: weiToGwei(baseFee),
        minGasPrice: weiToGwei(baseFee),
        maxGasPrice: weiToGwei(baseFee),
        gasUsedRatio: gasUsedRatio[i] ?? 0,
      }));

      return {
        success: true,
        data: { entries, chainId: params.chainId },
        pagination: {
          hasMore: startBlock > 0,
          nextCursor: startBlock > 0 ? String(startBlock - 1) : undefined,
        },
        metadata: {
          chainId: params.chainId,
          duration: Date.now() - startTime,
          rpcCalls,
          archivalRequired: false,
          timestamp: Date.now(),
        },
      };
    } finally {
      await client.close();
    }
  }
}
