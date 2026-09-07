# Giumag PDF — Design System

## Direction
Giumag PDF follows an Apple-platform-inspired interface language: content-first layouts, strong hierarchy, generous whitespace, restrained color, hairline separators, rounded geometry, and translucent controls that float above stable content surfaces.

The target is not a literal copy of Apple software. The product should feel as if it belongs naturally beside modern iOS, iPadOS, and macOS applications while retaining Giumag PDF's own identity.

## Typography
Giumag PDF uses the operating system UI font instead of bundling a proprietary typeface:

```css
font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Helvetica Neue", "Segoe UI", system-ui, sans-serif;
```

On Apple platforms, `-apple-system` resolves to Apple's current San Francisco system typeface. On other platforms the stack falls back to the native system UI font. No SF Pro font files are bundled or redistributed.

Rules:
- display headings use the same system family with the display-oriented fallback order;
- body copy prioritizes legibility over extreme tightness;
- normal mobile body size should remain around the iOS 17 pt baseline;
- avoid 10–11 px text except genuinely secondary metadata;
- use 600–700 weights sparingly and reserve the heaviest emphasis for hierarchy.

## Layers and materials
Treat the interface as two layers:
1. **Content layer** — documents, cards, tools, workspace surfaces. Prefer stable opaque/near-opaque surfaces.
2. **UI layer** — navigation, toolbars, contextual actions. These may use glass/translucency, blur, capsule shapes, and subtle elevation.

This mirrors the content-vs-control separation used by current Apple platform design.

## Controls
- Primary actions use system-blue capsules.
- Secondary actions use lightly translucent capsules.
- Viewer navigation is a floating pill rather than a rigid bar.
- Interactive targets stay comfortably sized for touch.
- Hover/pressed motion is short and functional, not decorative.

## Cards
Tool cards use generous radii, normal document flow, and clear icon-to-copy separation. They must remain readable in one-column mobile layouts and under text scaling.

## Color
- Light mode: neutral near-white background, white content surfaces, dark text.
- Dark mode: true/near black background and graphite surfaces.
- Accent: iOS-style system blue (`#007AFF` light / `#0A84FF` dark).
- Decorative gradients are reserved for a small number of marketing accents, not controls.

## Motion and accessibility
Use restrained 150–280 ms transitions and honor `prefers-reduced-motion`. Mobile typography and controls should remain comfortably readable and tappable.
