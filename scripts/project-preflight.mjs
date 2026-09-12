import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import process from 'node:process';

function git(args) {
  return execFileSync('git', args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function fail(message) {
  console.error(`[FAIL] ${message}`);
  process.exitCode = 1;
}

let root;

try {
  root = git(['rev-parse', '--show-toplevel']);
} catch {
  console.error('[FAIL] Not inside a Git repository.');
  process.exit(1);
}

process.chdir(root);

const packagePath = resolve(root, 'package.json');
if (!existsSync(packagePath)) {
  console.error('[FAIL] package.json not found at repository root.');
  process.exit(1);
}

const pkg = JSON.parse(readFileSync(packagePath, 'utf8'));
const branch = git(['branch', '--show-current']) || '(detached HEAD)';
const head = git(['rev-parse', 'HEAD']);
const status = git(['status', '--short']);
let origin = '(not configured)';

try {
  origin = git(['remote', 'get-url', 'origin']);
} catch {
  // Keep the explicit "(not configured)" value.
}

console.log('='.repeat(88));
console.log('GIUMAG PDF - PROJECT PREFLIGHT');
console.log('='.repeat(88));
console.log(`[INFO] Root: ${root}`);
console.log(`[INFO] Branch: ${branch}`);
console.log(`[INFO] HEAD: ${head}`);
console.log(`[INFO] Origin: ${origin}`);
console.log(`[INFO] Version: ${pkg.version ?? '(unknown)'}`);
console.log(`[INFO] Package manager: ${pkg.packageManager ?? '(unknown)'}`);

if (status) {
  console.log('[WARN] Working tree is not clean:');
  console.log(status);
} else {
  console.log('[OK] Working tree clean');
}

const requiredFiles = [
  'CONTRIBUTING.md',
  'SECURITY.md',
  'docs/BETA_OPERATIONS.md',
  'AGENTS.md',
  'docs/AI_PROJECT_STATE.md',
  'docs/AI_DECISIONS.md',
  'docs/AI_HANDOFF.md',
];

let missing = false;
for (const relativePath of requiredFiles) {
  if (existsSync(resolve(root, relativePath))) {
    console.log(`[OK] ${relativePath}`);
  } else {
    missing = true;
    console.log(`[MISS] ${relativePath}`);
  }
}

console.log('');
console.log('[INFO] Canonical application validation:');
console.log('       pnpm typecheck');
console.log('       pnpm test');
console.log('       pnpm build:web');
console.log('       git diff --check');

if (missing) {
  fail('One or more required continuity/governance files are missing.');
}

if (!pkg.scripts?.typecheck || !pkg.scripts?.test || !pkg.scripts?.['build:web']) {
  fail('One or more canonical validation scripts are missing from package.json.');
}

if (process.argv.includes('--require-clean') && status) {
  fail('Working tree must be clean for this preflight mode.');
}

if (!process.exitCode) {
  console.log('');
  console.log('[OK] Preflight completed');
}