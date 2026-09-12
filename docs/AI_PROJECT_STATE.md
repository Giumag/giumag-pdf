# Giumag PDF — AI Project State

Last bootstrap audit: 2026-09-12

Current verified `main` baseline: `a2f549e1e29c8ecbd67fc64149281114b48efa59` (homepage trust and tools access merged through PR #33)

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

### Phase 2 — Trust and public-beta polish

Phase 0 continuity was integrated through PR #30. Phase 1 homepage IA/UX delivered the generic PDF-opening flow through PR #31 and lightweight tool search through PR #32. The first Phase 2 trust/footer and tools-access improvement was integrated through PR #33.

Current bounded task: explain the local-first privacy model directly on the homepage without turning the hero into a long policy document.

Scope:

- add a native expandable privacy explainer below the existing privacy row;
- keep it closed by default;
- explain local PDF processing using the authoritative security/privacy baseline;
- disclose that analytics are off by default and offline caching is for application assets, not documents;
- disclose that the hosting provider can still observe normal web request metadata when the app loads;
- link to the authoritative privacy/security document.

Out of scope:

- new privacy/legal routing;
- analytics or telemetry;
- consent banners;
- dependency changes;
- large homepage redesign;
- PDF-engine changes.

## Next planned step

After this privacy explainer is reviewed and integrated, evaluate whether Phase 2 has any remaining high-value trust/public-beta gaps before moving to Phase 3 registry consolidation.
## Known technical debt / future work

### Home / client dispatch

`apps/client/src/App.tsx` currently duplicates tool knowledge across:

- `ActiveWorkspace`;
- workspace component imports;
- a large tool-ID switch;
- shared `UNIVERSAL_TOOLS` metadata.

This is a valid later registry-consolidation target, not part of the bootstrap.

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