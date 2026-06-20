# Open-Source Readiness Audit — `ItsJennyFiggy/release-workflows`

> **⚠️ TRANSIENT PLANNING ARTIFACT.** This document is a point-in-time research +
> reporting deliverable produced for a downstream **planning agent**. It is *not*
> living documentation, makes no code changes, and should be deleted (or moved to an
> issue tracker) once its findings have been converted into work items. Nothing here
> has been implemented.

| | |
|---|---|
| **Repository** | `ItsJennyFiggy/release-workflows` |
| **Audited ref** | branch `claude/oss-readiness-audit-7nxepe` (tip `23d1734`) |
| **Audit date** | 2026-06-20 |
| **Audit type** | Read-only OSS-readiness review (secret handling = lead theme) |
| **Auditor** | Automated agent (Claude Code) |
| **Intended consumer** | Planning agent → converts §6 findings into work items |
| **Sibling repo in scope** | `ItsJennyFiggy/action-github-app-token` (the dependency that actually handles the App PEM; referenced where the leak surface crosses the repo boundary) |

## How to read this report

This report is deliberately **two-layered**:

1. **Narrative (§2–§5, §8)** — prose you can read top-to-bottom to understand *why*
   each gap matters and the best-practice sources behind each recommendation. Each
   theme in §4 ends in a ✅/❌ checklist.
2. **Work-item table (§6)** — every gap is a single row with a stable `ID`,
   `Severity`, `Effort`, `Rationale`, and **testable Acceptance criteria**. The
   planning agent should treat §6 as the backlog source of truth. §7 sequences the
   IDs into phases.

**ID contract:** every `ID` in §6 also appears in the §4 narrative and in the §7
roadmap — no orphans. Severities are `Critical/High/Medium/Low`; effort is `S/M/L`.

> **Version freshness:** specific tool/action versions and adoption numbers cited
> below were verified against primary sources on the audit date. Treat them as
> *"verify latest at implementation time"* — pin to whatever is current and
> SHA-pinned when the work is actually done.

---

## 2. Executive summary

`release-workflows` ships two coupled artifacts: a small TypeScript **"Move Major
Tag"** GitHub Action (`action.yml` + `dist/index.js`) and a **reusable
`workflow_call` release workflow** (`.github/workflows/release.yml`) that authenticates
to AWS via OIDC, mints a scoped GitHub App installation token (delegated to the sibling
`action-github-app-token` action), runs `release-please`, optionally auto-merges the
release PR, and moves the floating major tag.

**Engineering maturity is genuinely good for an internal tool.** There is a real test
suite with an 85% coverage gate, a bundle-drift CI check, Dependabot for both `npm` and
`github-actions`, conventional-commit release automation, issue/PR templates, an MIT
`LICENSE`, and a thoughtful README. The team has already *survived and patched* a PEM
masking leak (commit `addcc9a`, "mask each PEM key line individually").

**But it is not yet safe to flip to public**, for three reasons:

1. **The lead risk — PEM handling — is mitigated but not eliminated, and is
   misrepresented in the docs.** The private key still lands on the runner: it is read
   from SSM into a shell variable and written multi-line into `$GITHUB_OUTPUT` via a
   heredoc, then masked *line-by-line* (the correct workaround for GitHub's line-based
   `::add-mask::`). That masking is fragile by construction, and the README tells
   readers the token is minted by the official `actions/create-github-app-token` —
   hiding the hand-rolled SSM-fetch path that is the actual historical leak surface. A
   public auditor reading the README would not even know where to look.

2. **Supply-chain posture is below the bar a public Actions repo is held to.** Every
   third-party action is pinned to a **mutable major tag** (`@v6`, `@v5`, `@v3`), not a
   commit SHA — the exact vector behind the 2025 `tj-actions`/`reviewdog` compromises.

3. **Community-health and sanitization gaps.** No `SECURITY.md` (notable given the
   secret-handling focus and the OpenSSF Scorecard *Security-Policy* check), no
   `CONTRIBUTING`/`CODE_OF_CONDUCT`/`CODEOWNERS`, a `LICENSE`↔`package.json` license
   mismatch (MIT vs CC0-1.0), no root `AGENTS.md`, and a scattering of internal-only
   identifiers (SSM paths, the `figgy_release` app slug, `us-west-2`, internal ADR
   links, agent-governance rules) that must be genericized before the repo is public.

**Overall readiness verdict: 🟠 NOT READY — moderate effort.** The skeleton is strong;
the blockers are concentrated in (a) eliminating/justifying the residual PEM leak
surface and correcting the docs, (b) SHA-pinning the supply chain, and (c) standard
community-health + sanitization hygiene. None of the blockers require re-architecting
the release flow. **Readiness rating: 5/10** today; reaching ~9/10 is realistic within
the phased roadmap in §7.

---

## 3. Methodology & references

**What was audited (read-only):** the full file inventory (§8); `release.yml`,
`release-self.yml`, `test.yml`; `action.yml` + `src/` + `dist/`; `dependabot.yml`;
`package.json` / release-please config; `README.md` + `README.template.md`; community
health files (present vs missing); and — because the PEM leak surface lives there — the
sibling `action-github-app-token`'s `action.yml` and `scripts/fetch-mask.sh`.

**Grounding research** was done with fresh, individually-scoped web searches against
primary sources (GitHub Docs, OpenSSF, vendor release pages). Key references:

| Topic | Primary source |
|---|---|
| Secure use of Actions / SHA pinning | <https://docs.github.com/en/actions/reference/security/secure-use> |
| SHA-pinning policy enforcement (changelog) | <https://github.blog/changelog/2025-08-15-github-actions-policy-now-supports-blocking-and-sha-pinning-actions/> |
| `::add-mask::` is line-based; multi-line unsupported | Workflow commands docs + `actions/runner` #161 — <https://github.com/actions/runner/issues/161> |
| Real-world multi-line mask failure (precedent) | HashiCorp HCSEC-2021-13 / GHSA-4mgv-m5cm-f9h7 — <https://github.com/advisories/GHSA-4mgv-m5cm-f9h7> |
| OIDC trust policy `sub` scoping for AWS | <https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services> |
| `aws-actions/configure-aws-credentials` (role-to-assume, `mask-aws-account-id`) | <https://github.com/aws-actions/configure-aws-credentials> |
| `actions/create-github-app-token` (mints token, key signed in compiled code) | <https://github.com/actions/create-github-app-token> |
| Reusable-workflow `secrets: inherit` vs named secrets | <https://docs.github.com/en/actions/how-tos/reuse-automations/reuse-workflows> |
| OpenSSF Scorecard checks (Token-Permissions, Pinned-Dependencies, Security-Policy) | <https://github.com/ossf/scorecard/blob/main/docs/checks.md> |
| OpenSSF Best Practices Badge (passing/silver/gold) | <https://www.bestpractices.dev/> |
| StepSecurity Harden-Runner (egress audit) | <https://github.com/step-security/harden-runner> |
| `release-please-action` (v5, node24; inputs→manifest in v4+) | <https://github.com/googleapis/release-please-action> |
| `AGENTS.md` open standard | <https://agents.md/> · <https://github.com/agentsmd/agents.md> |

---

## 4. Narrative audit by theme

### 4.1 Secret handling & OIDC / GitHub-App security  — **LEAD SECTION**

This is the highest-severity theme. A prior iteration leaked the App PEM into logs;
this audit looks at whether the fix is durable and whether the *whole* credential path
is defensible to a public auditor.

**How the PEM is acquired and used today (traced end-to-end):**

1. `release.yml` → `aws-actions/configure-aws-credentials@v6` assumes
   `${{ secrets.AWS_ROLE_TO_ASSUME }}` via OIDC in region `us-west-2`.
2. `release.yml` → `ItsJennyFiggy/action-github-app-token@v1` (composite). Its
   `scripts/fetch-mask.sh`:
   - `aws ssm get-parameter --with-decryption` reads the client id and the **private
     key** (`/itsjennyfiggy/global/figgy_release_github_app_{client_id,private_key}`)
     into shell variables via command substitution.
   - masks the client id, then loops the PEM and emits `::add-mask::` **per non-empty
     line** — the correct workaround for GitHub's line-based masker.
   - writes the PEM multi-line into `$GITHUB_OUTPUT` via a heredoc delimiter.
3. The composite then calls `actions/create-github-app-token@v3` with that `client-id`
   + `private-key` to mint the **installation token**, which is the only credential
   handed downstream to `release-please`.

**Leak surface (the part that matters).** The architecture is reasonable — the PEM is
ultimately signed inside compiled code and only a short-lived token flows downstream —
**but the private key still materializes on the runner in plaintext** in a shell
variable *and* on disk in `$GITHUB_OUTPUT`, and the only thing standing between it and
a log line is the line-by-line mask. That mask is inherently fragile:

- It is an **exact-substring** defense. If a tool prints the key with different line
  boundaries (CRLF vs LF, re-wrapped, base64-reflowed) the masked tokens won't match
  and the body leaks — this is precisely the class of failure behind HCSEC-2021-13.
- `fetch-mask.sh` sets `set -euo pipefail` but **does not `set +x`**; with
  `ACTIONS_STEP_DEBUG=true` (a repo/org secret any maintainer can set) the runner can
  enable xtrace and `ACTIONS_STEP_DEBUG` is *documented to defeat masking*.
- The README **misrepresents** this path (see `DOC-01`), so an OSS reviewer auditing
  "where does the private key go?" is pointed at the wrong, safer-looking component.

**Candidate remediations (the planning agent should pick one for `SEC-01`).** Note: a
GitHub App *always* needs its RSA key to sign the auth JWT — these options change
*where the key lives* and *how it's handled*, not whether a key exists.

| Option | What changes | Residual leak surface | Effort |
|---|---|---|---|
| **1. Official-action-only path** | Keep the SSM fetch but stop writing the raw PEM to `$GITHUB_OUTPUT`; let `actions/create-github-app-token` consume the key via `env:`/file in a single step (key signed inside compiled JS, never echoed). | Key still on runner during the SSM read + handoff, but never re-serialized through shell output; smallest change. | **S–M** |
| **2. AWS KMS asymmetric signing** | Register the App's RSA key as a **non-exportable KMS key** (public half registered with the App); call KMS `Sign` to mint the App JWT, exchange JWT → installation token. | **Private key never lands on the runner** — cannot be printed or leaked from CI. Strongest posture. | **L** |
| **3. Defensive hardening (do regardless)** | `set +x` in the script; pass secrets via `env:`/tmpfs files (`chmod 600`) with trap-cleanup, never interpolated into shell; prefer **base64 round-trips** (single-line → masks correctly) over raw multi-line; document that `ACTIONS_STEP_DEBUG` defeats masking. | Reduces, doesn't remove, the on-runner exposure. | **S–M** |

Most of the mechanics for Options 1–3 live in `action-github-app-token`; `SEC-01`/
`SEC-02` therefore have a cross-repo component, flagged in their rows. Option 2 is the
recommended end-state; Option 1+3 is the pragmatic first step.

**OIDC trust-policy scoping (`SEC-03`).** The IAM role's *trust policy* lives in AWS and
isn't in this repo, so it can't be verified here — but the workflow is *designed to be
called by arbitrary platform repos via `secrets: inherit`*, which makes a sloppy
`sub` wildcard catastrophic. The trust policy's `token.actions.githubusercontent.com:sub`
must be pinned to specific `repo:ItsJennyFiggy/<repo>:ref:...` / `:environment:...`
values with `StringEquals` — never `repo:ItsJennyFiggy/*` (forks + Dependabot branches
could assume the role). This should be captured as a documented, testable trust-policy
template shipped with the workflow.

**`configure-aws-credentials` hardening (`SEC-04`).** The step omits
`mask-aws-account-id: true` (account id leaks into logs by default) and an explicit
short `role-duration-seconds`. Both are one-line additions.

**Least privilege (`SEC-05`).** `release.yml` grants the *job* `contents: write`,
`pull-requests: write`, `issues: write` — but `release-please` runs with the **App
token**, not `GITHUB_TOKEN`. The default-token write grants are therefore largely
unnecessary and should be tightened toward `contents: read` (Scorecard
*Token-Permissions* wants top-level read + minimal job-level writes). Also `id-token:
write` is declared at the **workflow top level**, granting it to any future job; scope
it to the single release job.

**`secrets: inherit` (`SEC-06`).** The `workflow_call` trigger declares `inputs` but no
`secrets:` block, forcing callers into `secrets: inherit`, which passes **all** of the
caller's secrets into this workflow. Declare an explicit named secret
(`AWS_ROLE_TO_ASSUME`) in `on.workflow_call.secrets` and have callers pass only that.

**Protected role assumption (`SEC-07`).** No GitHub Environment with required reviewers
gates the role assumption / release. A `production`-style environment (with the OIDC
`sub` pinned to that environment) adds a human gate before any token is minted.

#### ✅/❌ checklist — Secret handling & OIDC
- ❌ `SEC-01` Private key still materializes on the runner (shell var + `$GITHUB_OUTPUT`); evaluate KMS-signing / official-action-only path
- ❌ `SEC-02` `fetch-mask.sh` lacks `set +x`, uses raw multi-line output, doesn't flag `ACTIONS_STEP_DEBUG` (defensive hardening)
- ❌ `SEC-03` OIDC trust-policy `sub` scoping not documented/asserted (wildcard risk for a multi-repo reusable workflow)
- ❌ `SEC-04` `configure-aws-credentials` missing `mask-aws-account-id` + short `role-duration-seconds`
- ❌ `SEC-05` Over-broad job `GITHUB_TOKEN` permissions; `id-token: write` at workflow scope
- ❌ `SEC-06` `workflow_call` has no typed `secrets:` block → callers forced to `secrets: inherit`
- ❌ `SEC-07` No GitHub Environment / required-reviewer gate on role assumption
- ✅ Line-by-line PEM masking workaround is present (the prior leak *was* patched)
- ✅ Only a short-lived installation token is exposed downstream; the token is never `echo`ed
- ✅ OIDC used instead of long-lived AWS keys; token scoped to one repo per run

### 4.2 Reusable-workflow / composite-action design & quality

The reusable workflow is well-commented and the inputs (`release_type`,
`update_major_tag`) are typed and documented. Gaps:

- **`WF-01` No `concurrency:` control.** Two pushes to `main` in quick succession can
  run `release.yml` concurrently and race on the release PR / tag refs. Add
  `concurrency: { group: release-${{ github.ref }}, cancel-in-progress: false }`.
- **`WF-02` `workflow_call` declares no `secrets:` and no `outputs:`.** Beyond the
  security angle (`SEC-06`), callers get no typed contract and can't consume results
  (e.g. `release_created`, `tag_name`). Surface these as `workflow_call.outputs`.
- **`WF-03` `action.yml` has no `branding:`.** The Move-Major-Tag action defines
  name/description/inputs/outputs (good) but omits `branding` (icon/color) used by
  Marketplace listings.
- **`WF-04` No test caller / e2e validation of the reusable workflow.** `test.yml`
  builds and unit-tests the *Node action* (sensibly — it mutates tag refs, so a live
  self-invocation per PR is unsafe). But the *reusable workflow itself* has no smoke
  test. A minimal lint/`actionlint` pass plus an opt-in sandbox caller would catch
  YAML/contract regressions.

#### ✅/❌ checklist — Reusable-workflow / composite-action design
- ✅ Inputs typed + documented; clear inline rationale; `permissions` set at workflow AND job level
- ✅ Sensible decision to *not* run the ref-mutating action as a per-PR live test
- ❌ `WF-01` No `concurrency` control on `release.yml`
- ❌ `WF-02` No typed `secrets:`/`outputs:` on `workflow_call`
- ❌ `WF-03` `action.yml` missing `branding`
- ❌ `WF-04` No caller/e2e validation of the reusable workflow (e.g. `actionlint`)

### 4.3 Community health & contributor experience

Present: `README.md`, `LICENSE` (MIT), `.github/ISSUE_TEMPLATE/*`,
`pull_request_template.md`, `dependabot.yml`, `CHANGELOG.md`. Missing the rest of the
standard set, and there's a licensing inconsistency.

- **`CH-01` No `SECURITY.md`** — the most important omission given the secret-handling
  focus; also a direct OpenSSF Scorecard *Security-Policy* miss. Needs a vuln-reporting
  channel and disclosure policy.
- **`CH-02` No `CONTRIBUTING.md`**, **`CH-03` No `CODE_OF_CONDUCT.md`**,
  **`CH-04` No `CODEOWNERS`** (review routing; feeds branch-protection).
- **`CH-05` No maintainer/support statement** (`SUPPORT.md` or README section).
- **`CH-06` License mismatch:** `LICENSE` is **MIT** but `package.json` declares
  `"license": "CC0-1.0"`. These must be reconciled to a single intended license before
  publishing (ambiguous licensing is an adoption blocker).

#### ✅/❌ checklist — Community health
- ✅ `README`, `LICENSE`, issue templates, PR template, `CHANGELOG` present
- ❌ `CH-01` No `SECURITY.md`
- ❌ `CH-02`/`CH-03`/`CH-04` No `CONTRIBUTING` / `CODE_OF_CONDUCT` / `CODEOWNERS`
- ❌ `CH-05` No maintainer/support statement
- ❌ `CH-06` `LICENSE` (MIT) vs `package.json` (CC0-1.0) mismatch

### 4.4 Supply-chain & general security (OpenSSF Scorecard / Badge framing)

- **`SC-01` Third-party actions pinned to mutable tags, not SHAs.**
  `aws-actions/configure-aws-credentials@v6`, `googleapis/release-please-action@v5`,
  `actions/checkout@v6`, `actions/setup-node@v6`, and (in the sibling action)
  `actions/create-github-app-token@v3` are all movable tags. This is the
  `tj-actions`-style compromise vector and a Scorecard *Pinned-Dependencies* fail. Pin
  each to a full commit SHA with a trailing `# vX.Y.Z` comment (Dependabot understands
  SHA + comment and will still bump them).
- **`SC-02` No Harden-Runner.** Adding `step-security/harden-runner` with
  `egress-policy: audit` on the release job would give an egress baseline for a workflow
  that talks to AWS SSM + the GitHub API — high value for a credential-handling job.
- **`SC-03` No OpenSSF Scorecard workflow / Best Practices badge.** Running
  `ossf/scorecard-action` (and pursuing a `bestpractices.dev` passing badge) gives an
  external, continuously-checked security signal — strong trust signal for a public
  security-adjacent tool.
- **`SC-04` Consumers aren't guided to pin by SHA.** The README's caller example pins
  `@v1` (fine for convenience) but never tells security-conscious consumers they *can*
  pin this reusable workflow / action by commit SHA.
- **`SC-05` Committed `dist/` without release provenance.** `dist/index.js` is checked
  in and CI verifies it matches source (good, `test.yml` "Verify Bundle Up-To-Date"),
  but releases aren't signed and there's no SLSA/provenance attestation — a Scorecard
  *Signed-Releases* gap.

#### ✅/❌ checklist — Supply-chain & general security
- ✅ Dependabot covers **both** `npm` and `github-actions`
- ✅ CI verifies committed bundle matches source (no silent `dist/` drift)
- ✅ OIDC (no static cloud keys); restricted-ish default permissions present
- ❌ `SC-01` Third-party actions on mutable tags, not SHAs
- ❌ `SC-02` No Harden-Runner egress audit
- ❌ `SC-03` No Scorecard workflow / Best Practices badge
- ❌ `SC-04` No SHA-pinning guidance for consumers
- ❌ `SC-05` Releases unsigned / no provenance attestation

### 4.5 Documentation & usage discoverability

The README is above-average: it explains the two artifacts, has an input table, a
copy-paste caller example, and an architecture diagram. Two problems:

- **`DOC-01` The README is inaccurate about the credential path (security-relevant).**
  It states the token is minted by **`actions/create-github-app-token`** "scoped to the
  releasing repository," omitting the hand-rolled `action-github-app-token` SSM-fetch +
  line-masking step that is the *actual* historical leak surface. For an OSS readiness
  doc this is the single most misleading statement in the repo — it must describe the
  real path (SSM → mask → official token mint) so reviewers can audit it.
- **`DOC-02` README links to internal ADRs** in `ItsJennyFiggy/template-base`
  (`docs/adr/0001…`, `0002…`). If that repo stays private these are dead links for
  public readers; the relevant decisions should be inlined or the links dropped.

#### ✅/❌ checklist — Documentation
- ✅ README covers usage, inputs, required secrets/vars, caller example, architecture
- ❌ `DOC-01` README misstates the token-minting path (hides the PEM leak surface)
- ❌ `DOC-02` README links to internal-only ADR repo (`template-base`)

### 4.6 AI-agent files (`AGENTS.md` standard)

- **`AGT-01` No root `AGENTS.md`.** The repo ships a `CLAUDE.md` and a `.agents/` tree
  but not the cross-tool open standard (`AGENTS.md`, now stewarded under the Linux
  Foundation's Agentic AI Foundation and adopted by OpenAI/Google/Cursor/Sourcegraph
  et al.). A public repo should expose a tool-neutral `AGENTS.md` (it can be thin and
  point at the detailed rules).
- **`AGT-02` `.agents/` + `CLAUDE.md` contain internal-only governance** unsuitable for
  public release as-is: Vikunja task tracking, AWS role names
  (`itsjennyfiggy-agent-development`), "Private Zone B" merge-authority policy,
  `agent-shell`/SSO assumptions, and admin-bypass merge instructions. This content
  should be scoped/genericized (or kept out of the public tree) before publishing.

#### ✅/❌ checklist — AI-agent files
- ✅ Rich internal agent guidance exists (`CLAUDE.md`, `.agents/rules/*`)
- ❌ `AGT-01` No root `AGENTS.md` (the open standard)
- ❌ `AGT-02` Internal-only agent governance content not scoped for public release

### 4.7 Sanitization — internal/org-specific content to genericize or remove

- **`SAN-01` Hard-coded internal infra identifiers.** SSM paths
  `/itsjennyfiggy/global/figgy_release_github_app_*`, the app slug `figgy_release`,
  region `us-west-2`, org `ItsJennyFiggy`, and the SSM secret names are baked into the
  workflow and the sibling action. For a public reusable workflow these must be
  parameterized (inputs/vars) or clearly documented as "replace with your own," so the
  workflow isn't hard-wired to one private AWS account's layout.
- **`SAN-02` Leftover template scaffolding.** `README.template.md` and
  `docs/templates/PROJECT_PLANNING.md` are generic template files, and `.env.example`
  contains `INPUT_WHO_TO_GREET=World` — boilerplate from a "hello world" action that has
  nothing to do with this repo's actual inputs (`tag`, `github-token`). Remove or
  replace before publishing to avoid confusing consumers.
- **`SAN-03` Internal ADR / cross-repo references** (see also `DOC-02`): pointers to the
  private `template-base` repo should be removed or inlined.

#### ✅/❌ checklist — Sanitization
- ❌ `SAN-01` Internal SSM paths / app slug / region / org identifiers hard-coded
- ❌ `SAN-02` Leftover template files + mismatched `.env.example`
- ❌ `SAN-03` Internal ADR / `template-base` cross-repo references

---

## 5. Exemplar projects (strong OSS backing) mapped to the practice each models

Verify each against its primary source at implementation time.

| Exemplar (primary source) | Practice it models | Maps to |
|---|---|---|
| **`actions/create-github-app-token`** — <https://github.com/actions/create-github-app-token> | Minting a scoped App token where the PEM is signed inside compiled code and never echoed; only short-lived token exposed | `SEC-01` opt.1, `DOC-01` |
| **AWS KMS asymmetric signing** — <https://docs.aws.amazon.com/kms/latest/developerguide/asymmetric-key-specs.html> | Non-exportable private key; `Sign` API mints JWT, key never on runner | `SEC-01` opt.2 |
| **`aws-actions/configure-aws-credentials`** — <https://github.com/aws-actions/configure-aws-credentials> | OIDC `role-to-assume`, `mask-aws-account-id`, short session duration | `SEC-03`,`SEC-04` |
| **HashiCorp `vault-action` (HCSEC-2021-13)** — <https://github.com/advisories/GHSA-4mgv-m5cm-f9h7> | Cautionary precedent: multi-line secret mask failure in CI output | `SEC-01`,`SEC-02` |
| **`step-security/harden-runner`** — <https://github.com/step-security/harden-runner> | Egress auditing / EDR for runners on credential-handling jobs | `SC-02` |
| **`ossf/scorecard` + `scorecard-action`** — <https://github.com/ossf/scorecard> | Automated, continuous security scoring (Token-Permissions, Pinned-Deps, Security-Policy) | `SC-03`,`SC-01`,`SEC-05`,`CH-01` |
| **OpenSSF Best Practices Badge** — <https://www.bestpractices.dev/> | External passing/silver/gold trust signal | `SC-03` |
| **`sigstore/cosign` / `slsa-framework/slsa-github-generator`** — <https://github.com/slsa-framework/slsa-github-generator> | Signed releases + build provenance for shipped artifacts | `SC-05` |
| **`googleapis/release-please-action`** — <https://github.com/googleapis/release-please-action> | Release automation, manifest config, clear versioning/docs | `WF-02`,`SC-04` |
| **`actions/checkout`** — <https://github.com/actions/checkout> | Public Action structure: `branding`, floating major + immutable tags, SHA-pin guidance | `WF-03`,`SC-04` |
| **`agentsmd/agents.md`** — <https://github.com/agentsmd/agents.md> | The `AGENTS.md` open standard for agent instructions | `AGT-01` |

---

## 6. Work-item-ready findings

> Severity: Critical/High/Medium/Low · Effort: S (≤½ day) / M (≤2 days) / L (>2 days).
> Items marked **(cross-repo)** require changes in `action-github-app-token`.

| ID | Title | Theme | Severity | Effort | Rationale | Acceptance criteria |
|---|---|---|---|---|---|---|
| **SEC-01** | Eliminate/justify residual PEM-on-runner exposure | Secret handling | Critical | L | Private key still lands on the runner (shell var + `$GITHUB_OUTPUT`) behind only fragile line-masking **(cross-repo)** | A documented decision selecting opt.1 (official-action-only, no raw PEM in `$GITHUB_OUTPUT`) or opt.2 (KMS signing); chosen option implemented; the raw multi-line PEM no longer written to `$GITHUB_OUTPUT`; a test/CI assertion proves no PEM body appears in logs for a sample key |
| **SEC-02** | Defensive hardening of the credential script | Secret handling | High | M | `fetch-mask.sh` lacks `set +x`, uses raw multi-line output, ignores `ACTIONS_STEP_DEBUG` **(cross-repo)** | `set +x` (or equivalent) added; secrets passed via `env:`/file not shell interpolation; base64 round-trip used for any multi-line transfer; README/SECURITY notes that `ACTIONS_STEP_DEBUG` defeats masking; bats test covers the hardened path |
| **SEC-03** | Document + assert OIDC trust-policy scoping | Secret handling | High | M | Trust `sub` must pin repo + ref/environment; wildcard = wide blast radius for a multi-caller reusable workflow | A trust-policy template committed (e.g. `docs/`) using `StringEquals` on `repo:ItsJennyFiggy/<repo>:ref:`/`:environment:`; README documents required scoping; explicit "no `:*` wildcard" note |
| **SEC-04** | Harden `configure-aws-credentials` step | Secret handling | Medium | S | Account id leaks to logs; no bounded session | `mask-aws-account-id: true` and an explicit short `role-duration-seconds` set on the step; verified in `release.yml` |
| **SEC-05** | Apply least-privilege permissions | Secret handling | High | S | Job grants `contents/pull-requests/issues: write` though `release-please` uses the App token; `id-token: write` is workflow-wide | Top-level `permissions` reduced to `contents: read`; job-level writes reduced to the minimum actually needed; `id-token: write` scoped to the release job only; release still succeeds |
| **SEC-06** | Declare typed `workflow_call.secrets` | Secret handling | Medium | S | `secrets: inherit` passes ALL caller secrets | `on.workflow_call.secrets` declares `AWS_ROLE_TO_ASSUME` (required); `release-self.yml` + README updated to pass it explicitly instead of `inherit` |
| **SEC-07** | Gate role assumption behind a GitHub Environment | Secret handling | Medium | M | No human/reviewer gate before a token is minted | A GitHub Environment (e.g. `release`) with required reviewers referenced by the release job; OIDC `sub` pinned to that environment; documented |
| **DOC-01** | Correct README's credential-path description | Documentation | High | S | README claims official `create-github-app-token` mints the token, hiding the real SSM-fetch/mask leak surface | README accurately describes SSM → line-mask → `create-github-app-token`; names `action-github-app-token`; links to SECURITY for the leak-prevention rationale |
| **DOC-02** | Remove/inline internal ADR links | Documentation | Medium | S | Links to private `template-base` repo are dead for public readers | README contains no links to private repos; relevant decisions inlined or dropped; link-check passes |
| **WF-01** | Add `concurrency` control to `release.yml` | Reusable-workflow design | Medium | S | Concurrent `main` pushes can race the release PR/tags | `concurrency` group keyed on ref with `cancel-in-progress: false` present; two rapid pushes serialize |
| **WF-02** | Add typed `outputs` to `workflow_call` | Reusable-workflow design | Medium | S | Callers get no typed result contract | `on.workflow_call.outputs` exposes at least `release_created` and `tag_name`; documented in README; consumed in a sample caller |
| **WF-03** | Add `branding` to `action.yml` | Reusable-workflow design | Low | S | Marketplace listing lacks icon/color | `action.yml` has valid `branding.icon` + `branding.color` |
| **WF-04** | Add reusable-workflow lint/e2e validation | Reusable-workflow design | Medium | M | Only the Node action is tested; the workflow YAML/contract isn't | `actionlint` (or equivalent) runs in CI over `.github/workflows/*`; optional opt-in sandbox caller documented; CI fails on invalid workflow YAML |
| **CH-01** | Add `SECURITY.md` | Community health | High | S | No disclosure policy; Scorecard Security-Policy fail; lead theme is secrets | `SECURITY.md` present with a private reporting channel + supported-versions + disclosure process; referenced from README |
| **CH-02** | Add `CONTRIBUTING.md` | Community health | Medium | S | No contributor guidance | `CONTRIBUTING.md` covers dev setup, test/coverage gate, commit convention, bundle-rebuild step |
| **CH-03** | Add `CODE_OF_CONDUCT.md` | Community health | Medium | S | No code of conduct | `CODE_OF_CONDUCT.md` present (e.g. Contributor Covenant) with a real contact |
| **CH-04** | Add `CODEOWNERS` | Community health | Medium | S | No review routing | `.github/CODEOWNERS` present and valid; ties into branch protection |
| **CH-05** | Add maintainer/support statement | Community health | Low | S | No stated support model | `SUPPORT.md` or README section states maintenance status + support channel |
| **CH-06** | Reconcile license mismatch | Community health | High | S | `LICENSE`=MIT vs `package.json`=CC0-1.0 → ambiguous licensing blocks adoption | `package.json` `license` field matches `LICENSE`; single license declared consistently across repo |
| **SC-01** | SHA-pin all third-party actions | Supply-chain | High | M | Mutable tags (`@v6/@v5/@v3`) are the `tj-actions` compromise vector; Scorecard Pinned-Deps fail | Every non-first-party `uses:` pinned to a full commit SHA with `# vX.Y.Z` comment (incl. sibling action) **(cross-repo for that action)**; Dependabot still bumps them |
| **SC-02** | Add Harden-Runner egress audit | Supply-chain | Medium | S | No egress baseline on a credential-handling job | `step-security/harden-runner@<sha>` with `egress-policy: audit` as first step of the release job |
| **SC-03** | Add Scorecard workflow + pursue Best Practices badge | Supply-chain | Medium | M | No external continuous security signal | `ossf/scorecard-action` workflow runs and publishes results; a `bestpractices.dev` entry created and README badge added |
| **SC-04** | Document SHA-pinning for consumers | Supply-chain | Low | S | Consumers only shown `@v1` | README shows both `@v1` (convenience) and `@<sha>` (hardened) caller examples with the trade-off explained |
| **SC-05** | Sign releases / add provenance | Supply-chain | Low | M | Unsigned releases; Scorecard Signed-Releases gap | Release artifacts/tags signed or SLSA provenance attested via the release pipeline; verification steps documented |
| **AGT-01** | Add root `AGENTS.md` | AI-agent files | Medium | S | Missing the cross-tool open standard | Root `AGENTS.md` present (tool-neutral), pointing at detailed rules; contains no internal-only secrets/identifiers |
| **AGT-02** | Scope internal agent governance for public release | AI-agent files | Medium | M | `CLAUDE.md`/`.agents/*` expose internal roles, Vikunja, merge-authority policy | Internal-only content removed or genericized; no internal AWS role names / task-tracker / "Zone B" merge policy remain in the public tree |
| **SAN-01** | Genericize internal infra identifiers | Sanitization | High | M | SSM paths, `figgy_release`, `us-west-2`, org names hard-coded | Internal identifiers parameterized via inputs/vars or clearly documented as replaceable; no private SSM path/app slug hard-wired in published files |
| **SAN-02** | Remove leftover template scaffolding | Sanitization | Medium | S | `README.template.md`, `docs/templates/PROJECT_PLANNING.md`, `.env.example` (`INPUT_WHO_TO_GREET`) are irrelevant boilerplate | Template files removed or replaced with repo-accurate content; `.env.example` reflects actual inputs or is removed |
| **SAN-03** | Remove internal cross-repo references | Sanitization | Medium | S | References to private `template-base` repo | No references to private repos remain in published files (coordinated with `DOC-02`) |

---

## 7. Suggested sequencing (phased roadmap)

**Phase 0 — Secret-handling blockers (do first, before any publish).**
`SEC-01` → `SEC-02` → `SEC-05` → `SEC-06` → `SEC-04` → `SEC-03` → `DOC-01`.
Rationale: close/justify the residual PEM exposure and correct the doc that hides it
*before* the code is visible publicly. `SEC-05/06/04` are cheap, high-value tightenings;
`SEC-03` is mostly a documented AWS-side template.

**Phase 1 — Supply-chain hardening.**
`SC-01` (SHA-pin everything) → `SC-02` (Harden-Runner) → `SC-04` (consumer pin guidance).
`SC-01` is the highest-value supply-chain fix and unblocks a clean Scorecard run.

**Phase 2 — Sanitization for public exposure.**
`SAN-01` → `SAN-02` → `SAN-03` → `DOC-02` → `AGT-02`. Must complete before flipping the
repo to public so no internal infra layout/identifiers ship.

**Phase 3 — Community health + licensing.**
`CH-06` (license — blocker) → `CH-01` (SECURITY) → `CH-04` (CODEOWNERS) →
`CH-02`/`CH-03`/`CH-05`. `CH-06` and `CH-01` first (legal clarity + disclosure path).

**Phase 4 — Workflow polish & external signals.**
`WF-01` → `WF-02` → `WF-04` → `WF-03` → `AGT-01` → `SC-03` → `SC-05`.
Quality + trust-signal work that benefits from the earlier hardening being in place.

**Gate to "public-ready":** all `Critical`/`High` items (`SEC-01`, `SEC-02`, `SEC-03`,
`SEC-05`, `DOC-01`, `SC-01`, `CH-01`, `CH-06`, `SAN-01`) closed; Phase 2 sanitization
complete.

---

## 8. Appendix — file inventory (present vs missing)

### Present
```
.editorconfig                              .github/ISSUE_TEMPLATE/bug_report.md
.env.example                       (SAN-02) .github/ISSUE_TEMPLATE/feature_request.md
.gitignore                                 .github/pull_request_template.md
.node-version                              .github/dependabot.yml          (npm + github-actions)
.release-please-manifest.json              .github/workflows/release.yml   (reusable; SEC/WF findings)
CHANGELOG.md                               .github/workflows/release-self.yml
CLAUDE.md                          (AGT-02) .github/workflows/test.yml
LICENSE  (MIT — conflicts w/ pkg; CH-06)   action.yml                      (WF-03: no branding)
README.md                          (DOC-01) src/index.ts, src/main.ts
README.template.md                 (SAN-02) __tests__/main.test.ts
biome.json                                 dist/index.js                   (committed; CI drift-checked)
package.json (license: CC0-1.0; CH-06)     release-please-config.json
tsconfig.json                              vitest.config.ts
docs/templates/PROJECT_PLANNING.md (SAN-02) .agents/** (rules, skills, workflows; AGT-02)
```

### Missing / recommended
```
AGENTS.md            (AGT-01)   CONTRIBUTING.md      (CH-02)
SECURITY.md          (CH-01)    CODE_OF_CONDUCT.md   (CH-03)
.github/CODEOWNERS   (CH-04)    SUPPORT.md           (CH-05)
OIDC trust-policy template/doc  (SEC-03)
ossf/scorecard workflow + Best Practices badge (SC-03)
actionlint / reusable-workflow validation (WF-04)
```

*End of report. Transient planning artifact — delete once converted to work items.*
