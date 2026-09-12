# Giumag PDF — AI Handoff

## Current task

Phase 1 bounded homepage discoverability task: add lightweight local search across the existing 18-tool catalog.

The search must remain a client-only convenience over existing tool metadata. Do not introduce categories, routing, registry schema changes, dispatch refactors or PDF-engine changes in this task.

## Current Git state

- Expected branch: `feat/home-tool-search`
- Verified base `main`: `87021ab6184011e2940f16632d19b68aa5b07a72`
- That base is the Squash and merge commit for PR #31 (`feat: clarify homepage PDF opening flow`).
- Expected HEAD before commit: same as the verified base.
- Expected changed paths before commit:
  - `apps/client/src/App.tsx`
  - `apps/client/src/styles.css`
  - `docs/AI_PROJECT_STATE.md`
  - `docs/AI_HANDOFF.md`
- No commit, push, PR, merge, deploy, tag or branch deletion is part of the implementation procedure.

Always re-run `pnpm preflight` and `git status` before continuing because this file can become stale.

## Completed in this task

- Verified PR #31 was Squash and merged into `main`.
- Synchronized local `main` to the verified merge commit.
- Started the focused `feat/home-tool-search` branch.
- Added a homepage search field for available tools.
- Search matches existing tool names and descriptions locally.
- Preserved the original tool order.
- Added accessible result feedback and a no-results state.
- Added only focused styles adjacent to the existing tools-section rules.
- Kept `UNIVERSAL_TOOLS`, routing, client dispatch and the PDF engine unchanged.
- Updated durable project state for this bounded task.
- Completed manual desktop/mobile, light/dark, search filtering, empty-state, and filtered-tool navigation verification successfully.

## Files materially changed

- `apps/client/src/App.tsx` — local search state, filtering and search UI.
- `apps/client/src/styles.css` — focused search/empty-state styles only.
- `docs/AI_PROJECT_STATE.md` — current Phase 1 task and verified baseline.
- `docs/AI_HANDOFF.md` — this rolling resume point.

## Validation

Executed after implementation:

- `pnpm typecheck` — passed.
- `pnpm test` — passed.
- `pnpm build:web` — passed.
- generated `apps/client/tsconfig.tsbuildinfo` metadata restored after build.
- final `pnpm preflight` and `git diff --check` - passed.
- manual tool-search verification on desktop/mobile and light/dark mode - passed.

## Product decision for this bounded task

Add search before categories.

With 18 available tools, a direct text search provides useful discovery for users who already know the task they want, while avoiding a new taxonomy that the current shared metadata does not support.

The filter uses only existing tool name and description data. Shared metadata remains platform-neutral and unchanged.

## Known issues / future work

- Client workspace dispatch still duplicates tool knowledge in `App.tsx`.
- Durable tool URLs are not implemented.
- The large global stylesheet remains an incremental maintainability task.
- Existing bundle/import warnings remain non-blocking unless they cause a reproducible user-visible failure.
- Categories or featured-tool ordering should require actual beta evidence after search is available.

## Exact next step

Manual tool-search verification has passed. Review this focused pull request and its CI. If review and CI are green, Squash and merge through GitHub. After merge, synchronize `main`; merged-branch cleanup remains a separate explicitly authorized operation.

Then evaluate the next bounded Phase 1 homepage improvement. Do not add categories unless beta evidence shows search alone is insufficient.

## Do not redo

- Do not add categories in the same task.
- Do not alter `packages/shared` for search.
- Do not introduce routing in this task.
- Do not refactor client tool dispatch in this task.
- Do not migrate CSS architecture in this task.
- Do not touch `packages/pdf-engine` for this task.