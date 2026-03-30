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
  name: "namespace:command-name",  // e.g., "algo:gas-price", "util:address-type"
  description: "...",
  args: [],
  flags: [{ name: "flag-name", description: "...", type: "string" }],
  handler,
};

export { handler as fooHandler };
```

## Key Rules

- **Naming**: Commands use `namespace:command-name` format. Namespaces: `algo` (wraps algorithms) and `util` (wraps utility functions).
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

1. Create `src/commands/{namespace}/{name}.ts` with `CommandDefinition` + handler
2. Export command definition and handler from `src/index.ts`
3. Add handler to `src/handlers/index.ts`
4. Run `pnpm --filter @openscan/cli typecheck`
