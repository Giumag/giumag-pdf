# Third-Party Software Policy

1. No dependency enters a release without an identified license.
2. Copyleft dependencies with network/distribution obligations require explicit approval before integration.
3. Runtime assets (WASM, language data, fonts) count as redistributed software/data and must be reviewed.
4. Lock dependency versions in production builds.
5. Generate `THIRD_PARTY_NOTICES` automatically from the lockfile plus manually reviewed native components.
6. Archive an SBOM alongside every stable release.
7. Do not copy Ghostscript or MuPDF/PyMuPDF from the prototype into production packages until licensing is explicitly resolved.
