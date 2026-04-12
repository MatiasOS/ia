# Releases

This document explains how OpenScan AI packages are versioned, released, and published to npm.

## Overview

OpenScan AI uses [Changesets](https://github.com/changesets/changesets) for version management and a GitHub Actions workflow for automated publishing. All 5 packages are **linked** — they share the same version number and are released together.

### Packages

| Package | Path |
|---------|------|
| `@openscan/utils` | `packages/utils` |
| `@openscan/algorithms` | `packages/algorithms` |
| `@openscan/cli` | `packages/cli` |
| `@openscan/adapters-langchain` | `packages/adapters-langchain` |
| `@openscan/adapters-openclaw` | `packages/adapters-openclaw` |

All packages are published under the `@openscan` npm scope with public access.

## How Releases Work

### Automated Flow (recommended)

1. A developer creates a changeset describing what changed
2. The changeset is committed and pushed as part of a PR to `main`
3. On merge, the GitHub Actions **Release** workflow runs
4. The workflow:
   - Applies pending changesets (bumps versions, updates changelogs, removes consumed changeset files)
   - Builds all packages
   - Publishes updated packages to npm with [npm provenance](https://docs.npmjs.com/generating-provenance-statements)
   - Commits and pushes the version changes back to `main`

### Dependency Order

When publishing manually, packages must be published in dependency order:

1. `@openscan/utils` (zero deps)
2. `@openscan/algorithms` (depends on utils)
3. `@openscan/cli` (depends on utils + algorithms)
4. `@openscan/adapters-langchain` (depends on utils + algorithms)
5. `@openscan/adapters-openclaw` (depends on cli)

The automated workflow handles this automatically.

## How to Release

### Step 1: Create a Changeset

```bash
pnpm changeset
```

Follow the interactive prompts to:
- Select which packages changed
- Choose the semver bump type (`patch`, `minor`, or `major`)
- Write a summary of the changes

This creates a markdown file in `.changeset/`. Commit it with your PR.

### Step 2: Merge to Main

Push your branch and open a PR to `main`. Once merged, the Release workflow picks up the changeset.

### Step 3: Automatic Version and Publish

Once merged, the Release workflow automatically versions, builds, publishes to npm, and pushes the version changes back to `main`. No additional steps required.

## Pre-release (Alpha) Versions

To publish alpha versions (e.g., `0.0.2-alpha.0`, `0.0.2-alpha.1`):

### Enter Pre-release Mode

```bash
pnpm changeset pre enter alpha
git add .changeset/pre.json && git commit -m "chore: enter alpha pre-release mode"
```

While in pre-release mode, `pnpm changeset version` produces alpha-tagged versions. The `--tag alpha` flag ensures these don't become the `latest` dist-tag on npm, so `npm install @openscan/utils` won't install them — users must explicitly request `npm install @openscan/utils@alpha`.

### Exit Pre-release Mode

When ready for a stable (GA) release:

```bash
pnpm changeset pre exit
git add .changeset/pre.json && git commit -m "chore: exit alpha pre-release mode"
```

## Manual Publishing

For cases where you need to publish outside the automated flow:

### Dry Run

Preview what would be published:

```bash
pnpm -r publish --dry-run --no-git-checks
```

Check that:
- Versions are correct
- `workspace:*` dependencies are resolved to actual versions
- Only `dist/` is in the files list

### Publish

```bash
pnpm changeset publish
```

Or publish a single package:

```bash
pnpm --filter @openscan/utils exec npm publish --access public
```

## CI/CD Setup

The release pipeline is defined in `.github/workflows/release.yml` and requires:

- **`NPM_TOKEN`** — a granular access token from npmjs.com scoped to the `@openscan` org with read/write permissions. Added as a GitHub Actions secret.
- **`GITHUB_TOKEN`** — automatically provided by GitHub Actions. Used to push version changes back to `main`.

### Creating an npm Token

1. Go to npmjs.com > Access Tokens > Generate New Token > **Granular Access Token**
2. Scope it to `@openscan` with **Read and write** permissions
3. Add it as a repository secret named `NPM_TOKEN` in GitHub Settings > Secrets and variables > Actions

## Changeset Configuration

The changeset config lives in `.changeset/config.json`:

- **`linked`**: All 5 packages are linked — they always share the same version number
- **`access`**: `"public"` — all packages are published publicly
- **`baseBranch`**: `"main"` — changesets are consumed on merge to main
- **`updateInternalDependencies`**: `"patch"` — internal dependency bumps are treated as patch releases
