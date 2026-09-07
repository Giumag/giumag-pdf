# Security and Privacy Baseline

## Product promise

Giumag PDF is local-first. The default processing architecture does not upload user documents to Giumag or a third-party processor.

## Threat model

PDFs are untrusted input. They may be malformed, intentionally adversarial, extremely large, deeply nested or designed to consume memory/CPU.

### Required controls

- Parse/process outside the UI thread.
- Hard memory/page/pixel limits appropriate to each runtime.
- Cancellation support for long jobs.
- Timeouts for native child processes.
- Application-private temporary directories with unpredictable names.
- Remove temporary artifacts after completion and on next-start recovery.
- Sanitize export filenames.
- Never execute JavaScript embedded in a PDF.
- Never auto-open attachments embedded in a PDF.
- No shell command construction from untrusted strings; use argument arrays.
- Dependency pinning and automated security alerts.
- Reproducible builds for WASM/native engines where practical.

## Web privacy

- No document upload route.
- No analytics by default.
- No remote fonts/CDNs.
- Preferences may be stored locally; document content is not persisted unless the user explicitly chooses a workspace feature.
- Service worker caches only application assets, not documents.
- A privacy page should explain that the hosting/CDN provider can observe normal web request metadata such as IP address when the application itself is loaded, even though document contents remain local.

## Native privacy

- Request only filesystem/photo/camera permissions actually required by a user action.
- Store temporary work in the OS-provided application cache.
- Exclude temporary documents from cloud backup where platform APIs allow.
- Do not include crash-report attachments containing filenames/document content.

## Security testing before stable

1. Static dependency audit.
2. Malformed PDF corpus.
3. Password/encryption corpus.
4. Very large page/image dimensions.
5. Cancellation and out-of-memory recovery.
6. Temporary-file cleanup after forced termination.
7. CSP verification for production web build.
8. Android/iOS permission review.
9. Signed desktop installer verification.
10. Independent review of permanent redaction behavior.
