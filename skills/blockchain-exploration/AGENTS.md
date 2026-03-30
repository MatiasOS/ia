# OpenScan Blockchain Analysis - Compiled Rules

This file is auto-generated from individual rule files in `rules/`.

## Transaction History Retrieval [HIGH]
Use `openscan algo:tx-history <address> --chain <id> --rpc <url>` to get on-chain transaction history. Default window: last 10,000 blocks. Requires archival RPC for older data.

## Gas Price History Analysis [MEDIUM]
Use `openscan algo:gas-price --chain <id> --rpc <url>` to get gas price history via `eth_feeHistory`. Returns base fee and gas used ratio per block.

## Token Balance History [HIGH]
Use `openscan algo:token-balance <address> --token-address <token> --chain <id> --rpc <url>` to track ERC-20 balance changes via Transfer event scanning.

## Address Profiling [HIGH]
Multi-step workflow: (1) `util:address-type` → (2) `util:balance` → (3) `algo:tx-history` → (4) optionally `util:decode-input` for contract interactions.
