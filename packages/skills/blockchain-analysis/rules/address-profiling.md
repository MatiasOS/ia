---
title: Address Profiling Workflow
impact: HIGH
tags: address, profile, workflow, multi-step
---

## Address Profiling Workflow

To build a comprehensive profile of a blockchain address, run these commands in sequence:

**Step 1 — Detect address type:**
```bash
openscan util:address-type 0x<ADDRESS> --chain <CHAIN_ID> --rpc <RPC_URL> --output json
```
This returns whether the address is an EOA, contract, or proxy.

**Step 2 — Get native balance:**
```bash
openscan util:balance 0x<ADDRESS> --chain <CHAIN_ID> --rpc <RPC_URL> --output json
```

**Step 3 — Get recent transaction history:**
```bash
openscan algo:tx-history 0x<ADDRESS> --chain <CHAIN_ID> --rpc <RPC_URL> \
  --page-size 50 --output json
```

**Step 4 — (If contract) Decode recent transactions:**
```bash
openscan algo:tx-history 0x<ADDRESS> --chain <CHAIN_ID> --rpc <RPC_URL> \
  --output json | openscan util:decode-input --abi <ABI_PATH>
```

**Combining results:** Aggregate the JSON outputs from steps 1-3 to present a
unified address profile with type, balance, and activity summary.

**Tips:**
- Always start with address type detection to understand what you're analyzing
- For contracts, finding the ABI enables much richer transaction decoding
- Use `--output json` for all steps when piping between commands
