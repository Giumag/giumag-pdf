# Giumag PDF — AI Handoff

## Completed task

The tool-ID typing boundary audit and its minimal type-safe consolidation are complete on PR #37.

Verified `main` baseline at task start: `3c79bc72271dc653991117fca73bdcbe6b88248f` (`docs: sync AI continuity after registry merge`, PR #36).

Current work branch: `docs/tool-id-typing-audit`.

PR #37 now includes both the audit documentation and the bounded implementation.

## What was implemented

### Shared package

`packages/shared/src/index.ts` now:

- preserves literal tool IDs in the metadata source while validating the metadata shape;
- derives and exports `ToolId` from the shared metadata;
- derives and exports `AvailableToolId` from entries whose status is `available`;
- constrains exported `ToolDefinition.id` to `ToolId`;
- avoids introducing a second hand-maintained list of tool IDs.

### Client registry

`apps/client/src/tool-workspace-registry.tsx` now:

- imports only the shared tool-ID types from `@giumag/shared`;
- defines `WorkspaceToolId = Exclude<AvailableToolId, 'organize'>`;
- validates `TOOL_WORKSPACE_RENDERERS` with `satisfies Record<WorkspaceToolId, WorkspaceRenderer>`;
- keeps the renderer components entirely in the Web client;
- narrows `isWorkspaceToolId` input from arbitrary `string` to shared `ToolId`.

### Runtime behavior

`App.tsx` was intentionally not changed.

- `organize` still opens the existing PDF file-picker/document flow;
- standalone tools still dispatch through `isWorkspaceToolId` and `ToolWorkspace`;
- no routing, CSS, lazy loading, dependencies, PDF-engine behavior, release configuration or versioning changed.

AI-004 remains preserved: shared metadata/types are platform-neutral and React-free, while React mappings stay client-specific.

## Validation performed so far

- verified `main` and PR #37 had not moved before implementation;
- verified the proposed type shape in an isolated strict TypeScript compile before committing;
- inspected the exact runtime diff after commit;
- GitHub Actions CI was triggered automatically for the implementation head;
- no local repository clone is available in this environment, so `pnpm preflight`, `pnpm typecheck`, `pnpm test`, `pnpm build:web`, `git diff --check` and browser smoke cannot be claimed from this session unless CI or a user-side run provides them.

## Relevant decisions

- **AI-004** — shared tool metadata and types remain platform-neutral; React/client mappings remain in the Web client.
- **AI-001** — local-first document processing remains a product invariant.
- **AI-003** — repository files, not chat history, carry development continuity.

No new durable architectural decision was introduced, so `docs/AI_DECISIONS.md` does not require a new entry.

## Next step

Finish validation and review of PR #37.

Required before merge:

- confirm CI is green;
- run or otherwise verify `pnpm preflight`;
- verify `pnpm typecheck`;
- verify `pnpm test`;
- verify `pnpm build:web`;
- verify `git diff --check`;
- focused smoke: `Organizza pagine` still opens the PDF file flow and at least one standalone tool still opens its workspace.

If validation is clean, Squash and merge PR #37, verify the resulting `main` SHA, then clean up the branch only after merge verification.

## Do not redo

- Do not rebuild the client workspace registry already merged in PR #35.
- Do not repeat the tool-ID audit unless relevant code changes materially.
- Do not move React components into `packages/shared`.
- Do not add a second hand-maintained tool-ID list.
- Do not tighten `ToolIcon` in PR #37 unless validation proves it necessary.
- Do not introduce a generic plugin framework.
- Do not combine this work with routing, lazy loading, CSS migration or PDF-engine changes.
