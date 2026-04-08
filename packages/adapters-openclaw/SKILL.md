---
name: openscan-blockchain-exploration
description: On-chain blockchain analysis using the openscan CLI. Use when the user asks about transaction history, gas prices, token balances, address profiling, or input data decoding. Supports Ethereum, Optimism, BSC, Polygon, Base, Arbitrum, Avalanche, and Sepolia. Powered by @openscan/cli, @openscan/network-connectors, and @openscan/metadata.
---

# OpenScan Blockchain Exploration Skill

On-chain blockchain analysis for AI agents using the `openscan` CLI tool.

## When to Apply

- When a user asks about transaction history for an address
- When analyzing gas prices or fee trends on a network
- When tracking token balance changes over time
- When profiling a blockchain address (type detection, balance, activity)
- When decoding transaction input data

## Available Commands

| Command | Description | Impact |
|---------|-------------|--------|
| `openscan algo:tx-history` | Transaction history for an address | HIGH |
| `openscan algo:gas-price` | Gas price history for a network | MEDIUM |
| `openscan algo:token-balance` | Token balance history | HIGH |
| `openscan util:address-type` | Detect address type (EOA/contract) | LOW |
| `openscan util:decode-input` | Decode transaction input data | MEDIUM |
| `openscan util:balance` | Get native token balance | LOW |

## Global Flags

All commands accept these flags:

| Flag | Description | Required |
|------|-------------|----------|
| `--chain <id>` | EVM chain ID (default: 1) | No |
| `--rpc <url>` | RPC endpoint URL(s), comma-separated | No |
| `--alchemy-key <key>` | Alchemy API key (or set `ALCHEMY_API_KEY` env var) | No |
| `--output <format>` | Output format: json, table, stream (default: json) | No |
| `--strategy <type>` | RPC strategy: fallback, parallel, race (default: fallback) | No |
| `--verbose` | Enable verbose output | No |

> **RPC Resolution**: If `--rpc` is omitted, public RPCs are auto-loaded from `@openscan/metadata` for the given chain. Providing `--alchemy-key` adds a premium Alchemy endpoint as the primary fallback. Both flags are optional.

## Transaction History

```bash
openscan algo:tx-history 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045 --chain 1
```

With pagination:

```bash
openscan algo:tx-history 0xADDRESS --from-block 19000000 --to-block 19100000 --page-size 50
```

- Requires archival RPC for blocks >128 back
- Default window: last 10,000 blocks
- Uses `eth_getLogs` with Transfer event topics
- Results sorted by block number descending (newest first)

## Gas Price History

```bash
openscan algo:gas-price --chain 1
```

Custom block count:

```bash
openscan algo:gas-price --page-size 200 --output table
```

- Uses `eth_feeHistory` RPC method (post-EIP-1559 chains)
- Returns base fee per gas and gas used ratio per block
- Default: queries last 100 blocks
- Gas prices returned in gwei

## Token Balance History

```bash
openscan algo:token-balance 0xHOLDER --token-address 0xTOKEN --chain 1
```

With block range:

```bash
openscan algo:token-balance 0xHOLDER --token-address 0xTOKEN --from-block 19000000 --to-block 19100000
```

- Tracks via ERC-20 Transfer event logs
- Shows running balance after each transfer
- Requires `--token-address` flag
- Use `--from-block earliest` for full history (requires archival RPC)

## Address Profiling (Multi-Step Workflow)

1. Detect address type:

```bash
openscan util:address-type 0xADDRESS --chain 1
```

2. Check balance:

```bash
openscan util:balance 0xADDRESS --chain 1
```

3. Get transaction history:

```bash
openscan algo:tx-history 0xADDRESS --chain 1
```

4. Optionally decode contract interactions:

```bash
openscan util:decode-input 0xCALLDATA
```

## Supported Networks

| Alias | Chain ID | Network |
|-------|----------|---------|
| ethereum | 1 | Ethereum |
| optimism | 10 | Optimism |
| bnb | 56 | BNB Smart Chain |
| polygon | 137 | Polygon |
| base | 8453 | Base |
| arbitrum | 42161 | Arbitrum One |
| avalanche | 43114 | Avalanche |
| sepolia | 11155111 | Sepolia Testnet |

## Output

All commands output JSON by default. Use `--output table` for human-readable output or `--output json` for piping to other tools.

## Natural Language Mapping

| User says | Command |
|-----------|---------|
| "Show transaction history for 0x..." | `openscan algo:tx-history 0x... --chain 1` |
| "What's gas like on Arbitrum?" | `openscan algo:gas-price --chain 42161` |
| "Track USDC balance for 0x..." | `openscan algo:token-balance 0x... --token-address 0xA0b8...eB48 --chain 1` |
| "Is 0x... a contract or wallet?" | `openscan util:address-type 0x... --chain 1` |
| "What's the ETH balance of 0x...?" | `openscan util:balance 0x... --chain 1` |
| "Decode this calldata: 0x..." | `openscan util:decode-input 0x...` |

## Security

- **Read-only** -- no transaction signing, no private key handling
- **No API keys required** -- uses public RPC endpoints by default
- `--alchemy-key` is optional for premium RPC access
