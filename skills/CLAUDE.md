# @openscan/skills

## Not TypeScript

This package contains **no TypeScript code**. It is pure Markdown following the [skills.sh](https://skills.sh) format. There is no build step or typecheck.

## Structure

```
blockchain-exploration/
├── SKILL.md                        # Main skill entry with YAML frontmatter
├── metadata.json                   # Version, organization, abstract
├── AGENTS.md                       # Auto-generated compiled rules
└── rules/
    ├── address-profiling.md        # Individual rule files
    ├── gas-analysis.md
    ├── token-balance.md
    └── tx-history.md
```

## Rule File Format

Each rule in `rules/` is a Markdown file with:
- YAML frontmatter: `title`, `impact` (HIGH/MEDIUM/LOW), `tags`
- Markdown body: when to use, bash command examples, important notes
- References `@openscan/cli` commands by name (e.g., `openscan tx-history`)
- `--rpc` is **optional** in examples — public RPCs are auto-resolved from `@openscan/metadata`
- Show simplest usage first (no `--rpc`), then `--alchemy-key`, then explicit `--rpc` as advanced

## Adding a New Skill

To create an entirely new skill (not just a rule within an existing skill):

1. **Create the skill directory** at `skills/{skill-name}/` (kebab-case)

2. **Create `SKILL.md`** with YAML frontmatter:

   ```yaml
   ---
   name: {skill-name}
   description: One-line description
   license: MIT
   metadata:
     author: OpenScan
     version: "0.0.1"
   ---

   # Skill Title

   Overview of what this skill enables.

   ## When to Apply
   - When a user asks about X
   - When analyzing Y

   ## Prerequisites
   The `openscan` CLI must be installed: `npm install -g @openscan/cli`

   ## Available Commands

   | Command | Description | Impact |
   |---------|-------------|--------|
   | `openscan command-name` | What it does | HIGH/MEDIUM/LOW |

   ## Global Flags

   | Flag | Description | Required |
   |------|-------------|----------|
   | `--chain <id>` | EVM chain ID (default: 1) | No |
   | `--rpc <url>` | RPC URLs, comma-separated (auto-resolved if omitted) | No |
   | `--alchemy-key <key>` | Alchemy API key for premium RPC | No |
   | `--output <format>` | json, table, stream (default: json) | No |

   ## Rules

   See individual rule files in `rules/` for detailed usage patterns.
   ```

3. **Create `metadata.json`**:

   ```json
   {
     "version": "0.0.1",
     "organization": "OpenScan",
     "date": "March 2026",
     "abstract": "Brief description of the skill's purpose.",
     "references": ["https://github.com/openscan-explorer"]
   }
   ```

4. **Create `rules/` directory** and add rule files (see below)

5. **Create `AGENTS.md`** — compiled summary for quick AI reference:

   ```markdown
   # Skill Title - Compiled Rules

   This file is auto-generated from individual rule files in `rules/`.

   ## Rule Title 1 [HIGH]
   One-line summary of the rule.

   ## Rule Title 2 [MEDIUM]
   One-line summary of the rule.
   ```

## Adding a New Skill Rule

1. **Create the rule file** at `{skill-name}/rules/{capability}.md` (kebab-case):

   ```yaml
   ---
   title: Rule Title
   impact: HIGH
   tags: tag1, tag2, tag3
   ---

   ## Rule Title

   Description of when and how to use this capability.

   **Basic usage (public RPCs auto-resolved):**
   ```bash
   openscan command-name 0xADDRESS --chain 1
   ```

   **With Alchemy for reliability:**
   ```bash
   openscan command-name 0xADDRESS --chain 1 --alchemy-key YOUR_KEY
   ```

   **With explicit RPC:**
   ```bash
   openscan command-name 0xADDRESS --chain 1 --rpc https://eth.llamarpc.com --output json
   ```

   **Important notes:**
   - Note about requirements or limitations
   ```

   - Show examples in order: basic (no `--rpc`) → `--alchemy-key` → explicit `--rpc`
   - Reference commands by full name (e.g., `openscan tx-history`)
   - `--rpc` is always optional — public RPCs are auto-resolved from `@openscan/metadata`

2. **Reference the rule from `SKILL.md`** — add it to the Available Commands table

3. **Update `AGENTS.md`** — add a one-line summary entry for the new rule

## Relationship to Other Packages

Skills describe **how to use** CLI commands for AI agents. They do NOT import TypeScript — they are consumed by agents that have shell access to the `openscan` CLI.
