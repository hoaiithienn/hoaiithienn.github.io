export const BOOT_TIMEOUT_MS = 5000;
export const BOOT_RULE = 'INIT_OK must precede READY';
const bootEvents = new Set(['BOOT_START', 'INIT_OK', 'READY', 'BOOT_END']);

export function createBootGate() {
  let pending = '';
  let status = 'waiting';
  let message = 'Waiting for serial output.';
  const events = [];
  const serial = [];

  function finish(nextStatus, explanation) {
    status = nextStatus;
    message = explanation;
  }

  function readLine(line) {
    serial.push(line);
    if (!bootEvents.has(line)) return;
    events.push(line);
    if (line === 'BOOT_START' && status === 'waiting') {
      finish('running', 'Checking startup event order.');
    }
    if (line !== 'BOOT_END') return;

    const start = events.indexOf('BOOT_START');
    const init = events.indexOf('INIT_OK', start + 1);
    const ready = events.indexOf('READY', start + 1);
    if (status === 'waiting') finish('fail', 'The boot start event is missing.');
    else if (init === -1 || ready === -1) finish('fail', 'An expected startup event is missing.');
    else if (ready < init) finish('fail', 'READY arrived before INIT_OK.');
    else finish('pass', 'INIT_OK arrived before READY.');
  }

  const complete = () => ['pass', 'fail', 'error'].includes(status);
  const snapshot = () => ({ status, message, events: [...events], serial: [...serial] });

  return {
    snapshot,
    complete,
    write(chunk) {
      if (complete()) return snapshot();
      const lines = (pending + chunk).split('\n');
      pending = lines.pop();
      for (const line of lines) {
        readLine(line.replace(/\r$/, ''));
        if (complete()) break;
      }
      return snapshot();
    },
    timeout() {
      if (status === 'running') finish('fail', 'The guest did not complete startup before the deadline.');
      else if (!complete()) finish('error', 'The runner did not receive a boot start event.');
      return snapshot();
    },
    error(reason) {
      if (!complete()) finish('error', reason);
      return snapshot();
    },
  };
}
