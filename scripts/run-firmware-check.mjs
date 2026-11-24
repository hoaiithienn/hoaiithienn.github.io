import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { BOOT_RULE, BOOT_TIMEOUT_MS, createBootGate } from '../src/lib/bootGate.mjs';

const fixtures = { baseline: 'pass', regression: 'fail' };
const mode = process.argv[2] ?? 'baseline';
if (mode !== '--verify-fixtures' && !Object.hasOwn(fixtures, mode)) {
  console.error('Usage: npm run firmware:check -- [baseline|regression|--verify-fixtures]');
  process.exit(2);
}

function run(image) {
  const gate = createBootGate();
  return new Promise((resolve) => {
    const child = spawn(process.env.QEMU ?? 'qemu-system-i386', [
      '-machine', 'pc', '-m', '32', '-display', 'none', '-serial', 'stdio',
      '-monitor', 'none', '-net', 'none', '-vga', 'none',
      '-bios', `public/firmware/${image}.rom`,
    ], { stdio: ['ignore', 'pipe', 'pipe'] });
    let diagnostic = '';
    function expire() {
      gate.timeout();
      child.kill('SIGKILL');
    }
    let timer = setTimeout(expire, BOOT_TIMEOUT_MS);
    child.stdout.setEncoding('utf8').on('data', (chunk) => {
      const previous = gate.snapshot().status;
      const result = gate.write(chunk);
      if (previous === 'waiting' && result.status === 'running') {
        clearTimeout(timer);
        timer = setTimeout(expire, BOOT_TIMEOUT_MS);
      }
      if (gate.complete()) child.kill('SIGKILL');
    });
    child.stderr.setEncoding('utf8').on('data', (chunk) => { diagnostic += chunk; });
    child.on('error', (error) => gate.error(error.message));
    child.on('close', (code) => {
      clearTimeout(timer);
      if (!gate.complete()) gate.error(`QEMU closed before the boot check completed (exit ${code}).`);
      resolve({
        revision: process.env.GITHUB_SHA ?? null, image, rule: BOOT_RULE,
        ...gate.snapshot(), diagnostic: diagnostic.trim(),
      });
    });
  });
}

await mkdir('reports', { recursive: true });
for (const image of mode === '--verify-fixtures' ? Object.keys(fixtures) : [mode]) {
  const report = await run(image);
  await writeFile(`reports/${image}.json`, JSON.stringify(report, null, 2) + '\n');
  await writeFile(`reports/${image}.log`, report.serial.join('\n') + '\n');
  console.log(`${image}: ${report.status} — ${report.message}`);
  const mismatch = mode === '--verify-fixtures' && image === 'regression'
    && report.message !== 'READY arrived before INIT_OK.';
  if (report.status !== (mode === '--verify-fixtures' ? fixtures[image] : 'pass') || mismatch) {
    if (report.diagnostic) console.error(report.diagnostic);
    process.exitCode = report.status === 'error' ? 2 : process.exitCode || 1;
  }
}
