#!/usr/bin/env node
import { defineCommand, runMain } from "citty";
import { CommandRegistry } from "./registry.js";
import { txHistoryCommand } from "./commands/algo/txHistory.js";
import { gasPriceCommand } from "./commands/algo/gasPrice.js";
import { tokenBalanceCommand } from "./commands/algo/tokenBalance.js";
import { addressTypeCommand } from "./commands/util/addressType.js";
import { decodeInputCommand } from "./commands/util/decodeInput.js";
import { balanceCommand } from "./commands/util/balance.js";
import { formatOutput } from "./output/formatters.js";
import type { CommandContext, OutputFormat } from "./types.js";

// Initialize command registry
const registry = new CommandRegistry();
registry.register(txHistoryCommand);
registry.register(gasPriceCommand);
registry.register(tokenBalanceCommand);
registry.register(addressTypeCommand);
registry.register(decodeInputCommand);
registry.register(balanceCommand);

const main = defineCommand({
  meta: {
    name: "openscan",
    version: "0.1.0",
    description: "OpenScan CLI - On-chain blockchain analysis tools",
  },
  args: {
    command: {
      type: "positional",
      description: "Command to execute (e.g., algo:tx-history, util:balance)",
      required: true,
    },
    args: {
      type: "positional",
      description: "Command arguments",
      required: false,
    },
    chain: {
      type: "string",
      description: "Chain ID (default: 1)",
      default: "1",
    },
    rpc: {
      type: "string",
      description: "RPC URL(s), comma-separated",
    },
    output: {
      type: "string",
      description: "Output format: json, table, stream",
      default: "json",
    },
    strategy: {
      type: "string",
      description: "RPC strategy: fallback, parallel, race",
      default: "fallback",
    },
    verbose: {
      type: "boolean",
      description: "Verbose output",
      default: false,
    },
    // Command-specific flags
    "from-block": { type: "string", description: "Start block" },
    "to-block": { type: "string", description: "End block" },
    "page-size": { type: "string", description: "Results per page" },
    "token-address": { type: "string", alias: "t", description: "Token contract address" },
    abi: { type: "string", description: "Path to ABI JSON file" },
    granularity: { type: "string", description: "Data granularity" },
  },
  async run({ args }) {
    const commandName = args.command;
    const command = registry.get(commandName);

    if (!command) {
      console.error(`Unknown command: ${commandName}`);
      console.error(`\nAvailable commands:`);
      for (const cmd of registry.list()) {
        console.error(`  ${cmd.name.padEnd(25)} ${cmd.description}`);
      }
      process.exit(1);
    }

    if (!args.rpc) {
      console.error("Error: --rpc flag is required");
      process.exit(1);
    }

    const ctx: CommandContext = {
      chainId: Number.isNaN(Number(args.chain)) ? args.chain : Number(args.chain),
      rpcUrls: args.rpc.split(",").map((u: string) => u.trim()),
      outputFormat: args.output as OutputFormat,
      strategyType: args.strategy as "fallback" | "parallel" | "race",
      verbose: args.verbose,
    };

    // Build command args from positional args and flags
    const commandArgs: Record<string, unknown> = {};

    // First positional arg after command name
    if (args.args) {
      const firstArg = command.args[0];
      if (firstArg) {
        commandArgs[firstArg.name] = args.args;
      }
    }

    // Copy relevant flags
    if (args["from-block"]) commandArgs["from-block"] = args["from-block"];
    if (args["to-block"]) commandArgs["to-block"] = args["to-block"];
    if (args["page-size"]) commandArgs["page-size"] = Number(args["page-size"]);
    if (args["token-address"]) commandArgs["token-address"] = args["token-address"];
    if (args.abi) commandArgs.abi = args.abi;
    if (args.granularity) commandArgs.granularity = args.granularity;

    // For commands that take data as first arg
    if (commandName === "util:decode-input" && args.args) {
      commandArgs.data = args.args;
    }

    const result = await registry.execute(commandName, commandArgs, ctx);
    const output = formatOutput(result, ctx.outputFormat);

    if (output) {
      console.log(output);
    }

    process.exit(result.exitCode);
  },
});

runMain(main);
