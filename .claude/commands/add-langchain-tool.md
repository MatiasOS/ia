# Add a New LangChain Tool

Create a new LangChain tool wrapper in `@openscan/adapters-langchain`.

## Arguments
- $TOOL_NAME: camelCase function name (e.g., "getContractEvents")
- $ALGORITHM_OR_UTIL: what it wraps (algorithm class name or util function)

## Steps

1. Create `packages/adapters-langchain/src/tools/{name}.ts`:
   - Import `tool` from `@langchain/core/tools` and `z` from `zod`
   - Import the algorithm/util from `@openscan/algorithms` or `@openscan/utils`
   - Export a const using `tool(async ({...}) => { ... }, { name, description, schema })`:
     - `name`: snake_case version (e.g., "get_contract_events")
     - `description`: clear description for LLM consumption
     - `schema`: `z.object({...})` with `.describe()` on each field
   - Function body: instantiate algorithm, call execute(), return JSON.stringify(result.data) or error string

2. Export from `packages/adapters-langchain/src/index.ts`

3. Run `pnpm --filter @openscan/adapters-langchain typecheck`

## Key Rules
- Wrap algorithms/utils DIRECTLY — do NOT go through CLI
- Return strings, not objects (LangChain tool convention)
- Common schema fields: chainId (number), rpcUrls (string[]), address (string), pageSize (number optional)
- Use `.describe()` on every Zod field for LLM context
