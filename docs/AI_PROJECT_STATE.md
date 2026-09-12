# Giumag PDF — AI Project State

Last bootstrap audit: 2026-09-12

Current verified `main` baseline: `c0f92dc9e0ea4d7ef7269898e6bd43aade5ade16` (client tool workspace registry merged through PR #35)

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

## Current phase

### Phase 3 — Client registry consolidation

Phase 1 homepage IA/UX and Phase 2 trust/public-beta polish are complete for now.

The first Phase 3 task was integrated through PR #35:

- `apps/client/src/tool-workspace-registry.tsx` now owns the 17 standalone Web workspace mappings;
- `WorkspaceToolId` is derived from the client registry keys;
- `App.tsx` no longer duplicates the manual active-workspace union, the 17 render branches or the large tool-card dispatch switch;
- `organize` remains the explicit file-picker action;
- shared `UNIVERSAL_TOOLS` metadata remains platform-neutral and React-free.

Phase 3 remains active. The remaining registry-related technical question is the typing boundary between shared `ToolDefinition.id`, the client registry keys and the special `organize` action.

Do not combine that assessment with routing, lazy loading, CSS architecture changes or PDF-engine work.

## Next planned step

Perform a read-only audit of the current tool-ID typing boundary across `packages/shared/src/index.ts`, `apps/client/src/tool-workspace-registry.tsx` and the `organize` dispatch path, then define the smallest type-safe consolidation that preserves AI-004.

## Known technical debt / future work

### Home / client dispatch

The first client-only registry consolidation is complete.

Remaining duplication is limited to the relationship between string IDs in shared `UNIVERSAL_TOOLS`, the client registry key type, and the special `organize` file-picker action. Evaluate stronger shared ID typing separately without coupling React components to `packages/shared`.

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
