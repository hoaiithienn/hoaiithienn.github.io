import { BOOT_TIMEOUT_MS, createBootGate } from './bootGate.mjs';

const LOAD_TIMEOUT_MS = 30_000;

export function runBrowserQemu(base, image, onChange) {
  const gate = createBootGate();
  let timer;
  let worker;
  let diagnostic = '';

  function stop() {
    clearTimeout(timer);
    worker?.terminate();
  }

  function update(result) {
    if (gate.complete()) stop();
    onChange(result);
  }

  try {
    worker = new Worker(`${base}qemu/runner.js`);
    timer = setTimeout(() => update(gate.error(
      diagnostic || 'QEMU did not produce boot events before the startup deadline.',
    )), LOAD_TIMEOUT_MS);

    worker.onmessage = ({ data }) => {
      if (data.type === 'diagnostic') {
        diagnostic = data.message;
        return;
      }
      if (data.type === 'error') {
        update(gate.error(data.message || diagnostic || 'QEMU stopped unexpectedly.'));
        return;
      }
      if (data.type === 'serial') {
        const previous = gate.snapshot().status;
        const result = gate.write(data.line + '\n');
        if (previous === 'waiting' && result.status === 'running') {
          clearTimeout(timer);
          timer = setTimeout(() => update(gate.timeout()), BOOT_TIMEOUT_MS);
        }
        update(result);
      }
    };
    worker.onerror = (event) => {
      update(gate.error(diagnostic || event.message || 'The browser could not start QEMU.'));
    };
    worker.onmessageerror = () => update(gate.error('The QEMU serial stream could not be read.'));
    worker.postMessage(image);
  } catch (error) {
    update(gate.error(error.message));
  }

  return stop;
}
