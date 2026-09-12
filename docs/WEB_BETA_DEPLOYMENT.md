# Web/PWA Beta Deployment

## Release candidate

- Candidate version: 0.21.0-beta.1
- Public beta target: Web/PWA.
- Production branch: main.
- Desktop installers are not part of this beta.
- Android and iOS packages are not part of this beta.
- Do not create a v* Git tag for this Web beta because v* triggers the Desktop Release workflow.

## Cloudflare Pages

Recommended production host: Cloudflare Pages with GitHub integration.

Build configuration:

- Root directory: repository root
- Production branch: main
- Build command: pnpm build:web
- Output directory: apps/client/dist

Git integration should be used so pull requests and non-production branches receive preview deployments before main is published.

Do not add a manual catch-all redirect unless production routing proves that one is required.

## Security headers

apps/client/public/_headers is copied by Vite into the static production output.

The policy allows the local browser capabilities currently required by Giumag PDF:

- same-origin application assets;
- data/blob image previews;
- local Web Workers through blob URLs;
- local WebAssembly compilation;
- current inline UI styles.

It does not authorize third-party PDF-processing endpoints or third-party script origins.

Service-worker and manifest files use no-cache so browsers can revalidate beta updates.

## Public beta gate

Before publishing the canonical beta URL:

1. GitHub CI must be green.
2. Cloudflare preview deployment must build successfully.
3. Browser console must show no required resource blocked by CSP.
4. PWA installability must be verified.
5. Service worker update and offline relaunch must work.
6. Manifest name, scope, start URL and icons must be correct.
7. Core PDF tools must pass the Web/PWA smoke matrix.
8. Browser network inspection must show that document bytes are not uploaded.
9. Production deployment must use HTTPS.
10. After the canonical URL is confirmed, set the GitHub repository homepage to that URL.

## Desktop boundary

apps/desktop/src-tauri/Cargo.toml and tauri.conf.json remain at native version 0.2.0 during Web/PWA beta preparation.

The native version must be reconciled deliberately before Desktop beta. No Web beta tag should trigger Desktop Release.
