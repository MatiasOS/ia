---
title: Transaction History Retrieval
impact: HIGH
tags: transactions, history, address, on-chain
---

## Transaction History Retrieval

Use `openscan algo:tx-history` to retrieve on-chain transaction history for an address.

**Basic usage:**
```bash
openscan algo:tx-history 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045 \
  --chain 1 --rpc https://eth.llamarpc.com --output json
```

**With pagination:**
```bash
openscan algo:tx-history 0x... --chain 1 --rpc https://... \
  --from-block 19000000 --to-block 19100000 --page-size 50
```

**Human-readable output:**
```bash
openscan algo:tx-history 0x... --chain 1 --rpc https://... --output table
```

**Important notes:**
- Requires archival RPC for historical blocks (>128 blocks back)
- Default window: last 10,000 blocks from the current head
- Uses `eth_getLogs` with Transfer event topics to find relevant transactions
- Results are sorted by block number descending (newest first)
- Use `--output table` for human-readable output, `--output json` for piping
