# Add OpenClaw Capability or Skill Registration

Update the OpenClaw/ClawHub skill package in `@openscan/adapters-openclaw`.

## Arguments

- $TYPE: "command" or "section"
- $NAME: kebab-case name (e.g., "defi-analysis")
- $DESCRIPTION: One-line description

## Context

The OpenClaw adapter is a ClawHub skill package (not a TypeScript library). It contains a `SKILL.md` that describes available CLI commands for AI agents. When new commands are added to `@openscan/cli`, the skill must be updated to document them.

## Steps

### For a new command

1. Ensure the CLI command exists in `@openscan/cli` (use `/add-cli-command` if not)

2. Open `packages/adapters-openclaw/SKILL.md`

3. Add the command to the "Available Commands" table:
   ```markdown
   | `openscan namespace:$NAME` | $DESCRIPTION | HIGH/MEDIUM/LOW |
   ```

4. Add a usage section with examples:
   ```markdown
   ## Section Title

   ```bash
   openscan namespace:$NAME <args> [--chain <id>]
   ```

   - Important notes about the command
   ```

5. Add an entry to the "Natural Language Mapping" table:
   ```markdown
   | "User prompt example" | `openscan namespace:$NAME <args>` |
   ```

6. Update `packages/adapters-openclaw/README.md` with the new command

### For a new section (e.g., new capability area)

1. Open `packages/adapters-openclaw/SKILL.md`

2. Add a new section with heading, description, and command examples

3. Update `packages/adapters-openclaw/README.md` accordingly
