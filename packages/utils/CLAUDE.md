# @openscan/utils

## Constraints

- **Zero production dependencies** — this package must have no runtime deps. Only `devDependencies` and optional `peerDependencies`.
- **BigInt for all blockchain numerics** — `hexToNumber` returns `bigint`, unit conversion functions use `bigint`. Never use `Number` for on-chain values.

## Key Types (consumed by all other packages)

Defined in `src/types.ts`:
- `OpResult<T>` — universal result envelope (`success`, `data?`, `error?`, `metadata?`)
- `OpError` — error shape (`code`, `message`, `details?`)
- `OpMetadata` — execution metadata
- `AddressInfo`, `DecodedInput`, `DecodedParam`, `DecodedEvent`, `EIP712Domain`, `EIP712Types`

## Module Layout

One directory per domain, each with an `index.ts` barrel:

```
src/
├── abi/          # ABI encode/decode
├── address/      # Validation, type detection
├── chain/        # Chain-specific normalization (EVM/Bitcoin)
├── eip712/       # EIP-712 typed data encoding
├── events/       # Event log decoding
├── hex/          # Hex/data utilities
├── signatures/   # Signature parsing
├── tx/           # Transaction input decoding
├── units/        # Unit conversions (wei, gwei, ether)
├── index.ts      # Public API barrel export
└── types.ts      # Shared type definitions
```

## Testing

- One test file per domain: `tests/{domain}.test.ts`
- Uses `node:test` (`describe`/`it`) and `node:assert/strict`
- All tests are deterministic unit tests (no RPC calls)
- Run: `pnpm --filter @openscan/utils test`
- Single file: `pnpm --filter @openscan/utils exec tsx --test tests/hex.test.ts`

## Adding a New Utility Domain

1. Create `src/{domain}/index.ts`
2. Export public API from `src/index.ts`
3. Add `tests/{domain}.test.ts`

## network-connectors

Optional peer dep — only used by `detectAddressType()`. Guard with dynamic import.
