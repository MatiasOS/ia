# @openscan/cli

## Command Pattern

Each command file exports a `CommandDefinition` and its raw handler:

```typescript
const handler: CommandHandler = async (args, ctx) => {
  // ctx: CommandContext has chainId, rpcUrls, strategyType, outputFormat, verbose
  const algo = new FooAlgorithm();
  const result = await algo.execute({ chainId: ctx.chainId, rpcUrls: ctx.rpcUrls, ... });
  return { exitCode: result.success ? 0 : 1, data: result.data, error: result.error, metadata: result.metadata };
};

export const fooCommand: CommandDefinition = {
  name: "command-name",  // e.g., "gas-price", "address-type"
  description: "...",
  args: [],
  flags: [{ name: "flag-name", description: "...", type: "string" }],
  handler,
};

export { handler as fooHandler };
```

## Key Rules

- **Naming**: Commands use `command-name` format (kebab-case). Files are organized under `algo/` (wraps algorithms) and `util/` (wraps utility functions) directories.
- **citty framework**: The `bin.ts` entry point uses citty. Command definitions are adapted to citty format there.
- **Dual entry**: `bin.ts` for CLI usage, `index.ts` for programmatic imports.
- **Handler barrel**: All handlers are re-exported from `src/handlers/index.ts` for the OpenClaw adapter.

## RPC Resolution

- `--rpc` is **optional**. If omitted, public RPCs are auto-resolved from `@openscan/metadata` for the given chain.
- `--alchemy-key` (or `ALCHEMY_API_KEY` env var) adds a premium Alchemy endpoint as the first fallback URL.
- If `--rpc` is provided, it takes precedence (no auto-resolution).
- Resolution logic lives in `src/rpc/resolve.ts` and is exported from `index.ts` for use by adapters.
- `CommandContext.rpcUrls` is always populated by the resolver before reaching handlers.

## Directory Structure

```
src/
├── bin.ts                          # CLI entry (citty)
├── index.ts                        # Programmatic exports
├── registry.ts                     # CommandRegistry class
├── types.ts                        # CommandDefinition, CommandHandler, CommandContext, CommandResult
├── commands/
│   ├── algo/{command}.ts           # Algorithm-wrapping commands
│   └── util/{command}.ts           # Utility commands
├── handlers/
│   └── index.ts                    # Handler barrel export
├── output/
│   └── formatters.ts               # JSON, table, stream formatters
└── rpc/
    ├── index.ts                    # Barrel export
    └── resolve.ts                  # resolveRpcUrls, getAlchemyUrl
```

## Adding a New Command

1. **Create the command file** at `src/commands/{namespace}/{name}.ts`:
   - `{namespace}` is `algo` (wraps an algorithm) or `util` (wraps a utility)
   - `{name}` is camelCase (e.g., `gasPrice.ts`, `addressType.ts`)

   **For algorithm commands** — instantiate the algorithm and delegate:

   ```typescript
   import { FooAlgorithm } from "@openscan/algorithms";
   import type { CommandDefinition, CommandHandler } from "../../types.js";

   const handler: CommandHandler = async (args, ctx) => {
     const algo = new FooAlgorithm();
     const result = await algo.execute({
       chainId: ctx.chainId,
       rpcUrls: ctx.rpcUrls,
       strategyType: ctx.strategyType,
       customFlag: args["custom-flag"] as string | undefined,
     });
     return {
       exitCode: result.success ? 0 : 1,
       data: result.data,
       error: result.error,
       metadata: result.metadata,
     };
   };

   export const fooCommand: CommandDefinition = {
     name: "foo",
     description: "...",
     args: [],
     flags: [{ name: "custom-flag", description: "...", type: "string" }],
     handler,
   };

   export { handler as fooHandler };
   ```

   **For utility commands** — use RPC directly with try/finally:

   ```typescript
   import { validateAddress } from "@openscan/utils";
   import type { CommandDefinition, CommandHandler } from "../../types.js";

   const handler: CommandHandler = async (args, ctx) => {
     const address = args.address as string;
     const nc = await import("@openscan/network-connectors");
     const client = nc.ClientFactory.createClient(ctx.chainId, {
       type: ctx.strategyType,
       rpcUrls: ctx.rpcUrls,
     });
     try {
       // ... RPC calls ...
       return { exitCode: 0, data: { ... } };
     } finally {
       await client.close();
     }
   };

   export const barCommand: CommandDefinition = {
     name: "bar",
     description: "...",
     args: [{ name: "address", description: "...", required: true, type: "string" }],
     flags: [],
     handler,
   };

   export { handler as barHandler };
   ```

2. **Export from `src/index.ts`**:

   ```typescript
   export { fooCommand, fooHandler } from "./commands/{namespace}/{name}.js";
   ```

3. **Add handler to `src/handlers/index.ts`**:

   ```typescript
   export { fooHandler } from "../commands/{namespace}/{name}.js";
   ```

4. **Register in `src/bin.ts`**:
   - Import the command definition
   - Call `registry.register(fooCommand)`
   - Add command-specific flags to the citty `args` object
   - Map those flags to `commandArgs` in the `run()` function

5. **Verify**: `pnpm --filter @openscan/cli typecheck && pnpm --filter @openscan/cli test`
