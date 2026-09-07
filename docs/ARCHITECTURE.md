# Giumag PDF — Technical Architecture

## 1. Design goals

1. Process documents on-device by default and by design.
2. Keep one product UI across web, desktop and mobile.
3. Keep the core tool behavior consistent across platforms.
4. Scale down gracefully when a capability is unavailable instead of silently uploading files.
5. Keep third-party licensing compatible with future commercial distribution.
6. Make large or untrusted PDFs unable to freeze the main UI.

## 2. Logical architecture

```text
┌──────────────────────────────────────────────────────────────┐
│                    React / TypeScript UI                     │
│ tool registry · workspace · previews · progress · settings   │
└──────────────────────────────┬───────────────────────────────┘
                               │ PdfEngine contract
                 ┌─────────────┴─────────────┐
                 │                           │
       ┌─────────▼──────────┐      ┌────────▼─────────┐
       │ Browser/WASM engine│      │ Native bridge     │
       │ PWA + mobile       │      │ Desktop additions │
       └─────────┬──────────┘      └────────┬─────────┘
                 │                           │
       PDF.js / pdf-lib /             native sidecars /
       audited WASM engines           Rust commands /
       Tesseract worker               installed tools
```

The UI never knows which low-level library performed an operation. It asks the `PdfEngine` for a declared capability.

## 3. Frontend

Recommended stack:

- React + TypeScript
- Vite
- CSS variables/design tokens; no runtime CDN dependency
- PWA manifest + service worker
- Web Workers for PDF/OCR/CPU-heavy operations
- PDF.js for preview/rendering
- IndexedDB/OPFS only for explicit temporary workspace needs; normal behavior should prefer in-memory `Blob`/`ArrayBuffer` handling

### UI principles

- Tool-first home page with search and categories.
- One consistent processing workspace rather than a different page implementation for every tool.
- Explicit status: `On-device`, file count, total size, current processing stage.
- Mobile layouts are first-class, not a responsive afterthought.
- No fake progress bars; engines emit measurable stages or indeterminate status.
- Destructive operations such as redaction clearly distinguish preview from permanent application.

## 4. PDF engines

### 4.1 Rendering: PDF.js

Use PDF.js for page preview and canvas rendering. Rendering is deliberately separate from structural modification.

### 4.2 High-level document edits: pdf-lib

Use for operations well covered by its API: page copy/reorder, drawing text/images, forms and basic document creation. It must not be used as the only engine for encrypted PDFs because encrypted-document modification is not supported by pdf-lib.

### 4.3 Structural/encryption engine

Build and pin an audited WebAssembly/native processor from a permissively licensed upstream project. Primary candidates for validation are **QPDF** and **pdfcpu**.

Rules:

- Do not depend on an unmaintained third-party WASM package without reproducible builds.
- The repository should contain build scripts that compile the selected upstream version into the distributable artifact.
- Hash the produced artifacts and include them in release provenance.
- Run corpus tests against malformed, encrypted, linearized and large PDFs before replacing the prototype engine.

### 4.4 OCR

Use Tesseract through a worker-backed browser/WASM integration for universal OCR. Language packs are downloaded as application assets or optional language modules, never fetched from an arbitrary CDN at processing time.

Desktop may later add a native OCR provider if profiling proves it materially better.

### 4.5 Office conversion

Office conversion is a **desktop-enhanced** capability for v1:

- Detect an installed LibreOffice instance and invoke it locally.
- Do not silently send Office documents to a server.
- Do not promise identical feature availability in the PWA/mobile app.

A browser/WASM LibreOffice path can be researched later, but it is not required for the first stable release.

### 4.6 Compression

Compression must be split into explicit modes:

- `Lossless optimize`: object/resource cleanup without degrading images.
- `Balanced`: image recompression/downsampling with user-visible target quality.
- `Maximum`: aggressive raster recompression, only when an audited permissive engine exists.

Do not ship Ghostscript in a proprietary/distribution build without an appropriate licensing decision.

## 5. Platform adapters

### Web/PWA

- File input via File API / picker.
- Save via File System Access API when available, standard download/share fallback elsewhere.
- All core operations run locally.
- Service worker caches application assets for offline reuse.

### Desktop / Tauri

- Native open/save dialogs.
- Large-file temporary workspace in app cache.
- Native sidecar execution for selected audited processors.
- Optional installed-application detection (e.g. LibreOffice).
- Signed auto-update channel.
- OS-native “Open with Giumag PDF” integration later.

### Mobile / Capacitor

- Native document picker and share sheet.
- Import from Files/Drive providers exposed by the OS.
- Camera-based scan flow later.
- Temporary files stored only in application cache and deleted after successful export/cancel.

## 6. Capability contract

Every tool declares:

```ts
interface ToolCapability {
  id: string;
  platforms: Array<'web' | 'windows' | 'macos' | 'linux' | 'ios' | 'android'>;
  minEngine: string;
  supportsEncryptedInput: boolean;
  supportsOffline: boolean;
  largeFileClass: 'normal' | 'heavy';
}
```

A tool is hidden or clearly marked unavailable when the runtime cannot provide its capability. It must never fall back to cloud upload without a separate, explicit future product decision.

## 7. Network policy

Production application code may access the network only for:

- initial static app delivery and updates;
- optional update metadata/native update packages;
- optional language/model asset downloads initiated by the user.

Document content is never sent by the normal processing path.

Recommended web CSP baseline:

```text
default-src 'self';
script-src 'self' 'wasm-unsafe-eval';
worker-src 'self' blob:;
img-src 'self' blob: data:;
style-src 'self' 'unsafe-inline';
font-src 'self';
connect-src 'self';
object-src 'none';
base-uri 'none';
frame-ancestors 'none';
```

Tighten this further as the selected WASM toolchain permits.

## 8. Error model

All engine errors are normalized to stable codes:

- `INVALID_PDF`
- `PASSWORD_REQUIRED`
- `WRONG_PASSWORD`
- `UNSUPPORTED_ENCRYPTION`
- `OUT_OF_MEMORY`
- `FILE_TOO_LARGE_FOR_RUNTIME`
- `CORRUPT_DOCUMENT`
- `ENGINE_NOT_AVAILABLE`
- `OPERATION_CANCELLED`
- `OUTPUT_WRITE_FAILED`

UI copy can be localized independently of engine code.
