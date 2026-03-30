# Add OpenClaw Capability or Skill Registration

Update the OpenClaw manifest in `@openscan/adapters-openclaw` to register a new capability or skill.

## Arguments
- $TYPE: "capability" or "skill"
- $NAME: kebab-case name (e.g., "defi-analysis")
- $DESCRIPTION: One-line description

## Context

OpenClaw tools are auto-generated from CLI commands — no new file is needed to add a tool. This command is for adding **capabilities** (categories of functionality) or **skill registrations** (pointers to skill SKILL.md files).

## Steps

### For a new capability

1. Open `packages/adapters-openclaw/src/index.ts`

2. Add a new entry to the `capabilities` array in `buildOpenClawManifest()`:
   ```typescript
   {
     name: "$NAME",
     description: "$DESCRIPTION",
     chains: [1, 10, 56, 137, 8453, 42161, 43114],
   },
   ```
   - Adjust the `chains` array to match which chains the capability supports

3. Run `pnpm --filter @openscan/adapters-openclaw typecheck`

### For a new skill registration

1. Ensure the skill exists at `skills/$NAME/SKILL.md` (use `/add-skill` if not)

2. Open `packages/adapters-openclaw/src/index.ts`

3. Add a new entry to the `skills` array in `buildOpenClawManifest()`:
   ```typescript
   {
     name: "$NAME",
     description: "$DESCRIPTION",
     skillPath: "./skills/$NAME/SKILL.md",
   },
   ```

4. Run `pnpm --filter @openscan/adapters-openclaw typecheck`
