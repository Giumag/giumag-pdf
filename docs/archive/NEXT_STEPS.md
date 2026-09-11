# Exact next steps

This file is the operational sequence to turn the baseline into a distributable product.

## 1. Create the repository

Create a **private** GitHub repository named `giumag-pdf` and push this baseline as the initial architecture commit.

Recommended first tags/branches:

- `main` — protected
- feature branches via pull requests
- no public stable release yet

## 2. Bootstrap JavaScript dependencies

On a development machine with Node 22+:

```bash
corepack enable
corepack prepare pnpm@10 --activate
pnpm install
pnpm build:web
```

Commit the generated `pnpm-lock.yaml`. From that point CI should always use the frozen lockfile.

## 3. Run the web shell

```bash
pnpm dev
```

The current client is intentionally only a production shell plus initial engine contract. The functional Python prototype remains in `legacy/python-prototype` until each tool is migrated and verified.

## 4. Select the structural PDF engine

Do a short engineering spike comparing **QPDF** and **pdfcpu** on the same corpus:

- malformed documents
- encrypted documents
- merge/split/reorder
- optimization
- watermark/stamp
- memory use in WASM
- iOS Safari / Android WebView
- desktop native build size/performance

Do not adopt an unofficial precompiled WASM package as a permanent dependency. Build the selected upstream source reproducibly.

## 5. Migrate the first production tool group

Implement these first because they create the shared workspace model:

1. merge
2. split
3. reorder/extract/remove
4. rotate
5. PDF preview thumbnails

Build these with worker cancellation and golden-file tests before moving on.

## 6. Add web production deployment

Create a Cloudflare Pages project connected to the GitHub repository.

- Production branch: `main`
- Build command: `pnpm build:web`
- Output directory: `apps/client/dist`
- No Pages Functions / Workers PDF endpoint
- Add a custom domain before public beta

## 7. Desktop bootstrap

Install Rust and Tauri prerequisites, then:

```bash
pnpm --dir apps/desktop dev
```

After the universal core is stable, add native open/save dialogs and the optional local LibreOffice adapter.

## 8. Mobile bootstrap

From the repository root after the web client builds:

```bash
pnpm build:web
pnpm --dir apps/mobile exec cap add android
pnpm --dir apps/mobile exec cap add ios
pnpm --dir apps/mobile sync
```

The iOS project requires macOS/Xcode. Test native document import/export before adding camera scanning.

## 9. Developer accounts

Before public mobile/macOS distribution:

- Apple Developer Program: currently USD 99/year (regional pricing may vary).
- Google Play Console: currently USD 25 one-time registration.

Prefer organization accounts once the legal publisher identity is ready. Do not lock final store/bundle identity to a personal brand configuration if the intended publisher will become an organization shortly afterwards.

## 10. Public beta requirements

Do not publish a stable release until the checklist in `RELEASE_CHECKLIST.md` is complete. The minimum public beta should include:

- 10+ reliable local tools
- Italian and English UI
- privacy page
- third-party notices
- signed desktop beta where possible
- TestFlight + Play internal/closed testing
- real iPhone/Android device testing
- CSP/no-upload verification
- permanent-redaction tests if redaction is included
