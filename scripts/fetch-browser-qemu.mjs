import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const revision = '11f4fbfdbf06deb1eb7b516203177217d2883665';
const origin = `https://raw.githubusercontent.com/atrosinenko/qemujs-demo/${revision}/new/`;
const assets = [
  ['qemu-system-i386.js', 'qemu-system-i386.js', 'ec9c468e75f2f7894cb2526cf2ed7d7340dfd679ebe51d952c72f1e28317a71b'],
  ['qemu-system-i386.wasm', 'qemu-system-i386.wasm', '15ca9216b3ece1df87cd516b23da4a9e1bc3bd1e1047575539fdea00105a2460'],
];

const checksum = (bytes) => createHash('sha256').update(bytes).digest('hex');
await mkdir('public/qemu', { recursive: true });
await Promise.all(assets.map(async ([remote, local, hash]) => {
  const path = `public/qemu/${local}`;
  const cached = await readFile(path).catch((error) => {
    if (error.code !== 'ENOENT') throw error;
    return null;
  });
  if (cached && checksum(cached) === hash) return;
  const response = await fetch(origin + remote, { signal: AbortSignal.timeout(60_000) });
  if (!response.ok) throw new Error(`Could not download ${remote}: HTTP ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (checksum(bytes) !== hash) throw new Error(`Checksum mismatch for ${remote}`);
  await writeFile(path, bytes);
}));
