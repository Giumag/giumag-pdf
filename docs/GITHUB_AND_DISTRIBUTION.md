# GitHub, Hosting and Store Distribution

## GitHub repository

Recommended repository name: `giumag-pdf`.

Initial visibility: **private** until the licensing model, third-party notices and security baseline are ready. Public source can be enabled later deliberately.

Recommended settings:

- protect `main`;
- require pull-request checks;
- enable Dependabot/security alerts;
- enable secret scanning if available;
- tag releases with semantic versioning (`v0.x`, `v1.0.0`);
- use GitHub Releases for desktop installers, checksums and SBOMs.

## Production web hosting

Recommended: Cloudflare Pages connected to GitHub.

Expected flow:

```text
push / pull request
        ↓
GitHub CI tests
        ↓
Cloudflare preview deployment
        ↓
merge to main
        ↓
production static PWA deployment
```

Only static assets are deployed. There is no PDF-processing API.

GitHub Pages can still host technical documentation or a preview, but it should not be the strategic production host.

## Desktop releases

Use Tauri release builds. GitHub Actions can build and attach native desktop artifacts to GitHub Releases. Production releases must be code-signed where the platform supports/needs it.

### macOS

For professional distribution outside the Mac App Store, sign with Apple Developer ID and notarize. The Apple Developer Program currently has a USD 99/year membership fee (local pricing may vary).

### Windows

Acquire a suitable code-signing certificate before public stable release. Keep signing keys outside the repository and use CI secrets or a signing service.

## Mobile stores

### Google Play

- Create Play Console developer account.
- Current registration fee: USD 25 one-time.
- Prefer an Organization account once Giumag has the appropriate legal identity; personal accounts may have additional testing requirements.
- Start with internal/closed testing before production.

### Apple App Store

- Apple Developer Program membership is required for normal App Store distribution.
- Use TestFlight before public launch.
- If enrolling as an organization, Apple requires organization verification and a D-U-N-S number.

## Domain

Before stable release, use a domain owned by the publisher. Suggested structure after a domain is chosen:

- product: `pdf.<owned-domain>`
- privacy: `pdf.<owned-domain>/privacy`
- support: `pdf.<owned-domain>/support`
- releases/docs may link to GitHub but the public application should have a branded canonical URL.
