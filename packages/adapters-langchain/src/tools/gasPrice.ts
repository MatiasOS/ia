import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { GasPriceHistoryAlgorithm } from "@openscan/algorithms";
import { resolveRpcUrls } from "../rpc.js";

export const getGasPriceHistory = tool(
  async ({ chainId, rpcUrls, alchemyKey, targetBlock }) => {
    const resolvedRpcUrls = rpcUrls ?? resolveRpcUrls({ chainId, alchemyKey });
    const algo = new GasPriceHistoryAlgorithm();
    const result = await algo.execute({
      chainId,
      rpcUrls: resolvedRpcUrls,
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
      rpcUrls: z
        .array(z.string())
        .optional()
        .describe("RPC endpoint URLs (auto-resolved from public RPCs if omitted)"),
      alchemyKey: z.string().optional().describe("Alchemy API key for premium RPC access"),
      targetBlock: z
        .number()
        .optional()
        .describe("Block number to sample back to (defaults to ~1000 blocks back)"),
    }),
  },
);
