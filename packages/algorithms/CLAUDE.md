# @openscan/algorithms

## Algorithm Class Pattern

Each algorithm is a class implementing `Algorithm<TParams, TResult>` from `shared/types.ts`:

```typescript
export class FooAlgorithm implements Algorithm<FooParams, FooPage> {
  readonly name = "foo";
  readonly description = "...";
  readonly supportedChains = SUPPORTED_CHAINS;

  async execute(params: FooParams): Promise<AlgorithmResult<FooPage>> {
    const startTime = Date.now();
    let rpcCalls = 0;
    const nc = await import("@openscan/network-connectors");
    const client = nc.ClientFactory.createClient(params.chainId, { ... });
    try {
      // ... algorithm logic ...
    } finally {
      await client.close();
    }
  }
}
```

## Key Rules

- **Dynamic peer dep import**: `@openscan/network-connectors` is imported via `await import(...)` at the top of `execute()`. Use `biome-ignore` for `any` types if needed.
- **ClientFactory + try/finally**: Always create client via `ClientFactory.createClient()` and close in `finally` block.
- **Metadata tracking**: Every result must include `metadata` with `chainId`, `duration`, `rpcCalls`, `archivalRequired`, `timestamp`.
- **Type definitions**: All param/result types go in `shared/types.ts`, NOT in the algorithm file. Local RPC response shapes (e.g., `EthLog`) can be defined locally.

## Directory Structure

```
src/
├── {algorithm-name}/
│   └── {PascalName}Algorithm.ts
├── shared/
│   └── types.ts              # All param/result types
└── index.ts                  # Barrel export (class + types)
```

## Supported Chains

Defined as a `const` array at module top: `[1, 10, 56, 137, 8453, 42161, 43114, 31337, 11155111]`

## Adding a New Algorithm

1. Define `{PascalName}Params` and `{PascalName}Page` in `shared/types.ts`
2. Create `src/{algorithm-name}/{PascalName}Algorithm.ts`
3. Export from `src/index.ts`
4. Run `pnpm --filter @openscan/algorithms typecheck`
