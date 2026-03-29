import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { GasPriceHistoryAlgorithm } from "@openscan/algorithms";

export const getGasPriceHistory = tool(
  async ({ chainId, rpcUrls, blockCount }) => {
    const algo = new GasPriceHistoryAlgorithm();
    const result = await algo.execute({
      chainId,
      rpcUrls,
      pagination: { pageSize: blockCount },
    });

    if (!result.success) {
      return `Error: ${result.error?.message ?? "Unknown error"}`;
    }
    return JSON.stringify(result.data, null, 2);
  },
  {
    name: "get_gas_price_history",
    description: "Get gas price history for a network using eth_feeHistory",
    schema: z.object({
      chainId: z.number().describe("EVM chain ID"),
      rpcUrls: z.array(z.string()).describe("RPC endpoint URLs"),
      blockCount: z.number().optional().default(100).describe("Number of blocks to query"),
    }),
  },
);
