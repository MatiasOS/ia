import { GasPriceHistoryAlgorithm } from "@openscan/algorithms";
import type { CommandDefinition, CommandHandler } from "../../types.js";

const handler: CommandHandler = async (args, ctx) => {
  const algo = new GasPriceHistoryAlgorithm();
  const result = await algo.execute({
    chainId: ctx.chainId,
    rpcUrls: ctx.rpcUrls,
    strategyType: ctx.strategyType,
    targetBlock: args["target-block"] as number | undefined,
    granularity: args.granularity as "block" | "hour" | "day" | undefined,
  });

  return {
    exitCode: result.success ? 0 : 1,
    data: result.data,
    error: result.error,
    metadata: result.metadata,
  };
};

export const gasPriceCommand: CommandDefinition = {
  name: "gas-price",
  description: "Get gas price history for a network",
  args: [],
  flags: [
    { name: "target-block", description: "Block number to sample back to", type: "number" },
    {
      name: "granularity",
      description: "Data granularity: block, hour, day",
      type: "string",
      default: "block",
    },
  ],
  handler,
};

export { handler as gasPriceHandler };
