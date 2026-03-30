import { TransactionHistoryAlgorithm } from "@openscan/algorithms";
import type { CommandDefinition, CommandHandler } from "../../types.js";

const handler: CommandHandler = async (args, ctx) => {
  const algo = new TransactionHistoryAlgorithm();
  const result = await algo.execute({
    address: args.address as string,
    chainId: ctx.chainId,
    rpcUrls: ctx.rpcUrls,
    strategyType: ctx.strategyType,
    pagination: {
      fromBlock: args["from-block"] as string | undefined,
      toBlock: args["to-block"] as string | undefined,
      pageSize: args["page-size"] as number | undefined,
    },
  });

  return {
    exitCode: result.success ? 0 : 1,
    data: result.data,
    error: result.error,
    metadata: result.metadata,
  };
};

export const txHistoryCommand: CommandDefinition = {
  name: "algo:tx-history",
  description: "Get transaction history for an address",
  args: [{ name: "address", description: "Target address", required: true, type: "string" }],
  flags: [
    { name: "from-block", description: "Start block", type: "string" },
    { name: "to-block", description: "End block", type: "string" },
    { name: "page-size", description: "Results per page", type: "number", default: 100 },
  ],
  handler,
};

export { handler as txHistoryHandler };
