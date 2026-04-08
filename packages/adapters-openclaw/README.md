# OpenScan Blockchain Exploration - OpenClaw Skill

An OpenClaw skill for on-chain blockchain analysis via [OpenScan](https://openscan.eth.link) infrastructure.

Supports Ethereum, Arbitrum, Optimism, Base, Polygon, BNB, Avalanche, and Sepolia. All data comes from on-chain RPC calls -- no indexing APIs.

## Installation

Install via [ClawHub](https://clawhub.com):

```bash
clawhub install openscan-blockchain-exploration
```

Or manually, by cloning this repo into your workspace `skills/` folder and running:

```bash
bash install.sh
```

This installs the `@openscan/cli` npm package required by the skill.

## Usage

Once installed, OpenClaw will automatically make the skill available to the agent. Just ask naturally:

- "Show transaction history for 0xd8dA..."
- "What's gas like on Arbitrum?"
- "Track USDC balance changes for 0x..."
- "Is 0x... a contract or a wallet?"
- "What's the ETH balance of vitalik.eth?"
- "Decode this calldata: 0xa9059cbb..."

## CLI

The underlying CLI can also be run directly:

```bash
openscan <command> [args] [flags]
```

### Algorithm Commands

```bash
openscan algo:tx-history <address> [--chain <id>] [--from-block <n>] [--to-block <n>] [--page-size <n>]
openscan algo:gas-price [--chain <id>] [--page-size <n>]
openscan algo:token-balance <address> --token-address <token> [--chain <id>] [--from-block <n>] [--to-block <n>]
```

### Utility Commands

```bash
openscan util:address-type <address> [--chain <id>]
openscan util:decode-input <calldata> [--abi <path>]
openscan util:balance <address> [--chain <id>]
```

### Global Flags

| Flag | Description | Default |
|------|-------------|---------|
| `--chain <id>` | EVM chain ID | 1 |
| `--rpc <url>` | RPC URL(s), comma-separated | Auto-resolved |
| `--alchemy-key <key>` | Alchemy API key | `ALCHEMY_API_KEY` env |
| `--output <format>` | json, table, stream | json |
| `--strategy <type>` | fallback, parallel, race | fallback |
| `--verbose` | Verbose output | false |

RPC endpoints are auto-resolved from `@openscan/metadata` when `--rpc` is omitted. No API keys required.

## Supported Networks

| Network | Chain ID | Aliases |
|---------|----------|---------|
| Ethereum | 1 | ethereum, eth, mainnet |
| Optimism | 10 | optimism, op |
| BNB Smart Chain | 56 | bnb, bsc |
| Polygon | 137 | polygon, matic |
| Base | 8453 | base |
| Arbitrum One | 42161 | arbitrum, arb |
| Avalanche | 43114 | avalanche |
| Sepolia | 11155111 | sepolia |

## Output

All commands output JSON by default. Use `--output table` for human-readable format.

## Security

- **Read-only** -- no transaction signing, no private key handling
- **No API keys required** -- uses public RPC endpoints
- All data sourced from on-chain RPC calls

## License

MIT
