# Security Policy

## Reporting a vulnerability

Please do not publish vulnerability details, exploit code, secrets, or sensitive PDF documents in a public issue.

If GitHub private vulnerability reporting is available for this repository, use the **Report a vulnerability** option in the repository Security section.

If a private reporting option is not available, open a public issue only to request a private contact channel. Do not include technical vulnerability details in that issue.

A useful security report should include, when applicable:

- the affected version or commit;
- the affected platform and browser or operating system;
- clear reproduction steps;
- the expected and observed behavior;
- the potential security or privacy impact;
- a minimal proof of concept using non-sensitive test files.

Never attach real confidential or personal PDF documents to a vulnerability report.

## Security scope

Security and privacy reports may include issues involving:

- unintended network transmission of document contents;
- local file handling;
- PDF parsing or rendering;
- OCR processing and local OCR assets;
- permanent redaction behavior;
- password protection or unlocking;
- Web/PWA behavior;
- desktop or mobile packaging;
- dependency or supply-chain risks.

Giumag PDF is designed around local-first PDF processing. Any behavior that unexpectedly sends document contents to a remote service should be treated as security-relevant.

## Supported versions

Giumag PDF does not currently have a stable production release.

Security fixes are focused on the current development line and, once published, active beta releases. Historical development snapshots may not receive fixes.

## Coordinated disclosure

Please allow maintainers an opportunity to investigate and address a reported vulnerability before public disclosure.

No response-time or remediation-time guarantee is currently provided.
