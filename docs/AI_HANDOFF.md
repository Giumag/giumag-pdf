# Giumag PDF — AI Handoff

## Current task

Phase 0 bootstrap: establish the repository-native AI continuity layer and a minimal reusable preflight helper. Do not modify production UI behavior or `packages/pdf-engine`.

## Current Git state

- Expected branch after bootstrap: `chore/ai-continuity-bootstrap`
- Bootstrap base remote `main`: `aad4a31a949285adfa28283c6042f332bba9b077`
- Expected HEAD before commit: same as bootstrap base
- Expected working tree: intentionally dirty only with the bootstrap files listed below
- No commit, push, pull request, merge, deploy, tag or branch deletion is part of this bootstrap procedure.

Always re-run `pnpm preflight` and `git status` before continuing because this file can become stale.

## Completed in this session

- Inspected current public repository structure and authoritative beta/development documentation.
- Verified canonical root validation commands and CI sequence.
- Verified the 18-tool shared metadata registry.
- Confirmed the current home uses state-based workspace dispatch and no routing dependency.
- Confirmed the global stylesheet is a significant maintainability hotspot.
- Confirmed focused PDF-engine tests exist.
- Added the AI continuity layer.
- Added a small cross-platform project preflight helper.

## Files materially changed

- `AGENTS.md` — stable AI session rules and safety constraints.
- `docs/AI_PROJECT_STATE.md` — current durable roadmap/state.
- `docs/AI_DECISIONS.md` — durable decisions for future sessions.
- `docs/AI_HANDOFF.md` — this rolling resume point.
- `scripts/project-preflight.mjs` — read-only Git/project state summary.
- `package.json` — adds the `pnpm preflight` script only.

## Decisions

- AI-001 — local-first document processing invariant.
- AI-002 — preserve Web/PWA + Tauri + Capacitor architecture.
- AI-003 — repository-native AI continuity.
- AI-004 — shared metadata stays platform-neutral; client mappings stay client-side.
- AI-005 — CSS maintainability changes are incremental.

## Validation

Executed before bootstrap files were applied:

- `pnpm typecheck` — passed.
- `pnpm test` — passed.
- `pnpm build:web` — passed.

Bootstrap validation status:

- `node --check scripts/project-preflight.mjs` — passed.
- `pnpm preflight` — passed.
- `git diff --check` — passed before the final handoff rewrite; the procedure re-runs it immediately after writing the final handoff.

## Known issues / risks

- Local uncommitted state cannot be inferred from GitHub; trust the local preflight over this handoff.
- Current client dispatch duplicates tool knowledge in `App.tsx`.
- `apps/client/src/styles.css` remains large and should only be decomposed incrementally.
- Durable tool URLs are not implemented.
- Known bundle/import warnings remain non-blocking unless they create a reproducible failure.

## Exact next step

After this bootstrap is reviewed and integrated, begin one bounded Phase 1 task: evaluate and improve the homepage primary PDF-opening flow so it represents the 18-tool suite rather than implying that opening a PDF is only for page organization.

Do not touch the PDF engine for that task.

## Do not redo

- Do not rebuild the AI continuity architecture into a larger framework.
- Do not migrate CSS frameworks during the homepage task.
- Do not introduce routing during the same homepage task.
- Do not refactor `packages/pdf-engine` for frontend cleanliness.
- Do not replace `docs/DECISION.md`; reference it as the authoritative distribution ADR.