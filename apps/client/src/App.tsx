import { UNIVERSAL_TOOLS } from '@giumag/shared';

export function App() {
  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand">Giumag PDF</div>
        <div className="privacy-badge">On-device processing</div>
      </header>

      <section className="hero">
        <p className="eyebrow">PDF workspace</p>
        <h1>Work with PDFs without uploading them.</h1>
        <p className="lede">
          A local-first PDF toolkit for web, desktop and mobile. Files are processed on the device.
        </p>
      </section>

      <section aria-labelledby="tools-title">
        <div className="section-heading">
          <h2 id="tools-title">Tools</h2>
          <span>{UNIVERSAL_TOOLS.length} universal tools in the production plan</span>
        </div>
        <div className="grid">
          {UNIVERSAL_TOOLS.map((tool) => (
            <button className="tool-card" key={tool.id} type="button">
              <strong>{tool.name}</strong>
              <span>{tool.description}</span>
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}
