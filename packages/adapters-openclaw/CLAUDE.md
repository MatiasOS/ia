# @openscan/adapters-openclaw

## Purpose

OpenClaw/ClawHub skill package for on-chain blockchain analysis. This is NOT a TypeScript library -- it is a skill package that provides `SKILL.md` for AI agents and depends on `@openscan/cli` for the actual tools.

## Key Architectural Rule

This package depends on `@openscan/cli`, which provides the `openscan` binary. The skill's `SKILL.md` describes how to use CLI commands. When installed via ClawHub or manually, `install.sh` runs `npm install` to fetch the CLI and its dependencies.

## ClawHub Installation

Users install this skill on their OpenClaw server via:

```bash
clawhub install openscan-blockchain-exploration
```

Or manually:

```bash
bash install.sh
```

## Package Structure

```
adapters-openclaw/
├── SKILL.md          # Skill definition (what ClawHub/OpenClaw reads)
├── README.md         # Installation and usage docs
├── package.json      # Dependencies (@openscan/cli)
├── install.sh        # Installs npm dependencies
└── CLAUDE.md         # This file
```

## Relationship to Other Packages

- `@openscan/cli` -- the actual tool this skill wraps (installed as a dependency)
- `skills/blockchain-exploration/` -- the skills.sh version of this skill (for `npx skills add`). This ClawHub package serves the same purpose but follows the OpenClaw/ClawHub format.
- `@openscan/adapters-langchain` -- the LangChain adapter (separate package, wraps algorithms directly)

## Updating the Skill

When new CLI commands are added to `@openscan/cli`:

1. Add the command to the "Available Commands" table in `SKILL.md`
2. Add a usage section with examples
3. Update the "Natural Language Mapping" table
4. Update `README.md` with the new command
