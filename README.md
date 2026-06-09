# release-workflows

This repository ships two complementary release artifacts that work together to automate versioned releases across the `ItsJennyFiggy` platform:

1. **`Move Major Tag` GitHub Action** (root `action.yml`) — after release-please cuts a precise semver tag (e.g. `v1.2.3`), this TypeScript action force-moves the floating major tag (`v1`) to the same commit so consumers pinned to `@v1` automatically track the latest release.

2. **Reusable Release Workflow** (`.github/workflows/release.yml`) — a `workflow_call` workflow that orchestrates the full release lifecycle: fetches `figgy-release` GitHub App credentials from AWS SSM via OIDC, mints a scoped installation token, runs release-please, optionally auto-merges the release PR, and (for action repos) invokes the Move Major Tag action above.

Both artifacts are self-released under the `@v1` floating tag using this same pipeline.

---

## Artifacts

### Action: Move Major Tag

Accepts a precise release tag (`v1.2.3`) and force-creates or force-updates the matching floating major tag (`v1`) to point at the same commit SHA. Intended for GitHub Action repositories where consumers reference a stable major tag.

**Inputs**

| Input | Required | Description |
|---|---|---|
| `tag` | yes | Full release tag just created, e.g. `v1.2.3` |
| `github-token` | yes | Token with `contents: write` permission |

**Output**: `major-tag` — the floating tag that was created or updated (e.g. `v1`).

### Reusable Workflow: `release.yml`

A `workflow_call` workflow that manages the complete release pipeline for any platform repository.

**Inputs**

| Input | Type | Default | Description |
|---|---|---|---|
| `release_type` | string | `node` | release-please release type (`node`, `python`, `simple`, etc.) |
| `update_major_tag` | boolean | `false` | Set `true` for action repos — moves the floating major tag after a release is cut |

**Secrets**: pass via `secrets: inherit` — the workflow reads `AWS_ROLE_TO_ASSUME` to authenticate to SSM.

---

## Consuming the release workflow

In any platform repository, add a workflow file that calls this:

```yaml
# .github/workflows/release.yml
name: Release
on:
  push:
    branches: [main]

jobs:
  release:
    uses: ItsJennyFiggy/release-workflows/.github/workflows/release.yml@v1
    secrets: inherit
    with:
      release_type: node          # omit to accept default
      update_major_tag: false     # set true for action repos
```

For action repositories that need the floating major tag moved, set `update_major_tag: true`.

---

## How the release pipeline works

```
push to main
  └─ release-please opens / updates release PR
       └─ PR merged
            └─ release-please cuts precise tag + GitHub Release
                 └─ (action repos) Move Major Tag action updates @v1
```

1. **AWS OIDC** authenticates the runner to fetch `figgy-release` App credentials from SSM (`/itsjennyfiggy/global/figgy_release_github_app_*`).
2. **`actions/create-github-app-token`** mints a token scoped to the releasing repository — blast radius is one repo per run.
3. **release-please** opens a release PR (or merges and tags when the PR is already open).
4. If `AUTO_MERGE_RELEASE_PR` repository variable is `true`, the release PR is squash-merged automatically.
5. If `update_major_tag: true`, the Move Major Tag action runs after the GitHub Release is created.

See [ADR-0001](https://github.com/ItsJennyFiggy/template-base/blob/main/docs/adr/0001-release-automation-strategy.md) and [ADR-0002](https://github.com/ItsJennyFiggy/template-base/blob/main/docs/adr/0002-github-app-identity-strategy.md) for the architectural decisions behind this design.

---

## Repository structure

```
├── .github/
│   └── workflows/
│       ├── release-self.yml   # Self-release pipeline (calls release.yml with update_major_tag: true)
│       ├── release.yml        # Reusable release workflow (workflow_call)
│       └── test.yml           # CI: build, lint, unit tests, coverage
├── __tests__/
│   └── main.test.ts           # Unit tests for parseMajor and the action runner
├── src/
│   ├── index.ts               # Action entrypoint
│   └── main.ts                # Core logic: parseMajor, run (create/update major tag ref)
├── action.yml                 # Move Major Tag action metadata
├── biome.json                 # Formatter and linter configuration
├── package.json               # Node dependencies and scripts (build, test, lint, coverage)
├── tsconfig.json              # TypeScript config targeting Node 24
└── vitest.config.ts           # Vitest config with 85% coverage gate
```

---

## Development

**Prerequisites**: Node.js v24+, npm v10+

```bash
npm install          # install dependencies
npm run test         # run unit tests
npm run coverage     # verify 85% coverage gate
npm run lint         # Biome lint + format check
npm run build        # compile + bundle to dist/index.js
```

The compiled `dist/index.js` is committed to the repository — GitHub Actions run from it directly.

---

## Licensing

CC0 1.0 Universal (Public Domain). See [LICENSE](LICENSE).
