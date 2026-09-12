# AGENTS.md

## Mission

Giumag PDF is an open-source, privacy-first, local-first PDF toolkit. Preserve working behavior and improve the product through small, reviewable and reversible changes.

The Web/PWA public beta is the current hardening target. Stabilization takes priority over feature growth.

## Source of truth

When information conflicts, prefer:

1. current source code and reproducible behavior;
2. automated tests and verified build results;
3. authoritative project documentation, especially `CONTRIBUTING.md`, `SECURITY.md` and `docs/BETA_OPERATIONS.md`;
4. accepted entries in `docs/AI_DECISIONS.md`;
5. `docs/AI_PROJECT_STATE.md`;
6. `docs/AI_HANDOFF.md`;
7. prior conversations or copied summaries.

Never claim a check passed unless it was actually executed.

## Privacy and local-first invariants

- Keep supported PDF processing on the user's device.
- Do not add document uploads, remote PDF processing, analytics, telemetry, tracking or external document-processing APIs without an explicit project decision.
- Do not send PDF contents, extracted text, OCR output, thumbnails, document metadata, passwords, signatures, annotations or redacted content to remote services.
- Keep intentionally local runtime assets local; do not introduce runtime CDN dependencies casually.
- Never weaken CSP, security headers or local-processing guarantees merely to simplify implementation.
- Use synthetic or non-sensitive documents for tests.

See `SECURITY.md` and `docs/SECURITY_PRIVACY.md`.

## Session preflight

Before modifying code:

1. run `pnpm preflight` when available;
2. inspect current branch, HEAD and `git status`;
3. preserve unrelated user changes;
4. read `CONTRIBUTING.md` and `docs/BETA_OPERATIONS.md`;
5. read `docs/AI_PROJECT_STATE.md`, `docs/AI_DECISIONS.md` and `docs/AI_HANDOFF.md`;
6. inspect task-relevant source, tests and nearby abstractions;
7. inspect existing scripts before adding automation.

If repository state contradicts a handoff, investigate before continuing.

## Change discipline

- Prefer the smallest complete change.
- Avoid repository-wide rewrites, unrelated refactors, mass formatting and speculative architecture.
- Avoid unnecessary dependency or lockfile changes.
- Do not change versions, release configuration, deployment configuration or publishing behavior unless the active task requires it.
- Do not silently reverse an accepted decision; supersede it in `docs/AI_DECISIONS.md` when necessary.
- Accessibility, mobile behavior, light/dark mode and reduced motion are part of frontend correctness.

## Protected and high-risk areas

Treat `packages/pdf-engine` and document-processing behavior as high risk.

Do not refactor parsing, serialization, rendering, OCR, redaction, encryption, password handling, metadata handling, signatures or PDF output generation merely for cleanliness.

If a frontend-only solution is sufficient, keep the PDF engine unchanged.

## Validation

Canonical application checks are currently:

- `pnpm typecheck`
- `pnpm test`
- `pnpm build:web`
- `git diff --check`

Choose targeted checks during implementation and broader checks after coherent changes. Documentation-only/governance work may omit a full app build when it cannot affect runtime behavior, as allowed by `CONTRIBUTING.md`.

CI is defined in `.github/workflows/ci.yml`.

## Git and release restrictions

- Use one focused branch per logical workstream.
- Do not destroy unknown work with `git reset --hard`, `git clean -fd`, forced checkout or history rewriting.
- Do not push, merge, deploy, publish or delete branches unless explicitly authorized for the current workflow.
- Do not create `v*` tags during the Web beta; the desktop release workflow reacts to them.
- The project uses deliberate Squash and merge through pull requests.

## Automation-first expectations

If repository access is available, perform safe mechanical work directly.

If user-side execution is required, prefer one guarded, deterministic and idempotent procedure over many manual edits or disconnected commands.

Reusable repeated automation belongs in repository-native tooling when it materially reduces errors and remains small.

## Continuity files

- `docs/AI_PROJECT_STATE.md`: current durable development state; not a diary.
- `docs/AI_DECISIONS.md`: durable architectural/product decisions.
- `docs/AI_HANDOFF.md`: short rolling resume point for the next session.

Update only the files whose truth changed. Keep `AI_HANDOFF.md` concise and rewrite stale content instead of appending history.

Git remains the authoritative history.