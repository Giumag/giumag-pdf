# Giumag PDF — AI Handoff

## Current task

Phase 2 bounded privacy/trust task: add a concise expandable homepage explanation of what local-first processing means.

The copy must stay aligned with `docs/SECURITY_PRIVACY.md`. Do not introduce stronger privacy promises than the repository baseline supports.

## Current Git state

- Expected branch: `feat/home-privacy-explainer`
- Verified base `main`: `a2f549e1e29c8ecbd67fc64149281114b48efa59`
- That base is the Squash and merge commit for PR #33 (`feat: improve homepage trust and tools access`).
- Expected HEAD before commit: same as the verified base.
- Expected changed paths before commit:
  - `apps/client/src/App.tsx`
  - `apps/client/src/styles.css`
  - `docs/AI_PROJECT_STATE.md`
  - `docs/AI_HANDOFF.md`
- No commit, push, PR, merge, deploy, tag or branch deletion is part of the implementation procedure.

Always re-run `pnpm preflight` and `git status` before continuing because this file can become stale.

## Completed in this task

- Verified PR #33 was Squash and merged into `main`.
- Synchronized local `main` to the verified merge commit.
- Started the focused `feat/home-privacy-explainer` branch.
- Added a native `<details>` privacy explainer below the homepage privacy row.
- Kept the explainer closed by default.
- Explained that supported PDF operations are processed on-device rather than sent to a document-processing backend.
- Explained that analytics are disabled by default.
- Explained that offline caching covers application assets rather than documents.
- Included the hosting-provider network-metadata caveat from the security/privacy baseline.
- Linked the explainer to `docs/SECURITY_PRIVACY.md`.
- Added only focused styles for the disclosure.
- Kept routing, dependencies, analytics, telemetry and the PDF engine unchanged.
- Updated durable project state for this bounded task.
- Completed manual desktop/mobile, light/dark, disclosure open/close, keyboard-focus and privacy-link verification successfully.

## Files materially changed

- `apps/client/src/App.tsx` — privacy explainer markup and authoritative copy.
- `apps/client/src/styles.css` — focused disclosure styles only.
- `docs/AI_PROJECT_STATE.md` — current Phase 2 task and verified baseline.
- `docs/AI_HANDOFF.md` — this rolling resume point.

## Validation

Executed after implementation:

- `pnpm typecheck` — passed.
- `pnpm test` — passed.
- `pnpm build:web` — passed.
- generated `apps/client/tsconfig.tsbuildinfo` metadata restored after build.
- final `pnpm preflight` and `git diff --check` - passed.
- manual privacy explainer verification on desktop/mobile and light/dark mode - passed.

## Product decision for this bounded task

Trust copy should be transparent, not merely promotional.

The explainer therefore states both the local-processing guarantees documented by the project and the normal hosting-network metadata caveat. It remains optional/expandable so the homepage stays visually restrained.

## Known issues / future work

- Client workspace dispatch still duplicates tool knowledge in `App.tsx`.
- Durable tool URLs are not implemented.
- The global stylesheet remains a large incremental maintainability task.
- Existing bundle/import warnings remain non-blocking unless they cause a reproducible user-visible failure.
- A dedicated in-app privacy page remains a future decision; the homepage currently links to the authoritative repository document.

## Exact next step

Manual privacy verification has passed. Review this focused pull request and its CI. If review and CI are green, Squash and merge through GitHub. After merge, synchronize `main`; merged-branch cleanup remains a separate explicitly authorized operation.

Then evaluate whether Phase 2 has any remaining high-value trust/public-beta gaps. If not, move to Phase 3 registry consolidation as a separate bounded task.

## Do not redo

- Do not add stronger privacy claims than `docs/SECURITY_PRIVACY.md` supports.
- Do not add analytics or telemetry.
- Do not add a consent banner without a separate product/legal requirement.
- Do not add routing in this task.
- Do not add dependencies in this task.
- Do not migrate CSS architecture in this task.
- Do not touch `packages/pdf-engine` for this task.