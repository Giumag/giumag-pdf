# Web/PWA Beta Operations

This document defines the operating rules for the Giumag PDF public Web/PWA beta.

Public beta:

https://giumag-pdf.pages.dev

Current beta line:

0.21.0-beta.x

Giumag PDF remains privacy-first and local-first. PDF processing is expected to stay on the user's device.

## Scope during the beta

Priority order:

1. privacy and security regressions;
2. data integrity and output correctness;
3. regressions in existing tools;
4. crashes, hangs and browser/PWA compatibility;
5. accessibility problems;
6. important usability defects;
7. minor polish;
8. feature requests.

Avoid feature creep during the beta unless a new capability is required to resolve a release-blocking problem.

## Public issue types

Use the GitHub issue forms for:

- reproducible Web/PWA beta bugs;
- structured feedback;
- feature requests.

Do not post confidential, personal or sensitive PDF files in public issues.

Use synthetic or sanitized documents when a reproduction file is necessary.

Security vulnerabilities must be reported privately according to SECURITY.md, not through a public issue.

## Labels

Existing repository labels remain valid, including:

- bug
- enhancement
- accessibility
- documentation
- question

Beta-specific labels:

- beta: applies to the active public Web/PWA beta;
- regression: behavior worked previously and is now broken;
- privacy: affects privacy, local processing, permissions or data handling;
- priority: p0: immediate beta blocker;
- priority: p1: must be resolved before stable;
- priority: p2: valid beta issue that is not a stable blocker;
- priority: p3: minor polish or low-impact backlog.

Priority is assigned during triage, not by the reporter.

## Priority definitions

### P0 - beta blocker

Examples:

- documents are unexpectedly transmitted outside the intended local-processing model;
- systematic data loss or destructive corruption;
- critical production outage affecting normal use;
- severe regression making the application broadly unusable.

Potential security vulnerabilities must still use the private security-reporting process.

### P1 - stable blocker

Examples:

- an existing PDF tool is materially broken for normal supported input;
- generated output is invalid or incorrect in a significant reproducible case;
- serious browser or PWA regression;
- major accessibility barrier in a primary workflow;
- significant privacy-related regression.

P1 issues should be resolved before the Web/PWA release is considered stable.

### P2 - normal beta issue

Examples:

- reproducible bugs with a practical workaround;
- compatibility problems limited to a narrower environment;
- non-critical accessibility or usability defects;
- performance problems that do not prevent task completion.

### P3 - minor or backlog

Examples:

- visual polish;
- small consistency improvements;
- low-impact edge cases;
- non-essential enhancements.

## Regression handling

Apply regression only when there is reasonable evidence that the behavior worked in an earlier Giumag PDF build or workflow.

Record, where known:

- last known good version or commit;
- first known bad version or commit;
- browser and operating system;
- affected tool;
- minimal reproduction.

## Privacy triage

Apply privacy when the issue concerns:

- unexpected external network requests;
- document or extracted-content transmission;
- permissions;
- storage behavior;
- metadata exposure;
- misleading local-processing claims;
- privacy-sensitive UX.

For privacy reports, reproduce with synthetic documents whenever possible and inspect the browser Network panel.

Do not weaken CSP or other security controls merely to silence third-party browser extensions or unrelated warnings.

## Milestone

Issues actively targeted during the current beta belong to:

0.21.x Web Beta

Not every feature request must be placed in the beta milestone.

## Beta release policy

The current public line starts at:

0.21.0-beta.1

Beta fixes may increment the prerelease number, for example:

- 0.21.0-beta.2
- 0.21.0-beta.3

Do not create v* Git tags during the Web beta while the desktop release workflow is triggered by v*.

The stable Web/PWA target is 0.21.0 only after the stable exit criteria are met and release/tag workflow behavior has been reviewed.

## Stable exit criteria

Before calling the Web/PWA release stable:

- no open P0 issues;
- no unresolved P1 issues accepted as stable blockers;
- privacy/network smoke remains clean;
- all 18 primary tools pass the functional smoke matrix;
- CI is green;
- CodeQL is green;
- Cloudflare Pages production deployment is green;
- HTTPS and security headers are valid;
- manifest and Service Worker are valid;
- PWA installation has been smoke-tested;
- major supported-browser regressions are resolved or explicitly documented;
- beta feedback has been triaged;
- release/tag behavior has been reviewed before any stable tag is created.

## Triage workflow

For each new issue:

1. confirm there is enough information to reproduce or evaluate it;
2. identify whether it is a bug, enhancement, accessibility issue, privacy issue or question;
3. reproduce when practical;
4. apply beta when it affects the active Web/PWA beta;
5. apply regression, privacy or accessibility when appropriate;
6. assign exactly one priority label once enough evidence exists;
7. add the issue to 0.21.x Web Beta if it is intended to be handled during this beta cycle;
8. close duplicates with a reference to the canonical issue;
9. keep security vulnerabilities out of public issue discussion.

## Current non-blocking technical notes

Known observations that are not automatically beta blockers include:

- browser bundling warnings involving pdfstudio;
- the existing PDF engine dynamic/static import warning;
- large bundle or chunk warnings;
- PDF.js fallback warnings that do not break the workflow;
- Tesseract auxiliary language-file warnings when OCR completes correctly;
- CSP violations originating from browser extensions rather than Giumag PDF.

Escalate these only when they cause a reproducible user-visible failure, privacy problem or material regression.

## Change discipline during beta

For beta fixes:

1. create a focused branch;
2. perform preflight and working-tree validation;
3. patch the smallest reasonable scope;
4. run relevant typecheck, tests and build;
5. inspect the exact diff;
6. commit and push;
7. open a pull request;
8. wait for CI, CodeQL and Cloudflare checks as applicable;
9. smoke-test preview or production behavior;
10. squash and merge manually;
11. verify the squash merge SHA on main;
12. clean up the feature branch only after merge verification.

Do not create native release tags as part of ordinary Web beta fixes.