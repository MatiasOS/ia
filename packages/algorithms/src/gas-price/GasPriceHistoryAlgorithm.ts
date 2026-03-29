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
const DEFAULT_TARGET_DISTANCE = 1000;

interface BlockHeader {
  number: string;
  timestamp: string;
  baseFeePerGas?: string;
  gasUsed: string;
  gasLimit: string;
}

export class GasPriceHistoryAlgorithm implements Algorithm<GasPriceParams, GasPricePage> {
  readonly name = "gas-price-history";
  readonly description = "Retrieve gas price history using exponential block sampling";
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
      // 1. Get current block number
      const blockNumResult = await client.execute<string>("eth_blockNumber", []);
      rpcCalls++;

      if (!blockNumResult.success || !blockNumResult.data) {
        return {
          success: false,
          error: {
            code: "RPC_ERROR",
            message: blockNumResult.errors?.[0]?.error ?? "eth_blockNumber failed",
          },
        };
      }

      const currentBlock = Number(hexToNumber(blockNumResult.data));

      // 2. Resolve target block
      let targetBlock: number;
      if (params.targetBlock != null) {
        targetBlock =
          typeof params.targetBlock === "string"
            ? Number(hexToNumber(params.targetBlock))
            : params.targetBlock;
      } else {
        targetBlock = Math.max(0, currentBlock - DEFAULT_TARGET_DISTANCE);
      }

      // 3. Generate exponential sample points
      const sampleBlocks: number[] = [];
      let offset = 1;
      while (currentBlock - offset >= targetBlock) {
        sampleBlocks.push(currentBlock - offset);
        offset *= 2;
      }
      // Always include the target block itself
      if (sampleBlocks.length === 0 || sampleBlocks[sampleBlocks.length - 1] !== targetBlock) {
        sampleBlocks.push(targetBlock);
      }

      // 4. Fetch block headers for each sample point
      const entries: GasPriceEntry[] = [];

      for (const blockNum of sampleBlocks) {
        const blockResult = await client.execute<BlockHeader>(
          "eth_getBlockByNumber",
          [`0x${blockNum.toString(16)}`, false],
        );
        rpcCalls++;

        if (!blockResult.success || !blockResult.data) {
          continue;
        }

        const block = blockResult.data;
        const gasUsed = Number(hexToNumber(block.gasUsed));
        const gasLimit = Number(hexToNumber(block.gasLimit));
        const gasUsedRatio = gasLimit > 0 ? gasUsed / gasLimit : 0;
        const baseFee = block.baseFeePerGas ?? "0x0";

        entries.push({
          blockNumber: blockNum,
          timestamp: Number(hexToNumber(block.timestamp)),
          baseFee,
          avgGasPrice: weiToGwei(baseFee),
          minGasPrice: weiToGwei(baseFee),
          maxGasPrice: weiToGwei(baseFee),
          gasUsedRatio,
        });
      }

      return {
        success: true,
        data: { entries, chainId: params.chainId },
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
