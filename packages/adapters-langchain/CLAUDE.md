# @openscan/adapters-langchain

## Key Architectural Rule

LangChain tools wrap `@openscan/algorithms` and `@openscan/utils` **DIRECTLY** — they do NOT go through the CLI. This is the opposite of the OpenClaw adapter.

## Tool Pattern

```typescript
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { resolveRpcUrls } from "../rpc.js";

export const getFoo = tool(
  async ({ chainId, rpcUrls, alchemyKey, address }) => {
    const resolvedRpcUrls = rpcUrls ?? resolveRpcUrls({ chainId, alchemyKey });
    const algo = new FooAlgorithm();
    const result = await algo.execute({ chainId, rpcUrls: resolvedRpcUrls, address });
    if (!result.success) return `Error: ${result.error?.message ?? "Unknown error"}`;
    return JSON.stringify(result.data, null, 2);
  },
  {
    name: "get_foo",                    // snake_case
    description: "...",                 // Clear description for LLM consumption
    schema: z.object({
      chainId: z.number().describe("EVM chain ID"),
      rpcUrls: z.array(z.string()).optional().describe("RPC endpoint URLs (auto-resolved if omitted)"),
      alchemyKey: z.string().optional().describe("Alchemy API key for premium RPC access"),
      address: z.string().describe("Ethereum address"),
    }),
  },
);
```

## RPC Resolution

- `rpcUrls` is **optional** in all tool schemas. When omitted, RPCs are auto-resolved from `@openscan/metadata`.
- `alchemyKey` is optional — adds a premium Alchemy endpoint as the first fallback URL.
- Resolution logic lives in `src/rpc.ts` (local copy, not imported from CLI, to preserve the architecture where LangChain wraps algorithms directly).

## Key Rules

- **Naming**: Function names use `get{Noun}` (camelCase). The `name` field in the tool config uses `snake_case`.
- **Returns strings**: Tools return JSON-serialized strings or error messages — not structured objects. This is a LangChain convention.
- **Zod schemas**: Every tool defines input validation with `z.object({...})`. Use `.describe()` on each field.
- **Peer deps**: `@langchain/core` (>=0.3.0) and `zod` (>=3.0.0) are peer dependencies.

## Adding a New Tool

1. **Create the tool file** at `src/tools/{name}.ts` (camelCase filename, e.g., `contractEvents.ts`):

   **Wrapping an algorithm:**

   ```typescript
   import { tool } from "@langchain/core/tools";
   import { z } from "zod";
   import { FooAlgorithm } from "@openscan/algorithms";
   import { resolveRpcUrls } from "../rpc.js";

   export const getFoo = tool(
     async ({ chainId, rpcUrls, alchemyKey, address }) => {
       const resolvedRpcUrls = rpcUrls ?? resolveRpcUrls({ chainId, alchemyKey });
       const algo = new FooAlgorithm();
       const result = await algo.execute({ chainId, rpcUrls: resolvedRpcUrls, address });
       if (!result.success) return `Error: ${result.error?.message ?? "Unknown error"}`;
       return JSON.stringify(result.data, null, 2);
     },
     {
       name: "get_foo",                          // snake_case
       description: "Clear description for LLM", // no code details
       schema: z.object({
         address: z.string().describe("The blockchain address"),
         chainId: z.number().describe("EVM chain ID (1=Ethereum, 137=Polygon, etc.)"),
         rpcUrls: z.array(z.string()).optional()
           .describe("RPC endpoint URLs (auto-resolved from public RPCs if omitted)"),
         alchemyKey: z.string().optional()
           .describe("Alchemy API key for premium RPC access"),
       }),
     },
   );
   ```

   **Wrapping a utility** (may need direct RPC via `network-connectors`):

   ```typescript
   import { tool } from "@langchain/core/tools";
   import { z } from "zod";
   import { someUtil } from "@openscan/utils";
   import { resolveRpcUrls } from "../rpc.js";

   export const getSomething = tool(
     async ({ address, chainId, rpcUrls, alchemyKey }) => {
       const resolvedRpcUrls = rpcUrls ?? resolveRpcUrls({ chainId, alchemyKey });
       // If RPC needed: dynamic import network-connectors, create client, try/finally close
       const nc = await import("@openscan/network-connectors");
       const client = nc.ClientFactory.createClient(chainId, {
         type: "fallback",
         rpcUrls: resolvedRpcUrls,
       });
       try {
         const result = someUtil(address, client);
         return JSON.stringify(result, null, 2);
       } finally {
         await client.close();
       }
     },
     {
       name: "get_something",
       description: "...",
       schema: z.object({ ... }),
     },
   );
   ```

   Key rules:
   - **Naming**: function = `get{Noun}` (camelCase), tool name = `get_noun` (snake_case)
   - **Returns strings only** — `JSON.stringify(result.data, null, 2)` or error message string
   - **Zod schema**: use `.describe()` on every field for LLM context
   - **RPC resolution**: always `rpcUrls ?? resolveRpcUrls({ chainId, alchemyKey })`
   - **Common schema fields**: `chainId` (number), `rpcUrls` (string[] optional), `alchemyKey` (string optional)
   - Wrap algorithms/utils DIRECTLY — do NOT go through CLI

2. **Export from `src/index.ts`**:

   ```typescript
   export { getFoo } from "./tools/{name}.js";
   ```

3. **Verify**: `pnpm --filter @openscan/adapters-langchain typecheck`
