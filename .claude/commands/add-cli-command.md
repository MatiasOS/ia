# Add a New CLI Command

Create a new CLI command in `@openscan/cli` following the established pattern.

## Arguments
- $NAMESPACE: "algo" or "util"
- $COMMAND_NAME: kebab-case name (e.g., "contract-events")

## Steps

1. Create `packages/cli/src/commands/$NAMESPACE/$COMMAND_NAME.ts`:
   - Import the algorithm or utility from the appropriate package
   - Define `handler: CommandHandler` that receives `(args, ctx)`
   - Export `{camelName}Command: CommandDefinition` with:
     - `name`: "$NAMESPACE:$COMMAND_NAME"
     - `description`, `args` (with required/type), `flags` (with type/default)
     - `handler`
   - Export `handler as {camelName}Handler`

2. Add exports to `packages/cli/src/index.ts`:
   - The command definition
   - The handler (it will be consumed by the handler barrel)

3. Add handler export to `packages/cli/src/handlers/index.ts`

4. Register the command in `packages/cli/src/bin.ts` if needed (add to citty subcommands)

5. Run `pnpm --filter @openscan/cli typecheck`

6. If wrapping an algorithm:
   - Map `args` to algorithm params
   - Use `ctx.chainId`, `ctx.rpcUrls`, `ctx.strategyType` from CommandContext
   - Return `{ exitCode: result.success ? 0 : 1, data: result.data, error: result.error, metadata: result.metadata }`
