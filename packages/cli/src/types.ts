import type { OpError, OpMetadata } from "@openscan/utils";

export interface CommandDefinition {
  name: string;
  description: string;
  args: ArgDefinition[];
  flags: FlagDefinition[];
  handler: CommandHandler;
}

export interface ArgDefinition {
  name: string;
  description: string;
  required: boolean;
  type: "string" | "number" | "boolean";
}

export interface FlagDefinition {
  name: string;
  alias?: string;
  description: string;
  type: "string" | "number" | "boolean";
  default?: unknown;
}

export type OutputFormat = "json" | "table" | "stream";

export interface CommandContext {
  outputFormat: OutputFormat;
  chainId: number | string;
  rpcUrls: string[];
  strategyType: "fallback" | "parallel" | "race";
  verbose: boolean;
}

export interface CommandResult<T = unknown> {
  exitCode: number;
  data?: T;
  error?: OpError;
  metadata?: OpMetadata;
}

export type CommandHandler = (
  args: Record<string, unknown>,
  ctx: CommandContext,
) => Promise<CommandResult>;

export interface CommandRegistry {
  register(command: CommandDefinition): void;
  get(name: string): CommandDefinition | undefined;
  list(): CommandDefinition[];
  execute(name: string, args: Record<string, unknown>, ctx: CommandContext): Promise<CommandResult>;
}
