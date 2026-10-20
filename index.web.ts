import { LoadSkiaWeb } from '@shopify/react-native-skia/lib/module/web';

// Skia needs its WebAssembly build before any screen renders, so the router starts afterwards.
LoadSkiaWeb({ locateFile: () => `${process.env.EXPO_BASE_URL ?? ''}/canvaskit.wasm` }).then(() => {
  require('expo-router/entry');
});
