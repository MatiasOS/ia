import { validateAddress, detectAddressType } from "@openscan/utils";
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

  // If chain ID is provided, try to detect EOA vs contract
  if (ctx.rpcUrls.length > 0) {
    try {
      const nc = await import("@openscan/network-connectors");
      const config = {
        type: ctx.strategyType as "fallback" | "parallel" | "race",
        rpcUrls: ctx.rpcUrls,
      };
      const client = nc.ClientFactory.createClient(ctx.chainId as SupportedNetwork, config);
      try {
        const fullInfo = await detectAddressType(address, client);
        return { exitCode: 0, data: fullInfo };
      } finally {
        await client.close();
      }
    } catch {
      // Fall through to return basic validation info
    }
  }

  return { exitCode: 0, data: info };
};

export const addressTypeCommand: CommandDefinition = {
  name: "address-type",
  description: "Detect address type (EOA/contract)",
  args: [{ name: "address", description: "Address to check", required: true, type: "string" }],
  flags: [],
  handler,
};

export { handler as addressTypeHandler };
