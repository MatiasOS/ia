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

1. **Create the domain directory and barrel file** at `src/{domain}/index.ts`:
   - Directory name: kebab-case (e.g., `merkle-tree`)
   - Function names: camelCase (e.g., `computeMerkleRoot`)
   - Use `bigint` for all blockchain numeric values — never `Number`
   - Do NOT add any production dependencies — only `devDependencies` and optional `peerDependencies` are allowed

2. **Define shared types** (if needed):
   - Types consumed by other packages → add to `src/types.ts` (e.g., `MerkleProof`)
   - Types internal to this domain → export directly from `src/{domain}/index.ts`

3. **Export the public API from `src/index.ts`**:
   ```typescript
   export { computeMerkleRoot, verifyProof } from "./{domain}/index.js";
   export type { MerkleProof } from "./{domain}/index.js";
   ```
   - Use `.js` extension in all import paths (ESM)
   - Export functions and types separately

4. **Add tests** at `tests/{domain}.test.ts`:
   ```typescript
   import { describe, it } from "node:test";
   import assert from "node:assert/strict";
   import { computeMerkleRoot } from "../src/{domain}/index.js";

   describe("computeMerkleRoot", () => {
     it("computes root for two leaves", () => {
       assert.equal(computeMerkleRoot([...]), "0x...");
     });
   });
   ```
   - All tests must be **deterministic** — no RPC calls, no network, no randomness
   - Use `node:test` (`describe`/`it`) and `node:assert/strict`

5. **Verify**: `pnpm --filter @openscan/utils typecheck && pnpm --filter @openscan/utils test`

## network-connectors

Optional peer dep — only used by `detectAddressType()`. Guard with dynamic import.
