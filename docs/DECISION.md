# Architecture Decision Record — Giumag PDF distribution strategy

Status: **Accepted for v1 architecture**  
Date: 2026-09-07

## Decision

Giumag PDF will be one local-first product distributed through three targets built from one shared front end and one shared PDF-engine contract:

| Target | Delivery | Primary wrapper | Purpose |
|---|---|---|---|
| Web | HTTPS URL + installable PWA | Browser | Zero-install access, mobile/desktop fallback |
| Desktop | Windows/macOS/Linux packages | Tauri 2 | Full local capabilities, large files, desktop integrations |
| Mobile | App Store / Google Play | Capacitor | Native file picker/share sheet, camera/scanning, reliable store delivery |

The previous FastAPI/Python implementation is retained only as a proof of concept and behavior reference.

## Why not “website only”

A browser-only implementation is excellent for common PDF tasks, but it has practical limitations for very large documents, deep filesystem integration, external local tools and some advanced conversions. A browser-only product would force feature compromises or eventually reintroduce cloud processing.

## Why not “native app only”

A native-only strategy loses the most useful distribution property of an iLovePDF-like product: a user can open a link and immediately perform a task on any device. It also increases install friction and weakens discoverability.

## Why not Electron

Electron bundles a browser runtime with each application. Giumag PDF does not need that trade-off. Tauri uses the operating system WebView and is a better fit for a small desktop utility whose UI is already web-based.

## Why Tauri on desktop

- Shares the web UI.
- Adds a native Rust bridge when a feature needs filesystem/process/native APIs.
- Produces native installers and supports normal desktop update/distribution workflows.
- Avoids shipping a full browser runtime with the application.

## Why Capacitor on mobile

- Purpose-built native runtime for web-first iOS/Android applications.
- Keeps the same client application and browser/WASM processing engine.
- Gives direct access to native file, sharing, camera and platform APIs through plugins when needed.
- Reduces dependence on desktop-oriented plugin assumptions for mobile delivery.

## Privacy invariant

The web host serves only static application assets. Input documents are read through browser/native file APIs and processed in memory, workers, an origin-private temporary store, or application-private storage. Production must not contain an endpoint that accepts document bytes.

## Hosting decision

- **GitHub**: source code, issues, CI, releases.
- **Cloudflare Pages (recommended)**: production static web/PWA deployment connected to GitHub.
- **GitHub Pages**: documentation/demo only, not the long-term product host.
- **Custom domain**: required before public stable launch.

## Naming

Public product: **Giumag PDF**.

Suggested identifiers (finalize before first store submission):

- Apple bundle ID: `com.giumag.pdf`
- Android application ID: `com.giumag.pdf`
- Tauri identifier: `com.giumag.pdf`
- Executable/product display name: `Giumag PDF`
