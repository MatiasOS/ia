# OpenScan AI - Claude Code Instructions

OpenScan AI is a modular, TypeScript-first system for on-chain blockchain analysis. It provides algorithms, utilities, a CLI, skills (for AI agents), and framework adapters (LangChain, OpenClaw) built on top of `@openscan/network-connectors`.

## Quick Reference

- **Package Manager**: pnpm
- **Monorepo Tool**: Turborepo
- **Build**: `pnpm build`
- **Type Check**: `pnpm typecheck`
- **Test**: `pnpm test`
- **Format**: `pnpm format:fix`
- **Lint**: `pnpm lint:fix`

## Architecture

See [ARCHITECTURE.md](ARCHITECTURE.md) for the full specification.

**Execution Model**: Skill → CLI → Algorithms/Utils → network-connectors

## Packages

| Package | Description |
|---------|-------------|
| `@openscan/utils` | Zero-dep utilities: hex, units, address validation, ABI, events, signatures |
| `@openscan/algorithms` | On-chain algorithms: tx history, token balance, gas price |
| `@openscan/cli` | CLI tool (`openscan`) wrapping algorithms and utils |
| `@openscan/skills` | Markdown-based procedural knowledge for AI agents (skills.sh format) |
| `@openscan/adapters-langchain` | LangChain tool wrappers (wraps algorithms/utils directly) |
| `@openscan/adapters-openclaw` | OpenClaw adapter (wraps CLI handlers) |

## Code Quality

- **Biome** for formatting and linting (100 char line width, 2-space indent)
- **TypeScript** strict mode with Node.js native test runner
- **Zero production deps** in `@openscan/utils` (matching network-connectors philosophy)
- **ES Modules** throughout (`"type": "module"`)

## Before Committing

```bash
pnpm format:fix
pnpm lint:fix
pnpm typecheck
pnpm test
```

## Key Patterns

- All blockchain data comes from on-chain RPC calls (no indexing APIs)
- Algorithms use `ClientFactory.createClient()` from `@openscan/network-connectors`
- `@openscan/network-connectors` is always a **peer dependency** imported dynamically (`await import("@openscan/network-connectors")`) — never a direct production dependency
- LangChain tools wrap algorithms/utils DIRECTLY (not through CLI)
- OpenClaw adapter goes through CLI command handlers
- Skills are `.md` files (not TypeScript) following skills.sh format
- Each package has its own `CLAUDE.md` with package-specific instructions

## Per-Package Operations

```bash
pnpm --filter @openscan/utils test
pnpm --filter @openscan/algorithms build
pnpm --filter @openscan/cli typecheck
```

## Custom Commands

- `/add-algorithm` — Scaffold a new algorithm in `@openscan/algorithms`
- `/add-cli-command` — Scaffold a new CLI command in `@openscan/cli`
- `/add-langchain-tool` — Scaffold a new LangChain tool wrapper
- `/check-all` — Run full validation suite (format, lint, typecheck, test)
