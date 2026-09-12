# Dependency and Licensing Strategy

This document is engineering guidance, not legal advice.

## Product-code licensing

Do not attach an open-source license by accident. Until the business/open-source model is deliberately chosen, keep the repository private or publish it with a clear copyright notice and no blanket open-source grant.

Before accepting outside contributions, add a contribution policy and decide whether a CLA/DCO is required.

## Preferred dependency classes

Prefer permissive licenses that are compatible with redistribution, such as Apache-2.0, MIT and BSD-style licenses, subject to their notice requirements.

## Current candidates

- **PDF.js** — Apache-2.0; suitable for rendering.
- **Tesseract** — Apache-2.0; suitable for OCR subject to transitive notices.
- **QPDF** — Apache-2.0 (also available under Artistic-2.0); suitable candidate for structural PDF operations.
- **pdfcpu** — Apache-2.0; suitable candidate for structural PDF operations, optimization, encryption and watermarking.
- **LibreOffice** — MPL 2.0 and other component licenses; initially invoke an installed copy rather than bundling it.

## Components requiring explicit legal decision

**Ghostscript and MuPDF/PyMuPDF** are offered by Artifex under AGPL/commercial licensing models. They must not be copied from the proof of concept into a closed/proprietary production distribution without a deliberate licensing decision.

## Release requirements

Every stable build must contain or link to:

- `THIRD_PARTY_NOTICES`
- exact versions of native/WASM engines
- license texts required by redistributed dependencies
- copyright/product About information

Generate an SBOM for each native release and archive it with release artifacts.
