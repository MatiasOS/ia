import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { TransactionHistoryAlgorithm } from "@openscan/algorithms";
import { validateAddress } from "@openscan/utils";
import { resolveRpcUrls } from "../rpc.js";

export const getTransactionHistory = tool(
  async ({ address, chainId, rpcUrls, alchemyKey, pageSize }) => {
    const addrInfo = validateAddress(address);
    if (!addrInfo.isValid) {
      return `Invalid address: ${address}`;
    }

    const resolvedRpcUrls = rpcUrls ?? resolveRpcUrls({ chainId, alchemyKey });
    const algo = new TransactionHistoryAlgorithm();
    const result = await algo.execute({
      address,
      chainId,
      rpcUrls: resolvedRpcUrls,
      pagination: { pageSize },
    });

    if (!result.success) {
      return `Error: ${result.error?.message ?? "Unknown error"}`;
    }
    return JSON.stringify(result.data, null, 2);
  },
  {
    name: "get_transaction_history",
    description:
      "Get on-chain transaction history for a blockchain address by scanning Transfer event logs",
    schema: z.object({
      address: z.string().describe("The blockchain address to look up"),
      chainId: z.number().describe("EVM chain ID (1=Ethereum, 137=Polygon, etc.)"),
      rpcUrls: z
        .array(z.string())
        .optional()
        .describe("RPC endpoint URLs (auto-resolved from public RPCs if omitted)"),
      alchemyKey: z.string().optional().describe("Alchemy API key for premium RPC access"),
      pageSize: z.number().optional().default(50).describe("Max results per page"),
    }),
  },
);
