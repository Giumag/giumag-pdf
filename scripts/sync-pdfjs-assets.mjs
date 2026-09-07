import { cp, mkdir, rm, stat } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const clientRequire = createRequire(new URL('../apps/client/package.json', import.meta.url));
const pdfEntry = clientRequire.resolve('pdfjs-dist/build/pdf.mjs');
const pdfRoot = dirname(dirname(pdfEntry));
const publicRoot = fileURLToPath(new URL('../apps/client/public/pdfjs/', import.meta.url));
const folders = ['cmaps', 'iccs', 'standard_fonts', 'wasm'];

await mkdir(publicRoot, { recursive: true });

for (const folder of folders) {
  const source = join(pdfRoot, folder);
  const destination = join(publicRoot, folder);

  try {
    await stat(source);
  } catch {
    continue;
  }

  await rm(destination, { recursive: true, force: true });
  await cp(source, destination, { recursive: true });
}

console.log('[giumag-pdf] PDF.js runtime assets synchronized.');
