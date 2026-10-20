// Finishes the web export so the app can be installed on a phone's home screen.
// Usage: BASE_URL=/laufwelt node scripts/postexport-web.js dist
const fs = require('fs');
const path = require('path');

const dist = process.argv[2] || 'dist';
const base = process.env.BASE_URL || '';
const indexPath = path.join(dist, 'index.html');

let html = fs.readFileSync(indexPath, 'utf8');

// viewport-fit=cover makes the safe-area insets (notch, home indicator) available to the layout.
html = html.replace(
  /<meta name="viewport"[^>]*>/,
  '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />',
);
html = html.replace('<html lang="en">', '<html lang="de">');

const head = [
  '<meta name="apple-mobile-web-app-capable" content="yes" />',
  '<meta name="mobile-web-app-capable" content="yes" />',
  '<meta name="apple-mobile-web-app-status-bar-style" content="default" />',
  '<meta name="apple-mobile-web-app-title" content="Laufwelt" />',
  '<meta name="theme-color" content="#F3EBDD" />',
  `<link rel="apple-touch-icon" href="${base}/apple-touch-icon.png" />`,
  `<link rel="manifest" href="${base}/manifest.webmanifest" />`,
  '<style>html, body { background: #F3EBDD; }</style>',
].join('\n    ');
html = html.replace('</head>', `    ${head}\n  </head>`);
fs.writeFileSync(indexPath, html);

const manifest = {
  name: 'Laufwelt',
  short_name: 'Laufwelt',
  lang: 'de',
  start_url: `${base}/`,
  scope: `${base}/`,
  display: 'standalone',
  orientation: 'portrait',
  background_color: '#F3EBDD',
  theme_color: '#F3EBDD',
  icons: [
    { src: `${base}/icon-192.png`, sizes: '192x192', type: 'image/png' },
    { src: `${base}/icon-512.png`, sizes: '512x512', type: 'image/png' },
  ],
};
fs.writeFileSync(path.join(dist, 'manifest.webmanifest'), JSON.stringify(manifest, null, 2));

// GitHub Pages has no SPA fallback; serving the app as 404.html makes deep links like /run work.
fs.copyFileSync(indexPath, path.join(dist, '404.html'));
// Without this file GitHub Pages runs Jekyll, which drops folders starting with "_" such as _expo.
fs.writeFileSync(path.join(dist, '.nojekyll'), '');

console.log(`Web-App fertig in ${dist} (Basis-Pfad: ${base || '/'})`);
