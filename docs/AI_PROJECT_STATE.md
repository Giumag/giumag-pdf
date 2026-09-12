# Giumag PDF — AI Project State

Last bootstrap audit: 2026-09-12

Current verified `main` baseline: `3c79bc72271dc653991117fca73bdcbe6b88248f` (AI continuity synchronization after the client registry merge; latest application-code baseline remains `c0f92dc9e0ea4d7ef7269898e6bd43aade5ade16` from PR #35)

This file records current durable development state. It is not a chronological project log. Re-verify repository state at the start of every session.

## Current objective

Evolve the public Web/PWA beta from a technically solid 18-tool toolkit into a product that feels deliberate, coherent, polished, accessible and maintainable while preserving the privacy-first/local-first model and protecting document integrity.

Current beta priorities remain those defined by `docs/BETA_OPERATIONS.md`: privacy/security, output correctness, regressions, crashes/compatibility, accessibility, usability, then polish and new features.

## Current product state

- Public Web/PWA beta is live at `https://giumag-pdf.pages.dev`.
- Current beta line: `0.21.0-beta.x`.
- Root package version at the bootstrap audit: `0.21.0-beta.1`.
- 18 primary tools are exposed as available through shared metadata in `packages/shared/src/index.ts`.
- Web client: React + TypeScript + Vite + PWA.
- Desktop shell: Tauri.
- Mobile shell: Capacitor.
- PDF processing is designed to remain local/on-device.
- Heavy operations use workers where appropriate.
- PDF.js and Tesseract runtime assets are intentionally synchronized locally.
- The public repository has issue forms, beta triage rules, security guidance and a protected `main` workflow.

Authoritative references:

- `README.md`
- `CONTRIBUTING.md`
- `SECURITY.md`
- `docs/BETA_OPERATIONS.md`
- `docs/ARCHITECTURE.md`
- `docs/FEATURE_MATRIX.md`
- `docs/DECISION.md`
- `docs/ROADMAP.md`

## Completed foundations relevant to current work

- Shared Web/Desktop/Mobile architecture established.
- Public Web/PWA beta published.
- 18-tool Web/PWA surface available.
- PDF-engine regression tests exist for multiple high-risk capabilities.
- Privacy/security and beta operations documentation published.
- Contribution and pull-request workflow documented.
- Public beta issue triage structure established.
- Homepage IA/UX improvements integrated through PRs #31 and #32.
- Public-beta trust/privacy polish integrated through PRs #33 and #34.
- First client-only workspace registry consolidation integrated through PR #35.
- Read-only audit of the shared/client tool-ID typing boundary completed after PR #35.

## Current phase

### Phase 3 — Client registry consolidation

Phase 1 homepage IA/UX and Phase 2 trust/public-beta polish are complete for now.

The first Phase 3 implementation was integrated through PR #35:

- `apps/client/src/tool-workspace-registry.tsx` owns the 17 standalone Web workspace mappings;
- `WorkspaceToolId` is currently derived from the client registry keys;
- `App.tsx` no longer duplicates the manual active-workspace union, the 17 render branches or the large tool-card dispatch switch;
- `organize` remains the explicit file-picker action;
- shared `UNIVERSAL_TOOLS` metadata remains platform-neutral and React-free.

A subsequent read-only typing audit verified the remaining boundary:

- `packages/shared/src/index.ts` declares 18 available tool IDs, but the explicit `ToolDefinition[]` annotation widens `ToolDefinition.id` and `UNIVERSAL_TOOLS[number].id` to `string`;
- the client registry contains exactly the 17 standalone workspace IDs and therefore currently owns the only precise tool-ID union;
- `organize` is the only intentional shared available tool ID outside the standalone workspace registry and enters the existing PDF file-picker/document flow;
- `App.tsx` dispatches `organize` first, then narrows all other IDs through `isWorkspaceToolId`;
- repository search found no other runtime consumers of the exported `ToolDefinition` type and only the Web client consumes `UNIVERSAL_TOOLS` directly;
- `ToolIcon` still accepts `id: string`, but that is a rendering-only loose boundary and is not required to solve the dispatch contract;
- there is no dedicated registry/type-boundary test today, so strict TypeScript validation is the primary enforcement mechanism for the next type-only change.

The smallest type-safe consolidation to implement is:

1. preserve literal metadata IDs in `packages/shared` while validating the metadata shape, instead of widening `UNIVERSAL_TOOLS` to `ToolDefinition[]`;
2. export a platform-neutral `ToolId` derived from `UNIVERSAL_TOOLS`, plus an `AvailableToolId` derived from entries whose `status` is `available`;
3. keep the exported `ToolDefinition` contract constrained to `ToolId` without introducing a second manually maintained ID list;
4. in the client registry, derive `WorkspaceToolId` as `Exclude<AvailableToolId, 'organize'>` and validate the renderer object with `satisfies Record<WorkspaceToolId, WorkspaceRenderer>` so missing or unexpected workspace keys fail type checking;
5. keep `organize` client-specific and explicit, keep `isWorkspaceToolId` as the runtime boundary, and narrow its input from arbitrary `string` to shared `ToolId`;
6. leave routing, lazy loading, CSS, PDF-engine behavior and React/shared package boundaries unchanged.

This preserves AI-004: shared code owns only platform-neutral metadata/types, while React render mappings remain entirely in `apps/client`.

## Next planned step

Implement the audited type-only tool-ID consolidation in `packages/shared/src/index.ts` and `apps/client/src/tool-workspace-registry.tsx`, with no behavioral change to the `organize` file-picker path. Validate with the canonical application checks and a focused dispatch smoke test.

## Known technical debt / future work

### Home / client dispatch

The client-only registry extraction is complete. The remaining Phase 3 work is the audited type contract linking shared available tool IDs to the client registry while preserving `organize` as the explicit non-workspace action.

Do not expand that implementation into icon typing, routing, lazy loading or a generic plugin system unless a concrete compile-time requirement appears.

### Durable tool URLs

The client currently selects workspaces through React state and has no routing dependency. Durable tool URLs should be evaluated later with PWA, refresh, Cloudflare Pages and offline behavior treated as constraints.

### CSS maintainability

`apps/client/src/styles.css` was approximately 288 KB at the bootstrap audit. Decompose incrementally by logical region; do not combine a mass CSS migration with a major redesign.

### Performance

Existing build notes mention large chunks and PDF-engine import warnings that are non-blocking unless they cause reproducible user-visible failures. Measure before introducing code splitting or lazy loading.

## Protected choices

- Local-first/privacy-first processing is non-negotiable unless explicitly superseded by a durable project decision.
- Preserve the accepted Web + Tauri + Capacitor distribution architecture in `docs/DECISION.md`.
- Preserve shared platform-neutral tool metadata in `packages/shared`; client-specific components and routing/loading mappings belong in the client layer.
- Prefer incremental CSS evolution over a styling-framework rewrite.
- Do not add new PDF tools merely to increase tool count during beta stabilization.

## Unresolved product questions

- Does beta usage show that the generic PDF-opening flow needs more than the current direct page-view/organization workspace?
- Which tools, if any, should be featured above the full catalog?
- Does beta feedback show any need for categories or featured-tool ordering beyond the current search?
- When durable tool URLs are introduced, is a small native solution sufficient or is a router dependency justified?
- What are the safest first boundaries for incremental `styles.css` extraction?

Resolve these from current code, rendered behavior and beta evidence rather than assumptions.
