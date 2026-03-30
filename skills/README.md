# @openscan/skills

Markdown-based procedural knowledge files for AI agents, following the [skills.sh](https://skills.sh) format.

## Installation

From source:

```bash
npx skills add openscan-explorer/ia --skill blockchain-exploration
```

Local (development):

```bash
npx skills add ./skills/blockchain-exploration
```

## Available Skills

### blockchain-exploration

On-chain blockchain analysis skill providing procedural knowledge for:

- **Transaction History** — Retrieve and analyze on-chain transaction history for addresses
- **Gas Price Analysis** — Track gas price trends using `eth_feeHistory`
- **Token Balance Tracking** — Monitor ERC-20 token balance changes over time
- **Address Profiling** — Multi-step workflow for comprehensive address analysis

## Prerequisites

The `openscan` CLI must be installed:

```bash
npm install -g @openscan/cli
```

## Skill Format

Each skill follows the skills.sh format:

- `SKILL.md` — Main skill instructions with YAML frontmatter
- `metadata.json` — Skill metadata (version, author, references)
- `rules/` — Individual rule files for each capability
- `AGENTS.md` — Auto-generated compiled rules for quick reference

## License

MIT
