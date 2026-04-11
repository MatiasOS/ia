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

1. **Define types** in `shared/types.ts`:
   - `{PascalName}Params extends AlgorithmParams` — input parameters
   - `{PascalName}Entry` — individual result item shape
   - `{PascalName}Page` — page of results (typically includes `entries: {PascalName}Entry[]`, `address`, `chainId`)

2. **Create the algorithm** at `src/{algorithm-name}/{PascalName}Algorithm.ts`:

   ```typescript
   import type { Algorithm, AlgorithmResult, {PascalName}Params, {PascalName}Page } from "../shared/types.js";

   const SUPPORTED_CHAINS = [1, 10, 56, 137, 8453, 42161, 43114, 31337, 11155111];

   export class {PascalName}Algorithm implements Algorithm<{PascalName}Params, {PascalName}Page> {
     readonly name = "{algorithm-name}";
     readonly description = "...";
     readonly supportedChains = SUPPORTED_CHAINS;

     async execute(params: {PascalName}Params): Promise<AlgorithmResult<{PascalName}Page>> {
       const startTime = Date.now();
       let rpcCalls = 0;

       // biome-ignore lint/suspicious/noExplicitAny: peer dep types
       const nc = await import("@openscan/network-connectors") as any;
       const client = nc.ClientFactory.createClient(params.chainId, {
         type: params.strategyType ?? "fallback",
         rpcUrls: params.rpcUrls,
       });

       try {
         // ... algorithm logic (increment rpcCalls on each RPC call) ...
         return {
           success: true,
           data: { entries, address: params.address, chainId: params.chainId },
           metadata: {
             chainId: params.chainId,
             duration: Date.now() - startTime,
             rpcCalls,
             archivalRequired: false,
             timestamp: Date.now(),
           },
         };
       } finally {
         await client.close();
       }
     }
   }
   ```

   - Local RPC response shapes (e.g., `EthLog`, `BlockHeader`) can be defined in the algorithm file
   - Use `biome-ignore` for `any` types on the dynamic import

3. **Export from `src/index.ts`**:

   ```typescript
   export { {PascalName}Algorithm } from "./{algorithm-name}/{PascalName}Algorithm.js";
   // Also export the new types from shared/types.ts
   ```

4. **Add tests** at `tests/{algorithm-name}.test.ts`:

   ```typescript
   import { describe, it, mock, beforeEach } from "node:test";
   import assert from "node:assert/strict";

   const mockExecute = mock.fn<(...args: unknown[]) => Promise<unknown>>();
   const mockClose = mock.fn(async () => {});

   mock.module("@openscan/network-connectors", {
     namedExports: {
       ClientFactory: {
         createClient: () => ({ execute: mockExecute, close: mockClose }),
       },
     },
   });

   const { {PascalName}Algorithm } = await import("../src/{algorithm-name}/{PascalName}Algorithm.js");

   describe("{PascalName}Algorithm", () => {
     beforeEach(() => { mockExecute.mock.resetCalls(); mockClose.mock.resetCalls(); });

     it("has correct name", () => {
       const algo = new {PascalName}Algorithm();
       assert.equal(algo.name, "{algorithm-name}");
     });

     it("always closes the client", async () => {
       // setup mockExecute responses...
       const algo = new {PascalName}Algorithm();
       await algo.execute({ chainId: 1, rpcUrls: ["http://localhost:8545"] });
       assert.equal(mockClose.mock.callCount(), 1);
     });
   });
   ```

   - Mock `@openscan/network-connectors` BEFORE importing the algorithm
   - Reset mocks in `beforeEach`

5. **Verify**: `pnpm --filter @openscan/algorithms typecheck && pnpm --filter @openscan/algorithms test`

6. **Downstream**: The user likely also wants to:
   - Add a CLI command (`/add-cli-command`)
   - Add a LangChain tool (`/add-langchain-tool`)
   - Add a skill rule in `skills/blockchain-exploration/rules/`
