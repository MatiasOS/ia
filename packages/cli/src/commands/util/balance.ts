import { weiToEther, validateAddress } from "@openscan/utils";
import type { SupportedNetwork } from "@openscan/network-connectors";
import type { CommandDefinition, CommandHandler } from "../../types.js";

const handler: CommandHandler = async (args, ctx) => {
  const address = args.address as string;
  const info = validateAddress(address);

  if (!info.isValid) {
    return {
      exitCode: 1,
      error: { code: "INVALID_ADDRESS", message: `Invalid address: ${address}` },
    };
  }

  if (ctx.rpcUrls.length === 0) {
    return {
      exitCode: 1,
      error: { code: "NO_RPC", message: "At least one RPC URL is required" },
    };
  }

  const nc = await import("@openscan/network-connectors");
  const config = {
    type: ctx.strategyType as "fallback" | "parallel" | "race",
    rpcUrls: ctx.rpcUrls,
  };
  const client = nc.ClientFactory.createClient(ctx.chainId as SupportedNetwork, config);

  try {
    const result = await client.execute<string>("eth_getBalance", [address, "latest"]);

    if (!result.success || !result.data) {
      return {
        exitCode: 1,
        error: {
          code: "RPC_ERROR",
          message: result.errors?.[0]?.error ?? "Failed to get balance",
        },
      };
    }

    const balanceWei = result.data;
    const balanceEther = weiToEther(BigInt(balanceWei));

    return {
      exitCode: 0,
      data: {
        address,
        balanceWei,
        balanceEther,
        chainId: ctx.chainId,
      },
    };
  } finally {
    await client.close();
  }
};

export const balanceCommand: CommandDefinition = {
  name: "util:balance",
  description: "Get native token balance for an address",
  args: [{ name: "address", description: "Address to check", required: true, type: "string" }],
  flags: [],
  handler,
};

export { handler as balanceHandler };
