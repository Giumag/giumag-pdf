# Giumag PDF — Production Roadmap

The roadmap is organized by quality gates, not by arbitrary dates.

## Phase 0 — Foundation

- Finalize product name: Giumag PDF.
- Create private GitHub repository.
- Add `main`, protected pull-request workflow and issue templates.
- Establish React/TypeScript shared client, PWA, Tauri desktop and Capacitor mobile wrappers.
- Add formatter, lint, unit test, dependency audit and build CI.
- Define visual design tokens and responsive layout.
- Preserve Python prototype only under `legacy/`.

**Exit gate:** all three shells open the same application UI; web build works offline after first load; no document-upload endpoint exists.

## Phase 1 — Universal PDF core

Implement and corpus-test:

1. merge
2. split
3. page extract/remove/reorder
4. rotate/crop
5. images↔PDF
6. watermark/page numbers
7. forms + flatten
8. metadata removal
9. encrypt/decrypt
10. lossless optimize + balanced compression

Add PDF.js preview and a worker/job system with cancellation.

**Exit gate:** same golden test cases produce acceptable outputs in Chrome, Safari/iOS, Android WebView and desktop wrappers.

## Phase 2 — Trust-critical tools

- OCR with language assets.
- Permanent redaction.
- PDF comparison.
- Visual signature.
- Large-file limits and recovery UX.

**Exit gate:** security review passes, especially redaction and encrypted files.

## Phase 3 — Platform integration

### Desktop
- native file dialogs
- drag/drop from OS
- local LibreOffice detection for Office→PDF
- signed installers
- auto-update channel
- file associations later

### Mobile
- Files/document provider import/export
- share sheet
- photo import
- camera scan flow

**Exit gate:** beta builds distributed through GitHub Releases/TestFlight/Google Play testing tracks.

## Phase 4 — Public beta

- Production web host + custom domain.
- Privacy policy and legal pages.
- Store listing assets.
- Beta crash/issue reporting that does not attach document content.
- Accessibility pass.
- Italian + English UI.

## Phase 5 — Stable 1.0

- Signed Windows/macOS releases.
- App Store and Google Play publication.
- Stable PWA.
- Release notes and changelog.
- Third-party notices + SBOM.
- Backup/recovery/update tests.

## Post-1.0 candidates

- cryptographic signatures/certificate verification
- PDF/A only after conformance validation
- high-fidelity PDF↔Office research
- batch desktop workflows
- optional local AI
- scanner/camera improvements
