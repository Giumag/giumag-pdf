# Giumag PDF — AI Decisions

This file records durable architectural and product decisions that future sessions should not casually reinvent. It complements existing authoritative project documentation; it does not replace it.

## AI-001 — Local-first document processing is a product invariant

- **Date:** 2026-09-12
- **Status:** Accepted
- **Decision:** Supported PDF operations must process user documents locally/on-device. Do not introduce document uploads, remote PDF processing, analytics, telemetry, remote OCR, remote thumbnails or external document-processing APIs without an explicit superseding decision.
- **Rationale:** Privacy is a defining product property and is already embedded in the architecture, security policy, beta operations and public positioning.
- **Alternatives rejected:** Cloud processing as a convenience fallback; silent remote fallback when local capabilities are unavailable.
- **Consequences:** Frontend and engine changes must be reviewed for network/data-flow regressions. Missing local capability should degrade honestly rather than upload documents.

References: `SECURITY.md`, `docs/SECURITY_PRIVACY.md`, `docs/BETA_OPERATIONS.md`, `docs/ARCHITECTURE.md`.

## AI-002 — Preserve the shared Web/PWA + Tauri + Capacitor architecture

- **Date:** 2026-09-12
- **Status:** Accepted
- **Decision:** Continue the one-product architecture with a shared web frontend/PDF-engine contract delivered through Web/PWA, Tauri desktop and Capacitor mobile targets.
- **Rationale:** This decision is already accepted in the repository and balances zero-install access, local native capabilities and shared product behavior.
- **Alternatives rejected:** Website-only product; native-only product; Electron as the desktop wrapper.
- **Consequences:** Product/frontend changes should preserve cross-platform separation and avoid web-only architecture that blocks the existing wrappers.

Authoritative decision: `docs/DECISION.md`.

## AI-003 — Repository files, not chat memory, carry AI continuity

- **Date:** 2026-09-12
- **Status:** Accepted
- **Decision:** Maintain `AGENTS.md`, `docs/AI_PROJECT_STATE.md`, `docs/AI_DECISIONS.md` and `docs/AI_HANDOFF.md` as a small repository-native continuity layer.
- **Rationale:** Development intentionally spans independent AI conversations. Git and current files are auditable and less error-prone than conversational memory.
- **Alternatives rejected:** Reconstructing state from prior chats; one ever-growing project log.
- **Consequences:** `AI_PROJECT_STATE.md` contains current state only; this file records durable decisions; `AI_HANDOFF.md` is rewritten to the exact resume point. Git remains the history.

## AI-004 — Keep tool metadata platform-neutral and client mappings client-specific

- **Date:** 2026-09-12
- **Status:** Accepted
- **Decision:** Preserve shared platform-neutral tool metadata in `packages/shared`. Consolidate client-specific component/routing/loading mappings within the Web client rather than moving React components into the shared package.
- **Rationale:** `UNIVERSAL_TOOLS` is already shared, while `App.tsx` duplicates client dispatch knowledge. A small client registry can reduce duplication without coupling shared metadata to React.
- **Alternatives rejected:** One enormous cross-platform registry containing React components; a generic plugin framework introduced before it is needed.
- **Consequences:** Future registry consolidation should be a bounded client refactor and must preserve the shared package's platform-neutral role.

## AI-005 — CSS maintainability work must be incremental

- **Date:** 2026-09-12
- **Status:** Accepted
- **Decision:** Decompose the large global stylesheet incrementally by logical region while preserving cascade, specificity, dark mode and responsive behavior.
- **Rationale:** The stylesheet is large enough to be technical debt, but a one-shot framework migration would combine high visual risk with architectural churn.
- **Alternatives rejected:** Immediate Tailwind, CSS Modules, CSS-in-JS or other repository-wide styling rewrites without a separate explicit decision.
- **Consequences:** Do not combine a major redesign and a major CSS architecture migration in one task.