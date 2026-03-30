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
- References `@openscan/cli` commands by name (e.g., `openscan algo:tx-history`)
- `--rpc` is **optional** in examples — public RPCs are auto-resolved from `@openscan/metadata`
- Show simplest usage first (no `--rpc`), then `--alchemy-key`, then explicit `--rpc` as advanced

## Adding a New Skill Rule

1. Create `blockchain-exploration/rules/{capability}.md` with YAML frontmatter
2. Reference it from `SKILL.md`
3. Regenerate `AGENTS.md` if needed

## Relationship to Other Packages

Skills describe **how to use** CLI commands for AI agents. They do NOT import TypeScript — they are consumed by agents that have shell access to the `openscan` CLI.
