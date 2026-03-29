import { GasPriceHistoryAlgorithm } from "@openscan/algorithms";
import type { CommandDefinition, CommandHandler } from "../../types.js";

const handler: CommandHandler = async (args, ctx) => {
  const algo = new GasPriceHistoryAlgorithm();
  const result = await algo.execute({
    chainId: ctx.chainId,
    rpcUrls: ctx.rpcUrls,
    strategyType: ctx.strategyType,
    pagination: {
      toBlock: args["to-block"] as string | undefined,
      pageSize: args["page-size"] as number | undefined,
    },
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
  name: "algo:gas-price",
  description: "Get gas price history for a network",
  args: [],
  flags: [
    { name: "to-block", description: "End block", type: "string" },
    { name: "page-size", description: "Number of blocks to query", type: "number", default: 100 },
    { name: "granularity", description: "Data granularity: block, hour, day", type: "string", default: "block" },
  ],
  handler,
};

export { handler as gasPriceHandler };
