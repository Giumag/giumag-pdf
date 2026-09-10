import {
  copyFile,
  mkdir,
  readdir,
  rm,
  stat,
} from 'node:fs/promises';

import path from 'node:path';

import {
  fileURLToPath,
} from 'node:url';

const scriptDirectory =
  path.dirname(
    fileURLToPath(import.meta.url),
  );

const repositoryRoot =
  path.resolve(
    scriptDirectory,
    '..',
  );

const clientRoot =
  path.join(
    repositoryRoot,
    'apps',
    'client',
  );

const nodeModulesRoot =
  path.join(
    clientRoot,
    'node_modules',
  );

const outputRoot =
  path.join(
    clientRoot,
    'public',
    'tesseract',
  );

const workerOutput =
  path.join(
    outputRoot,
    'worker',
  );

const coreOutput =
  path.join(
    outputRoot,
    'core',
  );

const languageOutput =
  path.join(
    outputRoot,
    'lang',
  );

async function ensureDirectory(
  directory,
  label,
) {
  const info =
    await stat(
      directory,
    );

  if (!info.isDirectory()) {
    throw new Error(
      `${label}: directory non valida.`,
    );
  }
}

async function copyRequiredFile(
  source,
  target,
  label,
) {
  const info =
    await stat(
      source,
    );

  if (
    !info.isFile() ||
    info.size === 0
  ) {
    throw new Error(
      `${label}: file sorgente non valido.`,
    );
  }

  await copyFile(
    source,
    target,
  );

  console.log(
    `[OK] ${label}`,
  );
}

async function findFilesRecursive(
  directory,
  matcher,
) {
  const results = [];

  const entries =
    await readdir(
      directory,
      {
        withFileTypes: true,
      },
    );

  for (const entry of entries) {
    const fullPath =
      path.join(
        directory,
        entry.name,
      );

    if (entry.isDirectory()) {
      results.push(
        ...await findFilesRecursive(
          fullPath,
          matcher,
        ),
      );

      continue;
    }

    if (
      entry.isFile() &&
      matcher(
        entry.name,
        fullPath,
      )
    ) {
      results.push(
        fullPath,
      );
    }
  }

  return results;
}

const tesseractRoot =
  path.join(
    nodeModulesRoot,
    'tesseract.js',
  );

const coreRoot =
  path.join(
    nodeModulesRoot,
    'tesseract.js-core',
  );

const italianRoot =
  path.join(
    nodeModulesRoot,
    '@tesseract.js-data',
    'ita',
  );

const englishRoot =
  path.join(
    nodeModulesRoot,
    '@tesseract.js-data',
    'eng',
  );

await ensureDirectory(
  tesseractRoot,
  'Tesseract.js',
);

await ensureDirectory(
  coreRoot,
  'Tesseract.js core',
);

await ensureDirectory(
  italianRoot,
  'Dati lingua italiana',
);

await ensureDirectory(
  englishRoot,
  'Dati lingua inglese',
);

await rm(
  outputRoot,
  {
    recursive: true,
    force: true,
  },
);

await Promise.all([
  mkdir(
    workerOutput,
    {
      recursive: true,
    },
  ),
  mkdir(
    coreOutput,
    {
      recursive: true,
    },
  ),
  mkdir(
    languageOutput,
    {
      recursive: true,
    },
  ),
]);

const workerSource =
  path.join(
    tesseractRoot,
    'dist',
    'worker.min.js',
  );

await copyRequiredFile(
  workerSource,
  path.join(
    workerOutput,
    'worker.min.js',
  ),
  'Tesseract worker',
);

/*
 * Tesseract.js sceglie autonomamente
 * il runtime più adatto al dispositivo.
 *
 * Per corePath locale servono queste
 * quattro varianti .wasm.js.
 */
const requiredCoreFiles = [
  'tesseract-core.wasm.js',
  'tesseract-core-simd.wasm.js',
  'tesseract-core-lstm.wasm.js',
  'tesseract-core-simd-lstm.wasm.js',
  'tesseract-core-relaxedsimd.wasm.js',
  'tesseract-core-relaxedsimd-lstm.wasm.js',
];

for (const fileName of requiredCoreFiles) {
  await copyRequiredFile(
    path.join(
      coreRoot,
      fileName,
    ),
    path.join(
      coreOutput,
      fileName,
    ),
    `Core ${fileName}`,
  );
}

async function copyLanguage(
  languageRoot,
  languageCode,
) {
  const candidates =
    await findFilesRecursive(
      languageRoot,
      (name) =>
        name ===
        `${languageCode}.traineddata.gz`,
    );

  if (candidates.length === 0) {
    throw new Error(
      `Nessun traineddata trovato per ${languageCode}.`,
    );
  }

  const preferred =
    candidates.find(
      (candidate) =>
        candidate.includes(
          'best_int',
        ),
    ) ??
    candidates.find(
      (candidate) =>
        candidate.includes(
          'best',
        ),
    ) ??
    candidates[0];

  await copyRequiredFile(
    preferred,
    path.join(
      languageOutput,
      `${languageCode}.traineddata.gz`,
    ),
    `Lingua ${languageCode}`,
  );
}

await copyLanguage(
  italianRoot,
  'ita',
);

await copyLanguage(
  englishRoot,
  'eng',
);

console.log(
  `[OK] Runtime OCR locale pronto: ${outputRoot}`,
);