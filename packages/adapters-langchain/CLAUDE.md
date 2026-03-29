# @openscan/adapters-langchain

## Key Architectural Rule

LangChain tools wrap `@openscan/algorithms` and `@openscan/utils` **DIRECTLY** — they do NOT go through the CLI. This is the opposite of the OpenClaw adapter.

## Tool Pattern

```typescript
import { tool } from "@langchain/core/tools";
import { z } from "zod";

export const getFoo = tool(
  async ({ chainId, rpcUrls, address }) => {
    const algo = new FooAlgorithm();
    const result = await algo.execute({ chainId, rpcUrls, address });
    if (!result.success) return `Error: ${result.error?.message ?? "Unknown error"}`;
    return JSON.stringify(result.data, null, 2);
  },
  {
    name: "get_foo",                    // snake_case
    description: "...",                 // Clear description for LLM consumption
    schema: z.object({
      chainId: z.number().describe("EVM chain ID"),
      rpcUrls: z.array(z.string()).describe("RPC endpoint URLs"),
      address: z.string().describe("Ethereum address"),
    }),
  },
);
```

## Key Rules

- **Naming**: Function names use `get{Noun}` (camelCase). The `name` field in the tool config uses `snake_case`.
- **Returns strings**: Tools return JSON-serialized strings or error messages — not structured objects. This is a LangChain convention.
- **Zod schemas**: Every tool defines input validation with `z.object({...})`. Use `.describe()` on each field.
- **Peer deps**: `@langchain/core` (>=0.3.0) and `zod` (>=3.0.0) are peer dependencies.

## Adding a New Tool

1. Create `src/tools/{name}.ts` using the pattern above
2. Export from `src/index.ts`
3. Run `pnpm --filter @openscan/adapters-langchain typecheck`
