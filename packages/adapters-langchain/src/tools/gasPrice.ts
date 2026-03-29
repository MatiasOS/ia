import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { GasPriceHistoryAlgorithm } from "@openscan/algorithms";

export const getGasPriceHistory = tool(
  async ({ chainId, rpcUrls, targetBlock }) => {
    const algo = new GasPriceHistoryAlgorithm();
    const result = await algo.execute({
      chainId,
      rpcUrls,
      targetBlock,
    });

    if (!result.success) {
      return `Error: ${result.error?.message ?? "Unknown error"}`;
    }
    return JSON.stringify(result.data, null, 2);
  },
  {
    name: "get_gas_price_history",
    description:
      "Get gas price history for a network by sampling blocks exponentially from latest to a target block",
    schema: z.object({
      chainId: z.number().describe("EVM chain ID"),
      rpcUrls: z.array(z.string()).describe("RPC endpoint URLs"),
      targetBlock: z
        .number()
        .optional()
        .describe("Block number to sample back to (defaults to ~1000 blocks back)"),
    }),
  },
);
