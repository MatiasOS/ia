import type { CommandDefinition } from "@openscan/cli";
import type { CommandResult } from "@openscan/cli";
import type { OpenClawManifest } from "./types.js";

export type {
  OpenClawToolAdapter,
  OpenClawManifest,
  CapabilityDescriptor,
  SkillRegistration,
  ToolRegistration,
} from "./types.js";

/**
 * Build an OpenClaw manifest from registered CLI commands.
 */
export function buildOpenClawManifest(
  commands: CommandDefinition[],
): OpenClawManifest {
  return {
    name: "@openscan/blockchain-toolkit",
    version: "0.1.0",
    description: "On-chain blockchain analysis tools, algorithms, and skills",
    capabilities: [
      {
        name: "transaction-analysis",
        description: "Transaction history and analysis",
        chains: [1, 10, 56, 137, 8453, 42161, 43114],
      },
      {
        name: "gas-analysis",
        description: "Gas price history and trends",
        chains: [1, 10, 56, 137, 8453, 42161, 43114],
      },
      {
        name: "token-tracking",
        description: "Token balance history",
        chains: [1, 10, 56, 137, 8453, 42161, 43114],
      },
    ],
    skills: [
      {
        name: "blockchain-analysis",
        description: "On-chain analysis skill",
        skillPath: "./skills/blockchain-analysis/SKILL.md",
      },
    ],
    tools: commands.map((c) => ({
      name: c.name,
      schema: buildSchemaFromCommand(c),
      execute: (params: Record<string, unknown>): Promise<CommandResult> =>
        c.handler(params, {
          outputFormat: "json",
          chainId: (params.chainId as number) ?? 1,
          rpcUrls: (params.rpcUrls as string[]) ?? [],
          strategyType: "fallback",
          verbose: false,
        }),
    })),
  };
}

function buildSchemaFromCommand(command: CommandDefinition): Record<string, unknown> {
  const properties: Record<string, unknown> = {};
  const required: string[] = [];

  for (const arg of command.args) {
    properties[arg.name] = { type: arg.type, description: arg.description };
    if (arg.required) required.push(arg.name);
  }

  for (const flag of command.flags) {
    properties[flag.name] = {
      type: flag.type,
      description: flag.description,
      ...(flag.default !== undefined ? { default: flag.default } : {}),
    };
  }

  return {
    type: "object",
    properties,
    required,
  };
}
