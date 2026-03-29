---
title: Gas Price History Analysis
impact: MEDIUM
tags: gas, fees, network, analysis
---

## Gas Price History Analysis

Use `openscan algo:gas-price` to retrieve gas price history for a network using `eth_feeHistory`.

**Basic usage:**
```bash
openscan algo:gas-price --chain 1 --rpc https://eth.llamarpc.com --output json
```

**Custom block count:**
```bash
openscan algo:gas-price --chain 1 --rpc https://... --page-size 200 --output table
```

**From a specific block:**
```bash
openscan algo:gas-price --chain 1 --rpc https://... --to-block 19500000 --page-size 50
```

**Important notes:**
- Uses `eth_feeHistory` RPC method (post-EIP-1559 chains)
- Returns base fee per gas and gas used ratio for each block
- Default: queries last 100 blocks
- Gas prices are returned in gwei for readability
- Pagination via `--to-block` cursor for historical data
