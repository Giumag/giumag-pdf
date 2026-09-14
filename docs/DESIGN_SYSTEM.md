# Giumag PDF — Soft Utility Design System

## Direction

Giumag PDF is a consumer PDF application that should feel immediate, calm and carefully made.

The primary experience goal is:

> È facilissimo da usare, ma è stato progettato con una cura enorme.

The interface is not a professional document workbench, editorial product, CAD tool, archive or enterprise dashboard.

The product should feel:

- immediate;
- modern;
- friendly;
- premium without luxury;
- soft without becoming childish;
- clear without becoming sterile.

Originality never takes priority over comprehension.

## Product test

For every screen ask, in this order:

1. Would a new user immediately understand what to do?
2. Is the interface pleasant to use and look at?
3. Does it feel recognizably Giumag?

If an unusual interaction reduces clarity, do not use it.

## Visual identity

Giumag is recognized by the combination of:

- warm coral accent;
- Onest typography;
- soft neutral surfaces;
- consistent radii;
- operation-specific document icons;
- carefully presented document previews;
- restrained microinteractions;
- discreet local-processing status.

No single decorative element should carry the identity.

## Typography

### Primary

Use **Onest** for almost the whole interface.

Recommended weights:

- 400: body copy;
- 500: controls and labels;
- 600: headings and buttons;
- 700: important emphasis only.

Do not use Inter as the primary font.

Do not use system-ui as the visual identity.

Do not use a serif as a dominant product font.

### Technical metadata

**IBM Plex Mono** may be used sparingly for genuinely technical values:

- file size;
- page count;
- compression percentage;
- progress values.

It must not become a dominant aesthetic element.

Fonts are self-hosted through the application build. No runtime font CDN is used.

## Light palette

- background: `#F7F7F5`
- primary surface: `#FFFFFF`
- secondary surface: `#F1F2EF`
- primary text: `#17181A`
- secondary text: `#686D73`
- border: `#E5E6E2`
- Giumag coral: `#C94A4A`
- local/privacy green: `#3F7D62`

The coral is slightly deeper than the initial exploratory red so white primary-button text retains stronger contrast.

The interface should remain overwhelmingly neutral.

## Dark palette

Dark mode uses warm charcoal rather than pure black.

Use:

- dark charcoal background;
- subtly raised surfaces;
- soft white text;
- very thin neutral borders;
- the same restrained Giumag coral.

Avoid blue Apple-style accents, glow and mechanical color inversion.

## Shape

Recommended ranges:

- buttons: `12–14px`;
- inputs: `12–14px`;
- small panels: `14–16px`;
- main panels: `18–22px`;
- drop areas: `20–24px`.

Full pills are reserved for small statuses, filters or segmented controls where the shape has a clear purpose.

## Shadows

Important surfaces may use broad, soft and nearly invisible neutral shadows.

Shadows separate surfaces; they do not make every card float.

Drag interactions may add a small amount of depth.

## Home

The Home is the initial screen of the application, not a marketing landing page.

A new user should immediately understand:

1. a PDF can be opened;
2. a tool can be chosen;
3. files stay on the device;
4. the application is simple.

### Header

Use a normal lightweight header.

Left:

- Giumag PDF.

Right:

- small green dot;
- `Elaborazione locale`;
- optional project/information link.

No floating glass navigation or commercial CTA.

### Start area

Home is task-first rather than file-first.

The primary product message is:

`Lavora con i PDF. Mantienili privati.`

Use the second sentence as a restrained coral emphasis. Do not use gradients.

Supporting copy should explain that the user chooses the operation first and then opens the document inside the relevant workflow.

The Home does **not** expose a generic primary `Apri un PDF` action.

Generic viewing is already available through platform viewers, while the Web client uses `Organizza pagine` for page viewing, reordering and rotation.

This avoids creating two competing starting points:

- open a document without a clear task;
- choose the actual operation the user wants.

Common tools should therefore appear immediately after the short product message.

Keep the first screen compact enough that quick actions begin to appear without excessive scrolling.
### Quick actions

Surface common tools quickly:

- Unisci PDF;
- Comprimi PDF;
- Dividi PDF;
- Organizza pagine;
- Immagini in PDF;
- PDF in immagini.

Use compact soft tiles with operation-specific icons.

Do not use large feature cards.

### All tools

Use lightweight categories:

- Organizza;
- Converti;
- Modifica;
- Proteggi;
- Altro.

Use compact responsive tiles.

Desktop normally uses three columns. Tablet uses two. Mobile uses one when clarity benefits.

### Search

Search is a normal integrated search field, not a developer command palette.

Use:

`Cerca uno strumento`

Only show result count while a search is active.

### Privacy

Keep privacy factual and short:

`I tuoi PDF restano sul tuo dispositivo.`

Explain that supported operations run locally without sending document contents to a processing server.

Retain accurate hosting/network metadata disclaimers.

## Workspace system

Do not migrate every workspace at once.

Validate the visual system first on:

1. Home;
2. Merge PDF;
3. Compress PDF.

These three screens must belong to the same product without becoming three copies of one layout.

Every workspace should make its primary action immediately understandable.

Common structure:

- compact topbar;
- main content;
- settings only when needed;
- clear primary action.

No glassmorphism.

## Workspace empty states

Do not repeat the identical dropzone with a changed title.

Each operation should have a small, simple action illustration using:

- neutral linework;
- surface colors;
- restrained coral accent.

Examples:

- Merge: two sheets becoming one;
- Compress: large document becoming smaller;
- Split: one sheet becoming two;
- Crop: document with crop corners;
- OCR: document lines becoming text;
- Redact: document with a black redaction line;
- Compare: two documents;
- Signature: document with signature line.

No cartoons or gradients.

## Buttons

### Primary

- coral background;
- white text;
- approximately 12px radius;
- 44–48px normal height.

### Secondary

- surface background;
- neutral border;
- primary text.

### Ghost

- transparent background;
- soft hover.

### Danger

Use only for destructive actions.

Button roles should remain visually distinct.

## Icons

Operation icons should describe actions rather than decorate containers.

Prefer consistent line weight and alignment.

Avoid the generic pattern of a common icon placed inside a colored square.

Icon buttons must preserve at least a practical 44×44 touch target.

## Motion

Use small, purposeful transitions.

Typical timing:

- hover: 120–160ms;
- selected state: around 150ms;
- compression-result bar: 300–450ms;
- modal: short fade and at most 4–8px movement.

Pressed controls may scale to approximately `0.98` when appropriate.

Document dragging may scale to approximately `1.01` with a soft shadow.

Avoid universal hover lift.

Always honor `prefers-reduced-motion`.

## States

### Focus

Use an accessible focus treatment based on Giumag coral.

Never remove focus indication.

### Error

Use a small human-readable error state.

Avoid giant red banners.

### Success

Use a restrained green status/check.

The actual result remains more important than celebratory animation.

### Disabled

Keep the control recognizable while clearly reducing emphasis.

## Mobile

Mobile is a deliberate layout, not a compressed desktop screen.

Requirements:

- compact header;
- readable tool title;
- wide document preview;
- vertical controls;
- easy-to-reach primary action;
- bottom action area when it materially helps;
- minimum practical touch targets around 44px;
- avoid excessive tiny metadata.

Avoid normal text below 13–14px except genuinely secondary metadata.

## Tablet

Tablet is an important PDF form factor.

Layouts should intentionally use touch-friendly space, especially for:

- page organization;
- signature;
- crop;
- watermark.

Do not automatically treat tablet as desktop.

## Desktop

Keep empty states and simple tools within controlled widths.

Use extra width only where the workflow benefits from it:

- larger previews;
- side settings;
- side-by-side documents.

Do not simply stretch cards.

## Avoid

Do not reintroduce:

- startup marketing heroes;
- gradient headlines;
- blue/purple branding;
- glow;
- glass navigation;
- decorative blobs;
- excessive pills;
- bento grids;
- huge repeated cards;
- serif-dominant identity;
- monospace-dominant identity;
- decorative numbering;
- coordinates or rulers;
- workbench labels;
- industrial/professional-editor atmosphere;
- uppercase-heavy microcopy;
- dense enterprise UI;
- generic AI-generated section patterns.

## Migration discipline

The redesign remains incremental.

`apps/client/src/styles.css` continues to hold legacy workspace styles.

`apps/client/src/soft-utility.css` contains the new design foundation and migrated screens.

Do not combine this redesign with a repository-wide CSS architecture migration.

Current validation sequence:

1. correct and visually validate Home;
2. migrate Merge;
3. migrate Compress;
4. validate Home + Merge + Compress together;
5. only then plan migration of remaining workspaces.