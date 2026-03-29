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

## No Direct network-connectors Dependency

This package only depends on `@openscan/cli`, which handles the network connector peer dependency chain.
