# Giumag PDF — AI Handoff

## Current task

Phase 1 bounded homepage task: make the primary PDF-opening entry point generic and accurate while preserving the existing direct page-view/organization workspace.

Do not introduce routing, registry refactors, CSS architecture changes or PDF-engine changes in this task.

## Current Git state

- Expected branch: `feat/home-open-flow`
- Verified base `main`: `6a78003791218267ac539789a2835970623f9c5f`
- That base is the Squash and merge commit for PR #30 (`chore: add AI continuity bootstrap`).
- Expected HEAD before commit: same as the verified base.
- Expected changed paths before commit:
  - `apps/client/src/App.tsx`
  - `docs/AI_PROJECT_STATE.md`
  - `docs/AI_HANDOFF.md`
- No commit, push, PR, merge, deploy, tag or branch deletion is part of the implementation procedure.

Always re-run `pnpm preflight` and `git status` before continuing because this file can become stale.

## Completed in this task

- Verified Phase 0 was merged into `main` through PR #30.
- Synchronized local `main` to the verified merge commit.
- Started the focused `feat/home-open-flow` branch.
- Changed the homepage primary dropzone title from organizer-specific wording to `Apri un PDF`.
- Clarified that the direct open flow is for viewing/organizing pages and that other operations are available in the tool catalog.
- Preserved all existing opening behavior.
- Preserved the local-first processing model.
- Moved durable project state from Phase 0 to Phase 1.
- Completed manual desktop/mobile, light/dark, and PDF-opening behavior verification successfully.

## Files materially changed

- `apps/client/src/App.tsx` — homepage opening copy only.
- `docs/AI_PROJECT_STATE.md` — current phase and verified baseline.
- `docs/AI_HANDOFF.md` — this rolling resume point.

## Validation

Executed after the UI/state change:

- `pnpm typecheck` — passed.
- `pnpm test` — passed.
- `pnpm build:web` — passed.
- generated `apps/client/tsconfig.tsbuildinfo` metadata restored after build.
- final `pnpm preflight` and `git diff --check` - passed.
- manual homepage verification on desktop/mobile and light/dark mode - passed.

## Product decision for this bounded task

Do not add an intermediate tool-selection modal merely to make the homepage feel more generic.

The primary dropzone remains a direct entry to the existing page-view/organization workspace. Its copy now states that role honestly and points users toward the full tool catalog for other operations.

This resolves the misleading copy without changing navigation architecture.

## Known issues / future work

- Client workspace dispatch still duplicates tool knowledge in `App.tsx`.
- Durable tool URLs are not implemented.
- The large global stylesheet remains an incremental maintainability task.
- Existing bundle/import warnings remain non-blocking unless they cause a reproducible user-visible failure.
- Tool discoverability can be evaluated separately after this bounded change is reviewed.

## Exact next step

Manual UI verification has passed. Review this focused pull request and its CI. If review and CI are green, Squash and merge through GitHub. After merge, synchronize `main`; merged-branch cleanup remains a separate explicitly authorized operation.

Then select the next bounded Phase 1 homepage discoverability task without combining routing, registry consolidation or CSS architecture migration.

## Do not redo

- Do not add a modal to this opening flow without new evidence.
- Do not introduce routing in this task.
- Do not refactor the client tool registry in this task.
- Do not migrate the CSS architecture in this task.
- Do not touch `packages/pdf-engine` for this task.