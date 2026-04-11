# OpenScan AI

Modular, TypeScript-first system for on-chain blockchain analysis. Built on top of `@openscan/network-connectors`.

## Packages

| Package | Description |
|---------|-------------|
| `@openscan/utils` | Zero-dep utilities: hex, units, address validation, ABI, events, signatures |
| `@openscan/algorithms` | On-chain algorithms: tx history, token balance, gas price |
| `@openscan/cli` | CLI tool (`openscan`) wrapping algorithms and utils |
| `@openscan/skills` | Markdown-based procedural knowledge for AI agents (skills.sh format) |
| `@openscan/adapters-langchain` | LangChain tool wrappers |
| `@openscan/adapters-openclaw` | OpenClaw adapter |

## Setup

```bash
pnpm install
pnpm build
```

## Testing

### Run all tests

```bash
pnpm test
```

### Run tests for a specific package

```bash
pnpm --filter @openscan/utils test
pnpm --filter @openscan/algorithms test
pnpm --filter @openscan/cli test
pnpm --filter @openscan/adapters-langchain test
pnpm --filter @openscan/adapters-openclaw test
```

### Run a single test file

```bash
pnpm --filter @openscan/utils exec tsx --test tests/hex.test.ts
```

### Type checking

```bash
pnpm typecheck
```

### Linting and formatting

```bash
pnpm lint
pnpm format:fix
pnpm lint:fix
```

## Publishing

Packages use [changesets](https://github.com/changesets/changesets) for independent versioning.

### 1. Create a changeset

```bash
pnpm changeset
```

Follow the prompts to select which packages changed and the semver bump type (patch, minor, major). This creates a changeset file in `.changeset/`.

### 2. Version packages

```bash
pnpm changeset version
```

This consumes all pending changesets, bumps versions in each package's `package.json`, and updates changelogs.

### 3. Build

```bash
pnpm build
```

### 4. Publish to npm

```bash
pnpm changeset publish
```

This publishes all packages with new versions to npm. Each package has `"publishConfig": { "access": "public" }` configured.

### Publish a single package manually

```bash
pnpm --filter @openscan/utils exec npm publish --access public
```

### Dry run (preview what would be published)

```bash
pnpm --filter @openscan/utils exec npm publish --access public --dry-run
```
