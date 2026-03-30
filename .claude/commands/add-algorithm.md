# Add a New Algorithm

Create a new algorithm in `@openscan/algorithms` following the established pattern.

## Arguments
- $ALGORITHM_NAME: kebab-case name (e.g., "contract-events")
- $DESCRIPTION: One-line description of what it does

## Steps

1. Define param and result types in `packages/algorithms/src/shared/types.ts`:
   - `{PascalName}Params extends AlgorithmParams`
   - `{PascalName}Entry` (individual result item)
   - `{PascalName}Page` (page of results with address/chainId context)

2. Create directory `packages/algorithms/src/$ALGORITHM_NAME/`

3. Create `packages/algorithms/src/$ALGORITHM_NAME/{PascalName}Algorithm.ts`:
   - Class implementing `Algorithm<{PascalName}Params, {PascalName}Page>`
   - `readonly name`, `description`, `supportedChains` properties
   - Dynamic `import("@openscan/network-connectors")` in execute()
   - `ClientFactory.createClient()` with try/finally for `client.close()`
   - Return `AlgorithmResult<{PascalName}Page>` with metadata (chainId, duration, rpcCalls, archivalRequired, timestamp)

4. Export from `packages/algorithms/src/index.ts` (class + types)

5. Run `pnpm --filter @openscan/algorithms typecheck` to verify

6. Remind the user they likely also want to:
   - Add a CLI command (use /add-cli-command)
   - Add a LangChain tool (use /add-langchain-tool)
   - Add a skill rule in `skills/blockchain-exploration/rules/`
