# Giumag PDF

Privacy-first PDF tools that run locally on your device.

Giumag PDF is an open-source PDF toolkit focused on simple workflows, local document processing and a consistent interface across its tools.

> **Project status:** pre-release / public beta preparation.
> The web application is the primary target currently being hardened for public distribution. Desktop and mobile shells are present in the repository but their public packaging is still being finalized.

## Why Giumag PDF?

Many PDF utilities require documents to be uploaded to a remote service.

Giumag PDF is designed around a different model: PDF processing happens on the user's device whenever possible, using browser APIs, Web Workers and local WebAssembly engines.

The goal is to provide useful PDF operations without turning private documents into server uploads.

## Available tools

Giumag PDF currently includes 18 available tools:

- Merge PDF
- Split PDF
- Organize pages
- Crop PDF
- Compress PDF
- Images to PDF
- PDF to images
- Watermark
- Page numbers
- PDF forms
- Protect PDF
- Unlock PDF
- OCR PDF
- Redact PDF
- Remove metadata
- Compare PDF
- Visual signature
- Repair PDF

### Important note about signatures

The **Visual signature** tool inserts a drawn or imported signature image into a PDF.

It is not a cryptographic, certificate-based or PAdES digital signature.

## Privacy model

Giumag PDF is built to process documents locally.

The core application does not require users to upload their PDFs to a document-processing backend for the supported local operations.

Some browser functionality may still require normal network access to load or update the application itself.

## Technology

The project is a pnpm monorepo built primarily with:

- React
- TypeScript
- Vite
- PDF.js / `pdfjs-dist`
- `pdf-lib`
- `pdfstudio` / qpdf WebAssembly
- Tesseract.js
- Vitest
- Vite PWA
- Tauri
- Capacitor

Heavy PDF operations are moved to Web Workers where appropriate.

## Repository structure

```text
apps/
  client/        Web / PWA application
  desktop/       Tauri desktop shell
  mobile/        Capacitor mobile shell

packages/
  pdf-engine/    Shared PDF processing engine
  shared/        Shared definitions and registry

scripts/         Build/runtime asset synchronization
legacy/          Previous prototype kept for reference
docs/            Project documentation
```

## Requirements

Development currently expects:

- Node.js
- pnpm

Desktop development additionally requires the Tauri/Rust toolchain.

Native mobile development requires the relevant Android or iOS development environment.

## Development

Install dependencies:

```bash
pnpm install
```

Start the web client:

```bash
pnpm dev
```

Run TypeScript checks:

```bash
pnpm typecheck
```

Run the test suite:

```bash
pnpm test
```

Build the production web application:

```bash
pnpm build:web
```

## Local runtime assets

Giumag PDF intentionally keeps important PDF/OCR runtime assets local instead of relying on public CDNs.

The web build synchronizes:

- PDF.js runtime assets
- Tesseract runtime assets

using the scripts contained in `scripts/`.

## Release status

The project is currently being prepared for its first public beta.

Current release-hardening work includes:

- Web/PWA production validation
- Desktop packaging
- Android project generation and packaging
- installation and first-run testing

Do not treat the current development branch/version as a stable production release yet.

## Contributing

Issues and pull requests are welcome.

Before submitting a change:

```bash
pnpm typecheck
pnpm test
pnpm build:web
```

Changes should preserve the project's local/privacy-first processing model unless there is a clear reason not to.

## Legacy prototype

The `legacy/` directory contains an earlier Python prototype.

It is retained as historical and implementation reference material and is not the current application architecture.

## License

Giumag PDF is licensed under the Apache License 2.0.

Third-party components remain subject to their respective licenses.

See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for dependency license and attribution information.
