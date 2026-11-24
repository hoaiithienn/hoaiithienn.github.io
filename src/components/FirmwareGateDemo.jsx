import { useEffect, useRef, useState } from 'react';
import { BOOT_RULE, createBootGate } from '../lib/bootGate.mjs';
import { runBrowserQemu } from '../lib/browserQemu.mjs';

const labels = {
  idle: 'Ready to run', waiting: 'Starting QEMU', running: 'Checking startup',
  pass: 'Pass', fail: 'Would block merge', error: 'Runner error',
};
const eventLabels = {
  BOOT_START: 'Firmware started', INIT_OK: 'Initialization complete',
  READY: 'Firmware reported ready', BOOT_END: 'Startup trace complete',
};

export default function FirmwareGateDemo({ base }) {
  const [image, setImage] = useState(null);
  const [result, setResult] = useState({ status: 'idle', events: [], serial: [] });
  const stop = useRef();
  const busy = ['waiting', 'running'].includes(result.status);

  useEffect(() => () => stop.current?.(), []);

  function start(nextImage) {
    stop.current?.();
    setImage(nextImage);
    setResult(createBootGate().snapshot());
    stop.current = runBrowserQemu(base, nextImage, setResult);
  }

  return (
    <section className="demo" id="demo" aria-labelledby="demo-title">
      <header className="demo-heading">
        <div>
          <h2 id="demo-title">Firmware startup gate</h2>
          <p>Boot a firmware build and see how its startup order changes the verdict.</p>
        </div>
        <span className="environment"><span aria-hidden="true" /> QEMU emulation</span>
      </header>

      <div className="demo-controls" aria-label="Choose a firmware build" role="group">
        <button className="button primary" type="button" aria-disabled={busy}
          onClick={() => { if (!busy) start('baseline'); }}>
          Run baseline
        </button>
        <button className="button secondary" type="button" aria-disabled={busy}
          onClick={() => { if (!busy) start('regression'); }}>
          Run regression
        </button>
      </div>

      <div className="demo-grid">
        <div className="gate">
          <h3>Acceptance rule</h3>
          <p className="rule" aria-label={BOOT_RULE}><code>INIT_OK</code> must precede <code>READY</code></p>
          <div className="verdict" data-status={result.status} role="status" aria-atomic="true">
            <span className="verdict-label">{labels[result.status]}</span>
            <p>{result.message ?? 'Select a build to evaluate the rule.'}</p>
          </div>
        </div>

        <div className="timeline">
          <div className="timeline-heading">
            <h3>Observed events</h3>
            {image && <span>{image}</span>}
          </div>
          {result.events.length ? (
            <ol>
              {result.events.map((event, index) => (
                <li key={index}><code>{event}</code><span>{eventLabels[event]}</span></li>
              ))}
            </ol>
          ) : <p className="empty">Serial events appear here when the firmware boots.</p>}
        </div>
      </div>

      <details className="serial">
        <summary>Serial log</summary>
        <pre tabIndex={0}>{result.serial.join('\n') || 'No serial output yet.'}</pre>
      </details>
    </section>
  );
}
