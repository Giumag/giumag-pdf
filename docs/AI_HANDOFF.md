# Giumag PDF — AI Handoff

## Current task

Phase 2 bounded trust/public-beta task: replace the minimal homepage footer with a compact product-status and project-support footer.

Keep this focused. Do not add analytics, telemetry, routing, new dependencies, a large navigation system or PDF-engine changes.

## Current Git state

- Expected branch: `feat/home-trust-footer`
- Verified base `main`: `6463fcda663c89e0eff4cb090560b36e8d1fac6e`
- That base is the Squash and merge commit for PR #32 (`feat: add homepage tool search`).
- Expected HEAD before commit: same as the verified base.
- Expected changed paths before commit:
  - `apps/client/src/App.tsx`
  - `apps/client/src/styles.css`
  - `docs/AI_PROJECT_STATE.md`
  - `docs/AI_HANDOFF.md`
- No commit, push, PR, merge, deploy, tag or branch deletion is part of the implementation procedure.

Always re-run `pnpm preflight` and `git status` before continuing because this file can become stale.

## Completed in this task

- Verified PR #32 was Squash and merged into `main`.
- Synchronized local `main` to the verified merge commit.
- Started the focused `feat/home-trust-footer` branch.
- Closed Phase 1 for now instead of adding unsupported categories.
- Moved durable project state to Phase 2 trust/public-beta polish.
- Replaced the two-label homepage footer with a compact trust footer.
- Added explicit `Beta pubblica` and local-processing context.
- Added links to the public source repository, issue reporting, and privacy/security baseline.
- Added only focused footer styles with keyboard focus treatment and wrapping.
- Kept document processing, dependencies, routing and shared tool metadata unchanged.
- Added a secondary `Vai agli strumenti` CTA below the PDF dropzone with smooth scrolling and reduced-motion support.
- Completed manual verification of the trust footer, external links, responsive wrapping, keyboard focus, tools-jump CTA, accent glow and scroll behavior successfully.

## Files materially changed

- `apps/client/src/App.tsx` — homepage footer content and external project links.
- `apps/client/src/styles.css` — focused footer layout/link styles only.
- `docs/AI_PROJECT_STATE.md` — verified baseline and transition to Phase 2.
- `docs/AI_HANDOFF.md` — this rolling resume point.

## Validation

Executed after implementation:

- `pnpm typecheck` — passed.
- `pnpm test` — passed.
- `pnpm build:web` — passed.
- generated `apps/client/tsconfig.tsbuildinfo` metadata restored after build.
- final `pnpm preflight` and `git diff --check` - passed.
- manual footer + tools-jump verification on desktop/mobile and light/dark mode - passed.

## Product decision for this bounded task

Do not add homepage categories merely because the catalog has grown to 18 tools. The existing direct catalog plus local search is sufficient until beta evidence says otherwise.

Move to trust/public-beta polish instead.

The footer remains compact and uses existing authoritative public resources rather than adding new in-app legal/navigation architecture.

## Known issues / future work

- Client workspace dispatch still duplicates tool knowledge in `App.tsx`.
- Durable tool URLs are not implemented.
- The global stylesheet remains a large incremental maintainability task.
- Existing bundle/import warnings remain non-blocking unless they cause a reproducible user-visible failure.
- A dedicated in-app privacy page remains a future decision; the current footer links to the repository privacy/security baseline.

## Exact next step

Manual verification has passed. Review this focused pull request and its CI. If review and CI are green, Squash and merge through GitHub. After merge, synchronize `main`; merged-branch cleanup remains a separate explicitly authorized operation.

Then continue Phase 2 with another small evidence-driven public-beta/trust improvement rather than a decorative redesign.

## Do not redo

- Do not add homepage categories without beta evidence.
- Do not turn the footer into a large sitemap in this task.
- Do not add analytics or telemetry.
- Do not add routing in this task.
- Do not add dependencies in this task.
- Do not migrate CSS architecture in this task.
- Do not touch `packages/pdf-engine` for this task.