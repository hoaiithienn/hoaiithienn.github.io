// Qemu.js is a classic Emscripten script. A dedicated worker isolates each boot.
self.addEventListener('message', async ({ data: image }) => {
  try {
    if (!['baseline', 'regression'].includes(image)) throw new Error('Unknown firmware image.');
    const rom = await readAsset(`../firmware/${image}.rom`);

    let bootStarted = false;
    self.Module = {
      locateFile: (path) => new URL(path, self.location.href).href,
      print(line) {
        // Qemu.js also writes JIT startup diagnostics to stdout before the guest starts.
        if (line === 'BOOT_START') bootStarted = true;
        if (bootStarted || line === 'BOOT_END') self.postMessage({ type: 'serial', line });
      },
      printErr: (message) => self.postMessage({ type: 'diagnostic', message }),
      onAbort: (reason) => self.postMessage({ type: 'error', message: String(reason) }),
      onRuntimeInitialized() {
        self.window = self; // The port's TCG table uses the Window global.
        FS.writeFile('/firmware.rom', rom);
        Module.callMain([
          '-machine', 'pc', '-m', '32', '-display', 'none', '-vga', 'none',
          '-serial', 'stdio', '-monitor', 'none', '-net', 'none',
          '-bios', '/firmware.rom',
        ]);
      },
    };
    importScripts('qemu-system-i386.js');
  } catch (error) {
    self.postMessage({ type: 'error', message: error.message });
  }
}, { once: true });

async function readAsset(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Could not load ${path} (HTTP ${response.status}).`);
  return new Uint8Array(await response.arrayBuffer());
}
