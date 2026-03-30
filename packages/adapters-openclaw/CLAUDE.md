# @openscan/adapters-openclaw

## Key Architectural Rule

OpenClaw adapter wraps **CLI command handlers** — it depends on `@openscan/cli`, NOT on algorithms directly. This is the opposite of the LangChain adapter.

## Manifest Builder Pattern

```typescript
import { buildOpenClawManifest } from "./index.js";
import { allCommands } from "@openscan/cli";

const manifest = buildOpenClawManifest(allCommands);
// Returns: OpenClawManifest with capabilities, skills, and tools
```

## Key Concepts

- `buildOpenClawManifest(commands)` takes `CommandDefinition[]` and produces an `OpenClawManifest`
- `buildSchemaFromCommand()` auto-generates JSON Schema from command `args`/`flags`
- Each manifest tool's `execute()` calls the command handler with a synthetic `CommandContext` (defaults: json output, fallback strategy, non-verbose)

## Types

Defined in `src/types.ts`:
- `OpenClawManifest` — top-level manifest structure
- `OpenClawToolAdapter` — wraps a command handler with schema
- `CapabilityDescriptor` — capability metadata (name, description, chains)
- `SkillRegistration` — points to SKILL.md path
- `ToolRegistration` — tool with name, description, schema, execute function

## RPC Resolution

- `buildOpenClawManifest` auto-resolves RPCs via `resolveRpcUrls` from `@openscan/cli` when `rpcUrls` is empty or missing.
- `alchemyKey` is an optional tool parameter — adds a premium Alchemy endpoint. Also checks `ALCHEMY_API_KEY` env var.
- All generated tool schemas include optional `rpcUrls` and `alchemyKey` properties.

## No Direct network-connectors Dependency

This package only depends on `@openscan/cli`, which handles the network connector peer dependency chain.

## Adding a New Tool

Tools are **auto-generated** from CLI commands — when a new command is registered in `@openscan/cli` and passed to `buildOpenClawManifest(commands)`, it automatically becomes an OpenClaw tool. No new file is needed in this package.

To add a new tool:

1. **Add the CLI command first** — use `/add-cli-command` to create the command in `@openscan/cli`
2. **Pass it to `buildOpenClawManifest()`** — the caller must include the new command in the `commands` array. The manifest builder auto-generates:
   - JSON Schema from the command's `args` and `flags`
   - An `execute()` wrapper that calls the command handler with a synthetic `CommandContext`
   - Optional `rpcUrls` and `alchemyKey` fields in the schema

No changes to this package are needed for new tools.

## Adding a New Capability or Skill

When the project gains a new category of functionality (not just a new command within an existing category), update `buildOpenClawManifest()` in `src/index.ts`:

**New capability** — add to the `capabilities` array:

```typescript
{
  name: "new-capability",
  description: "What this capability provides",
  chains: [1, 10, 56, 137, 8453, 42161, 43114],
}
```

**New skill** — add to the `skills` array:

```typescript
{
  name: "skill-name",
  description: "What this skill provides",
  skillPath: "./skills/{skill-name}/SKILL.md",
}
```

**Verify**: `pnpm --filter @openscan/adapters-openclaw typecheck`
