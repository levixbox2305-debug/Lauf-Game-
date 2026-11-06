// Skia on web needs its WebAssembly file served from the site root.
const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'node_modules', 'canvaskit-wasm', 'bin', 'full', 'canvaskit.wasm');
const dest = path.join(__dirname, '..', 'public', 'canvaskit.wasm');
if (fs.existsSync(src)) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}
