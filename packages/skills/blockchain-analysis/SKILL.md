---
name: openscan-blockchain-analysis
description: Procedural knowledge for on-chain blockchain analysis using the openscan CLI
license: MIT
metadata:
  author: openscan
  version: "1.0.0"
---

# OpenScan Blockchain Analysis

Comprehensive on-chain analysis skill for AI agents using the `openscan` CLI tool.

## When to Apply

- When a user asks about transaction history for an address
- When analyzing gas prices or fee trends on a network
- When tracking token balance changes over time
- When profiling a blockchain address (type detection, balance, activity)

## Prerequisites

The `openscan` CLI must be installed: `npm install -g @openscan/cli`

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

## Supported Networks

- Ethereum (1), Optimism (10), BSC (56), Polygon (137), Base (8453)
- Arbitrum (42161), Avalanche (43114), Hardhat (31337)
- BSC Testnet (97), Sepolia (11155111)

## Rules

See individual rule files in `rules/` for detailed usage patterns per command.
