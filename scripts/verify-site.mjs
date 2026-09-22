import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(readFileSync(resolve(root, 'artifact-manifest.json'), 'utf8'));
if (manifest.schema !== 'static-showcase-artifacts/v1' || !Array.isArray(manifest.files) || manifest.files.length !== 6) {
  throw new Error('Unexpected artifact manifest');
}
const files = [];
function walk(prefix = '') {
  for (const entry of readdirSync(resolve(root, 'site', prefix), { withFileTypes: true })) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) walk(path);
    else if (entry.isFile()) files.push(path);
    else throw new Error(`Unsupported entry: ${path}`);
  }
}
walk();
const expectedPaths = manifest.files.map((entry) => entry.path);
if (JSON.stringify(files.sort()) !== JSON.stringify([...expectedPaths].sort())) {
  throw new Error('Site inventory differs from the verified artifact');
}
for (const entry of manifest.files) {
  if (!/^[a-f0-9]{64}$/.test(entry.sha256)) throw new Error('Invalid SHA-256');
  const bytes = readFileSync(resolve(root, 'site', entry.path));
  if (bytes.length !== entry.bytes || createHash('sha256').update(bytes).digest('hex') !== entry.sha256) {
    throw new Error(`Artifact bytes changed: ${entry.path}`);
  }
}
console.log('Verified exact inventory and SHA-256 identity of all six showcase files.');
