# Run Full Check Suite

Run all validation checks that must pass before committing.

## Steps

1. Run `pnpm format:fix` — auto-fix formatting
2. Run `pnpm lint:fix` — auto-fix lint issues
3. Run `pnpm typecheck` — verify type correctness across all packages
4. Run `pnpm test` — run all test suites

If any step fails, diagnose and fix the issue before proceeding to the next step. Report a summary of all results at the end.
