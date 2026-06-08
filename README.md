# TypeScript GitHub Action Template (template-github-action)

This is the standard child template repository for developing custom, high-quality, type-safe GitHub Actions in TypeScript.

---

## 🎯 Purpose

This repository provides the development boilerplate, packaging scripts, test harnesses, and quality gates required to build custom Node.js-based GitHub Actions. By establishing TypeScript compiling and Vitest unit testing out-of-the-box, it ensures that logic-heavy custom actions are fully testable, modular, and performant before deployment.

---

## 📂 Repository Structure

```
├── .agents/               # Shared developer rules, skills, and workflows
├── .github/
│   ├── ISSUE_TEMPLATE/    # Bug report and feature request templates
│   ├── workflows/
│   │   └── test.yml       # CI workflow running builds, unit tests, and integration tests
│   ├── dependabot.yml     # Automated dependency update configuration
│   └── pull_request_template.md
├── __tests__/             # Unit test suite targeting the action logic
│   └── main.test.ts
├── src/                   # Action source code
│   ├── index.ts           # Process wrapper / execution entrypoint
│   └── main.ts            # Core action runner logic
├── action.yml             # GitHub Action metadata definition
├── biome.json             # Biome formatter and linter configuration
├── package.json           # Project manifests, scripts, and dependencies
├── tsconfig.json          # TypeScript compiler configuration targeting Node 24
├── vitest.config.ts       # Vitest configuration with 85% coverage gate
├── .node-version          # Node.js version pin (read by setup-node and local tools)
└── README.md              # Project documentation
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: v24 or newer (to match the runner's execution environment)
- **NPM**: v10 or newer

### Local Setup

1. Clone this repository (or create a new repository from this template).
2. Install the localized runtime dependencies and devDependencies:
   ```bash
   npm install
   ```
3. Run the local test suite using Vitest:
   ```bash
   npm run test
   ```
4. Verify code coverage meets the 85% requirement gate:
   ```bash
   npm run coverage
   ```

### Developing the Action

1. Declare your input parameters and outputs in [action.yml](file:///Users/jfiggy/dev/itsjennyfiggy/template-github-action/action.yml).
2. Implement your core action execution code inside [src/main.ts](file:///Users/jfiggy/dev/itsjennyfiggy/template-github-action/src/main.ts).
3. Write matching regression or unit tests following the AAA pattern inside [__tests__/main.test.ts](file:///Users/jfiggy/dev/itsjennyfiggy/template-github-action/__tests__/main.test.ts) to verify edge cases and boundaries.
4. Run the linter to catch style and correctness issues ([Biome](https://biomejs.dev/) — single tool, no plugin sprawl):
   ```bash
   npm run lint
   ```
5. Compile and bundle the action into a single file before committing:
   ```bash
   npm run build
   ```
   > [!IMPORTANT]
   > GitHub Actions run from the compiled `dist/index.js` file specified in `action.yml`. You must build the bundle and track the resulting `dist/` directory inside your Git commits.

> [!NOTE]
> CI enforces an 85% coverage gate (statements, branches, functions, lines) via `npm run coverage`. This threshold is configured in `vitest.config.ts` and mirrors the standard in `.agents/rules/testing_standards.md`.

---

## ⚖️ Licensing

This template is dedicated to the public domain under the **CC0 1.0 Universal** waiver. 

Downstream repositories scaffolded from this template have no legal requirement to carry copyright notices or attributions for the boilerplate files, allowing them to be closed-source, proprietary, or open-source under any choice of license.
