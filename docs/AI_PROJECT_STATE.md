# Giumag PDF — AI Project State

Last bootstrap audit: 2026-09-12

Current verified `main` baseline: `c80aaf49ec19213490a6a636b07a3cd382e84c8b` (homepage privacy explainer merged through PR #34)

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

## Current phase

### Phase 3 — Client registry consolidation

Phase 1 homepage IA/UX and Phase 2 trust/public-beta polish are complete for now. The privacy explainer was integrated through PR #34.

Current bounded task: consolidate Web-client tool workspace dispatch without changing shared platform-neutral metadata or user-visible behavior.

Scope:

- add a client-only workspace registry in `apps/client/src`;
- move the 17 workspace-component imports and render mapping out of `App.tsx`;
- derive the active-workspace ID type from that client registry;
- replace the duplicated card-click switch with a registry type guard;
- keep `organize` as the explicit file-picker action;
- preserve all existing tool behavior.

Out of scope:

- changes to `packages/shared`;
- routing or durable URLs;
- lazy loading or bundle work;
- generic plugin architecture;
- CSS changes;
- PDF-engine changes.

## Next planned step

After this first registry consolidation is reviewed and integrated, evaluate the remaining client/shared ID duplication separately. Do not combine shared typing, routing or lazy loading into this task.
## Known technical debt / future work

### Home / client dispatch

The first client-only workspace registry is now being extracted from `App.tsx`.

Remaining duplication after this bounded task is expected to be limited to the relationship between string IDs in shared `UNIVERSAL_TOOLS`, the client registry, and the special `organize` file-picker action. Evaluate stronger shared ID typing separately without coupling React components to `packages/shared`.

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