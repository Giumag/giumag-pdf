# Giumag PDF — Project Log

## 2026-09-07
- Existing Python/FastAPI suite classified as a proof of concept and moved into `legacy/python-prototype` in the new baseline.
- Product renamed to **Giumag PDF** for public/professional presentation.
- Selected local-first, multi-delivery architecture: shared React/TypeScript client; PWA for web; Tauri 2 for desktop; Capacitor for iOS/Android.
- Production web processing model explicitly forbids document-upload endpoints.
- GitHub selected for source/CI/releases; Cloudflare Pages recommended for the public static PWA; GitHub Pages reserved for docs/demo.
- Licensing review identified Ghostscript and MuPDF/PyMuPDF as components requiring an AGPL/commercial decision before production redistribution.
- Production core candidates: PDF.js, pdf-lib, QPDF/pdfcpu, Tesseract; installed LibreOffice as an optional desktop integration.
- Added architecture, security/privacy, feature matrix, licensing, roadmap, GitHub/distribution and stable-release documentation.
- Added monorepo scaffold and initial CI/desktop-release workflows.
- Verified current ecosystem versions used by the scaffold (React 19.2.8, Vite 8.2.2, PDF.js package 6.3.289, Capacitor 8.5.1, TypeScript 7.0.2 where applicable).
- Added `NEXT_STEPS.md` with the exact repository/bootstrap/hosting/store sequence.
- Adjusted desktop/workspace configuration and CI bootstrap behavior so the repository can be initialized before the first committed lockfile.
