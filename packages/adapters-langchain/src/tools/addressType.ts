import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { validateAddress, detectAddressType } from "@openscan/utils";
import type { SupportedNetwork } from "@openscan/network-connectors";
import { resolveRpcUrls } from "../rpc.js";
import { injectVerificationLinks } from "../verify.js";

export const getAddressType = tool(
  async ({ address, chainId, rpcUrls, alchemyKey }) => {
    const info = validateAddress(address);
    if (!info.isValid) return `Invalid address: ${address}`;

    const resolvedRpcUrls = rpcUrls ?? resolveRpcUrls({ chainId, alchemyKey });
    const nc = await import("@openscan/network-connectors");
    const client = nc.ClientFactory.createClient(chainId as SupportedNetwork, {
      type: "fallback" as const,
      rpcUrls: resolvedRpcUrls,
    });
    try {
      const fullInfo = await detectAddressType(address, client);
      return JSON.stringify(injectVerificationLinks(fullInfo, { chainId, address }), null, 2);
    } finally {
      await client.close();
    }
  },
  {
    name: "detect_address_type",
    description: "Detect whether a blockchain address is an EOA, contract, or proxy",
    schema: z.object({
      address: z.string().describe("Blockchain address to check"),
      chainId: z.number().describe("EVM chain ID"),
      rpcUrls: z
        .array(z.string())
        .optional()
        .describe("RPC endpoint URLs (auto-resolved from public RPCs if omitted)"),
      alchemyKey: z.string().optional().describe("Alchemy API key for premium RPC access"),
    }),
  },
);
