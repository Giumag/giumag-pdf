# Giumag PDF — AI Handoff

## Current task

Phase 3 bounded client-registry refactor: consolidate the Web workspace mapping that was duplicated inside `App.tsx`.

This is an internal behavior-preserving refactor. Shared metadata must remain platform-neutral and React-free.

## Current Git state

- Expected branch: `refactor/client-tool-registry`
- Verified base `main`: `c80aaf49ec19213490a6a636b07a3cd382e84c8b`
- That base is the Squash and merge commit for PR #34 (`feat: explain homepage privacy model`).
- Expected HEAD before commit: same as the verified base.
- Expected changed paths before commit:
  - `apps/client/src/App.tsx`
  - `apps/client/src/tool-workspace-registry.tsx`
  - `docs/AI_PROJECT_STATE.md`
  - `docs/AI_HANDOFF.md`
- No commit, push, PR, merge, deploy, tag or branch deletion is part of the implementation procedure.

Always re-run `pnpm preflight` and `git status` before continuing because this file can become stale.

## Completed in this task

- Verified PR #34 was Squash and merged into `main`.
- Synchronized local `main` to the verified merge commit.
- Closed Phase 2 for now: no remaining trust gap justifies more homepage polish before architectural work.
- Started the focused `refactor/client-tool-registry` branch.
- Added `apps/client/src/tool-workspace-registry.tsx`.
- Moved the 17 Web workspace component imports and render mapping out of `App.tsx`.
- Derived `WorkspaceToolId` from the keys of the client registry.
- Replaced the duplicated `ActiveWorkspace` string union.
- Replaced the 17 conditional workspace render branches with one `ToolWorkspace` render.
- Replaced the large card-click tool-ID switch with `isWorkspaceToolId`.
- Preserved `organize` as the explicit file-picker action.
- Kept `packages/shared`, routing, CSS, lazy loading and the PDF engine unchanged.
- Updated durable project state for Phase 3.
- Completed manual smoke testing of all 17 standalone workspace cards, workspace close/return behavior, `Organizza pagine`, real-PDF opening, filtered search dispatch and homepage visual stability successfully.

## Files materially changed

- `apps/client/src/App.tsx` — consumes the client registry instead of duplicating workspace dispatch.
- `apps/client/src/tool-workspace-registry.tsx` — client-only ID-to-workspace mapping and type guard.
- `docs/AI_PROJECT_STATE.md` — Phase 3 state and verified baseline.
- `docs/AI_HANDOFF.md` — this rolling resume point.

## Validation

Executed after implementation:

- static registry consistency checks — passed.
- `pnpm typecheck` — passed.
- `pnpm test` — passed.
- `pnpm build:web` — passed.
- generated `apps/client/tsconfig.tsbuildinfo` metadata restored after build.
- final `pnpm preflight` and `git diff --check` - passed.
- manual 18-path dispatch smoke test - passed.

## Architectural decision

This task follows AI-004: shared `UNIVERSAL_TOOLS` remains platform-neutral, while React component mappings live only in the Web client.

Do not move React components into `packages/shared` and do not introduce a generic plugin framework.

## Known issues / future work

- Shared `ToolDefinition.id` is still typed as `string`; stronger platform-neutral tool-ID typing can be evaluated separately.
- `organize` remains a distinct client action because it opens the existing PDF file flow rather than a standalone workspace.
- Durable tool URLs are not implemented.
- The global stylesheet remains a later incremental maintainability task.
- Existing bundle/import warnings remain non-blocking unless they cause a reproducible user-visible failure.

## Exact next step

Manual dispatch verification has passed. Review this focused pull request and its CI. If review and CI are green, Squash and merge through GitHub. After merge, synchronize `main`; merged-branch cleanup remains a separate explicitly authorized operation.

Then continue Phase 3 with a separate assessment of the remaining shared/client tool-ID typing duplication. Do not combine that follow-up with routing, lazy loading or CSS work.

## Do not redo

- Do not modify `packages/shared` in this task.
- Do not add routing or durable URLs.
- Do not add lazy loading in this task.
- Do not introduce a plugin framework.
- Do not change CSS in this task.
- Do not touch `packages/pdf-engine` in this task.