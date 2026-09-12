# Contributing to Giumag PDF

Thank you for contributing to Giumag PDF.

Giumag PDF is a privacy-first, local-first PDF toolkit. Contributions should preserve that model while keeping changes focused, testable and easy to review.

## Project status

The Web/PWA is currently in public beta on the `0.21.0-beta.x` line.

During the beta, stabilization has priority over feature growth. Work should generally be prioritized in this order:

1. privacy and security;
2. data integrity;
3. regressions;
4. crashes and hangs;
5. browser and PWA compatibility;
6. accessibility;
7. UX bugs;
8. polish;
9. new features.

See `docs/BETA_OPERATIONS.md` for the current beta triage and release rules.

## Privacy and local-first requirements

- PDF processing is expected to remain on the user device.
- Do not introduce document uploads, remote processing, analytics or external data flows without an explicit project decision.
- Do not commit or publish real confidential, personal or sensitive PDF documents.
- Use synthetic or deliberately non-sensitive test documents.
- Review changes involving parsing, URLs, images, HTML, workers, WebAssembly, storage, permissions or network requests for privacy and security impact.

Security vulnerabilities must follow `SECURITY.md`. Do not disclose vulnerability details or exploit material in a public issue.

## Repository structure

- `apps/client`: React Web/PWA client.
- `apps/desktop`: Tauri desktop application.
- `apps/mobile`: Capacitor mobile application.
- `packages/pdf-engine`: shared PDF engine.
- `packages/shared`: shared types and utilities.

The repository is managed as a pnpm workspace.

## Development setup

Run commands from the repository root unless a task explicitly requires a package-specific command.

Install dependencies with `pnpm install`.

Start the Web development server with `pnpm dev`.

The main validation commands are:

- `pnpm typecheck`
- `pnpm test`
- `pnpm build:web`

CI uses the repository lockfile. Avoid unrelated lockfile changes.

## Branch and change discipline

- Start from an up-to-date `main`.
- Use one focused branch for one logical change.
- Keep pull requests small enough to understand and verify.
- Do not mix unrelated refactors, formatting or dependency changes into a bug fix.
- Do not commit generated build artifacts unless they are intentionally part of the change.
- Do not change project versions unless versioning is explicitly part of the work.
- Do not create `v*` tags during the Web beta. The desktop release workflow currently reacts to `v*` tags.

Recommended branch prefixes are `fix/`, `feat/`, `docs/` and `chore/`.

## Validation

Choose validation according to the files and behavior changed.

For application or PDF-engine changes, the normal baseline is:

- `pnpm typecheck`
- `pnpm test`
- `pnpm build:web`

Also perform focused manual smoke testing for the affected workflow.

For documentation-only or repository-governance changes, a full application build is not required when the change cannot affect runtime behavior. The diff must still remain strictly scoped and pass whitespace checks.

Before opening a pull request:

- verify that only intended files changed;
- run `git diff --check` or the equivalent staged check;
- run all tests relevant to the change;
- verify browser or PWA behavior when applicable;
- verify that privacy and local-first behavior remain intact;
- confirm that no sensitive test data is included.

## Pull requests

A pull request should explain:

- what changed;
- why the change is needed;
- the exact scope;
- privacy or security implications;
- tests and checks performed;
- manual smoke testing performed;
- browser or PWA impact when relevant;
- related issues when applicable.

If a validation step is not applicable, mark it as not applicable and briefly explain why.

Do not use a pull request to disclose a security vulnerability. Follow `SECURITY.md` instead.

## Review and merge

Changes are reviewed through pull requests and CI before merge.

The project uses Squash and merge for focused changes. Merge is a deliberate maintainer action and is not performed automatically by ordinary contribution workflows.

After merge, branch cleanup should happen only after the pull request, merged SHA and resulting `main` state have been verified.

## Beta issue workflow

For beta bugs, feedback and feature requests, use the repository Issue Forms.

Active beta issues may use:

- `beta`;
- `regression`;
- `privacy`;
- `accessibility`;
- exactly one priority label from `priority: p0` through `priority: p3`;
- the `0.21.x Web Beta` milestone when the issue is targeted for the current beta cycle.

Priority and milestone assignment are part of maintainer triage.

Thank you for helping improve Giumag PDF while preserving its privacy-first and local-first design.
