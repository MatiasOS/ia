// Programmatic entry point - exports handlers and registry
export { CommandRegistry } from "./registry.js";
export { formatOutput } from "./output/formatters.js";

// Command definitions
export { txHistoryCommand } from "./commands/algo/txHistory.js";
export { gasPriceCommand } from "./commands/algo/gasPrice.js";
export { tokenBalanceCommand } from "./commands/algo/tokenBalance.js";
export { addressTypeCommand } from "./commands/util/addressType.js";
export { decodeInputCommand } from "./commands/util/decodeInput.js";
export { balanceCommand } from "./commands/util/balance.js";

// Handlers for direct invocation
export {
  txHistoryHandler,
  gasPriceHandler,
  tokenBalanceHandler,
  addressTypeHandler,
  decodeInputHandler,
  balanceHandler,
} from "./handlers/index.js";

// RPC resolution
export { resolveRpcUrls, getAlchemyUrl } from "./rpc/index.js";
export type { ResolveRpcOptions } from "./rpc/index.js";

// Types
export type {
  CommandDefinition,
  CommandHandler,
  CommandContext,
  CommandResult,
  CommandRegistry as ICommandRegistry,
  ArgDefinition,
  FlagDefinition,
  OutputFormat,
} from "./types.js";
