import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { TokenBalanceHistoryAlgorithm } from "@openscan/algorithms";
import { validateAddress } from "@openscan/utils";

export const getTokenBalanceHistory = tool(
  async ({ address, tokenAddress, chainId, rpcUrls }) => {
    const addrInfo = validateAddress(address);
    if (!addrInfo.isValid) {
      return `Invalid address: ${address}`;
    }

    const algo = new TokenBalanceHistoryAlgorithm();
    const result = await algo.execute({
      address,
      tokenAddress,
      chainId,
      rpcUrls,
    });

    if (!result.success) {
      return `Error: ${result.error?.message ?? "Unknown error"}`;
    }
    return JSON.stringify(result.data, null, 2);
  },
  {
    name: "get_token_balance_history",
    description: "Track ERC-20 token balance changes for an address via Transfer event logs",
    schema: z.object({
      address: z.string().describe("The holder address to track"),
      tokenAddress: z.string().describe("The ERC-20 token contract address"),
      chainId: z.number().describe("EVM chain ID"),
      rpcUrls: z.array(z.string()).describe("RPC endpoint URLs"),
    }),
  },
);
