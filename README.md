# Laufwelt 🏝️🏃

Lauf-Tracker, bei dem jeder Kilometer deine eigene Insel wachsen lässt.

## So funktioniert's

- **Laufen**: GPS misst Strecke, Zeit und Pace. Pro km gibt es 10 ⚡ Energie.
- **Welt**: Mit Energie Land gewinnen (jedes Stück wird teurer) und Bäume, Felder, Schafe, Häuser … bauen.
  Neue Gebäude werden über die Gesamt-km freigeschaltet – die Burg 🏰 erst nach einem Marathon (42,2 km).
- **Verlauf**: Alle Läufe und dein Level.
- Läufe mit Ø über 22 km/h werden nicht gewertet (Rad/Auto/GPS-Fehler).

## Starten

```bash
npm install
npx expo start
```

- **Expo Go** (QR-Code scannen): funktioniert, aber GPS nur bei geöffneter App.
- **Development Build** (`npx expo run:android` / `eas build --profile development`): auch Tracking im Hintergrund bei gesperrtem Bildschirm.
- Im Dev-Modus gibt es auf dem Lauf-Tab einen Button „Testlauf simulieren“.

## Aufbau

| Pfad | Inhalt |
| --- | --- |
| `src/app/` | Screens (Expo Router Tabs): Welt, Laufen, Verlauf |
| `src/lib/game.ts` | Spielregeln: Gegenstände, Kosten, Level, Energie |
| `src/lib/tracker.ts` | GPS-Tracking (Hintergrund-Task + Vordergrund-Fallback) und Filter |
| `src/lib/storage.ts` | Speicherung in AsyncStorage |
| `src/components/IsoWorld.tsx` | Isometrische Insel als SVG |
| `src/state/GameProvider.tsx` | Spielzustand und Aktionen |
