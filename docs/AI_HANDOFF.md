# Giumag PDF — AI Handoff

## Completed task

The read-only audit of the tool-ID typing boundary is complete.

Verified `main` baseline at audit start: `3c79bc72271dc653991117fca73bdcbe6b88248f` (`docs: sync AI continuity after registry merge`, PR #36).

Latest application-code baseline remains `c0f92dc9e0ea4d7ef7269898e6bd43aade5ade16` from PR #35 (`refactor: consolidate client tool workspace registry`).

The audit documentation branch is `docs/tool-id-typing-audit`.

No application code was changed by this task.

## What was verified

- `packages/shared/src/index.ts` contains 18 tool definitions and all are currently `available`.
- `ToolDefinition.id` is typed as `string` and `UNIVERSAL_TOOLS` is explicitly annotated `ToolDefinition[]`, so shared tool IDs are widened instead of preserved as a literal union.
- `apps/client/src/tool-workspace-registry.tsx` contains exactly 17 standalone workspace renderer keys and derives `WorkspaceToolId` from those keys.
- `organize` is the only shared available tool ID intentionally outside the standalone workspace registry.
- `App.tsx` handles `organize` first by opening the existing PDF file input, then uses `isWorkspaceToolId(tool.id)` for standalone workspace dispatch.
- `isWorkspaceToolId` currently accepts arbitrary `string` because the shared metadata does not expose a precise tool-ID contract.
- Repository search found no other runtime consumer of the exported `ToolDefinition` type and only `App.tsx` directly consumes `UNIVERSAL_TOOLS`.
- `ToolIcon` accepts `id: string`, but this is rendering-only and does not need to be included in the next bounded typing change.
- No dedicated registry/type-boundary test currently exists; the next implementation should rely primarily on strict TypeScript checks plus focused dispatch smoke testing.

## Smallest type-safe consolidation defined by the audit

Preserve AI-004 and keep the change limited to shared metadata typing plus the client registry.

### Shared package

In `packages/shared/src/index.ts`:

1. preserve literal metadata IDs while validating the metadata shape instead of widening the array to `ToolDefinition[]`;
2. export `ToolId` from `typeof UNIVERSAL_TOOLS[number]['id']`;
3. export `AvailableToolId` from the subset whose `status` is `available`;
4. keep the exported `ToolDefinition` contract constrained to `ToolId` without introducing a second manually maintained list of IDs.

A suitable implementation shape is a generic internal metadata shape such as `ToolDefinitionShape<Id extends string>`, `UNIVERSAL_TOOLS` declared with `as const satisfies readonly ToolDefinitionShape<string>[]`, then derived `ToolId` / `AvailableToolId` and an exported `ToolDefinition = ToolDefinitionShape<ToolId>` alias.

### Client registry

In `apps/client/src/tool-workspace-registry.tsx`:

1. import the shared ID types only; do not import or move React components into `packages/shared`;
2. define `WorkspaceToolId = Exclude<AvailableToolId, 'organize'>`;
3. give the renderer function a named type and validate `TOOL_WORKSPACE_RENDERERS` with `satisfies Record<WorkspaceToolId, WorkspaceRenderer>`;
4. keep `isWorkspaceToolId` as the runtime ownership check, but accept shared `ToolId` rather than arbitrary `string`.

### App dispatch

Keep the existing `App.tsx` behavior:

- `organize` remains the explicit file-picker/document-flow action;
- all other available IDs continue through `isWorkspaceToolId` before `setActiveWorkspace`;
- no routing, loading, CSS or PDF behavior changes are part of this work.

This gives compile-time coverage between the platform-neutral available tool IDs and the client workspace registry while preserving the intentional `organize` exception.

## Relevant decisions

- **AI-004** — shared tool metadata and types remain platform-neutral; React/client mappings remain in the Web client.
- **AI-001** — local-first document processing remains a product invariant.
- **AI-003** — repository files, not chat history, carry development continuity.

No new durable architectural decision is required by this audit.

## Validation actually performed for this audit

- verified repository metadata and remote `main` HEAD;
- verified PR #35 and PR #36 merge history;
- confirmed there were no open pull requests at audit start;
- read `AGENTS.md`, `CONTRIBUTING.md`, `docs/BETA_OPERATIONS.md`, `docs/AI_PROJECT_STATE.md`, `docs/AI_DECISIONS.md` and `docs/AI_HANDOFF.md`;
- inspected `packages/shared/src/index.ts`, `apps/client/src/tool-workspace-registry.tsx`, the relevant `App.tsx` dispatch, `ToolIcon` typing and TypeScript configuration;
- searched the repository for `ToolDefinition`, `UNIVERSAL_TOOLS`, `isWorkspaceToolId` and `organize` usage to verify scope;
- found no contradiction between the handoff and current application code/history, apart from the handoff's previous merged baseline referring to PR #35 while current `main` is the later docs-only PR #36 commit.

No `pnpm` checks were run because this environment does not have a repository clone/working tree and the task did not modify application code.

No post-merge CI status contexts are reported for the current `main` commit; do not infer CI from that absence.

## Next step

Implement the audited type-only consolidation in `packages/shared/src/index.ts` and `apps/client/src/tool-workspace-registry.tsx` on a focused branch.

Required validation after implementation:

- `pnpm typecheck`;
- `pnpm test`;
- `pnpm build:web`;
- `pnpm preflight`;
- `git diff --check`;
- focused smoke test that `Organizza pagine` still opens the file flow and at least one standalone tool still opens its workspace.

Update `docs/AI_PROJECT_STATE.md` and `docs/AI_HANDOFF.md` in the same implementation branch/PR.

## Do not redo

- Do not rebuild the client workspace registry already merged in PR #35.
- Do not repeat this audit unless the relevant files or `main` have changed materially.
- Do not move React components into `packages/shared`.
- Do not add a second hand-maintained tool-ID list.
- Do not include `ToolIcon` tightening unless the implementation proves it is required for compilation.
- Do not introduce a generic plugin framework.
- Do not combine the next typing implementation with routing, lazy loading, CSS migration or PDF-engine changes.
