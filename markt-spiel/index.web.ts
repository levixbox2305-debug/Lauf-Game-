import { LoadSkiaWeb } from '@shopify/react-native-skia/lib/module/web';

// Skia needs its WebAssembly build before any screen renders, so the router starts afterwards.
// Without a base path the file is looked up next to the page, so the build also works from any folder.
const base = process.env.EXPO_BASE_URL;
LoadSkiaWeb({ locateFile: () => (base ? `${base}/canvaskit.wasm` : 'canvaskit.wasm') }).then(() => {
  require('expo-router/entry');
});
