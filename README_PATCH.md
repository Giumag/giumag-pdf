# Giumag PDF — Apple System Refinement v0.3.3-dev

Final visual refinement before the first `feat/pdf-viewer` commit.

## Changes
- Replaces the Helvetica-first override with an Apple/system UI font stack.
- Uses `-apple-system` so iOS/iPadOS/macOS render with Apple's current San Francisco system font automatically.
- Does not bundle or redistribute SF Pro font files.
- Moves the accent toward iOS system blue (`#007AFF` / `#0A84FF`).
- Refines navigation and viewer controls toward the current Apple content/UI-layer model.
- More capsule-like floating viewer toolbar and secondary controls.
- Softer selected-page treatment and more consistent card/control radii.
- Slightly improved mobile type sizing and hierarchy.
- No PDF logic changes.

## Apply
From the repository root on `feat/pdf-viewer`:

```powershell
Expand-Archive -Path "$env:USERPROFILE\Downloads\GiumagPDF_apple_system_refinement_v0.3.3-dev.zip" -DestinationPath . -Force
pnpm typecheck
pnpm build:web
pnpm dev
```

If desktop light/dark and the 390×844 responsive test look correct, this patch is intended to be the final visual baseline before committing the viewer branch.
