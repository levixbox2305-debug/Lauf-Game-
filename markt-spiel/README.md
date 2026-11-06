# Markt-Held

Ein eigenständiges 2D-Retro-Rollenspiel im Stil alter Handheld-Spiele: Du fängst als Azubi in einem großen
Supermarkt an und arbeitest dich bis zur Marktleitung hoch. Hat nichts mit der Laufwelt-App zu tun, sondern ist eine eigene Expo-App mit eigenem Spielstand.

## Starten

```bash
cd markt-spiel
npm install
npx expo start        # QR-Code mit Expo Go scannen, oder "w" für den Browser
```

## Spielen

- **Steuerung**: Steuerkreuz laufen (tippen = drehen, halten = gehen), **A** sprechen/benutzen, **B** halten = rennen,
  **MENÜ** = Quests, Shop, Tasche, Orden, Profil. Im Browser: Pfeiltasten/WASD, Leertaste/Enter = A, Shift = B, M = Menü.
- **Aufgaben**: Kisten im Lager holen und leere Regalplätze (gelbes Preisschild) auffüllen, Pfützen wischen,
  Kund:innen mit „?“ die richtige Abteilung nennen, an der Kasse das Rückgeld ausrechnen, MHD-Kontrolle am Kühl-/Tiefkühlregal („!“),
  Pfandautomat leeren, wenn er voll ist. Kasse, Fragen und MHD laufen als kleine Duelle mit Geduldsbalken – schnelle Antworten geben mehr.
- **Hauptgeschichte**: 12 Schritte mit Marktleiterin Frau Berger, vom ersten Arbeitstag bis zur Schichtleitung.
- **Tages- und Wochenquests**: jeden Tag 3 neue, jeden Montag 3 neue, plus Bonus, wenn alle abgeholt sind.
- **Item-Shop** (Automat im Pausenraum oder Menü): täglich wechselnde Tagesangebote mit Rabatt, ein seltenes Wochen-Highlight
  und das feste Sortiment (Rollwagen/Hubwagen, Turnschuhe, Pager, Profi-Scanner, Gold-Namensschild, Kaffee, Müsliriegel, Glückskeks).
- **Fortschritt**: Level und Ränge (Azubi → … → Supermarkt-Legende), 8 Orden, Tagesbonus mit Streak.

Der Name des Markts steht an einer Stelle: `STORE_NAME` in `src/market/data.ts`.

## Aufbau

| Pfad | Inhalt |
| --- | --- |
| `src/app/index.tsx` | Spielbildschirm: Steuerung, Dialoge, Aufgaben |
| `src/market/map.ts` | Die Karte als Text, Mitarbeitende, Kassen |
| `src/market/logic.ts` | Regeln: Spielstand, Level, Quests, Shop, Story |
| `src/market/world.ts` | Der lebende Markt: leere Regale, Pfützen, Kundschaft, Rätsel |
| `src/market/engine.ts` | Bewegung auf dem Raster |
| `src/market/sprites.ts`, `draw.ts` | Pixel-Art und Zeichnen mit Skia |
| `src/components/market/` | Spielfeld, Steuerkreuz, Dialogbox, Duell-Bildschirm, Menü |

## Prüfen

```bash
npm test            # Regeln, Karte, Quests, Shop
npx tsc --noEmit
npx expo lint
```

Web-Build: `BASE_URL=/markt-held npm run build:web` → Ordner `dist/`.
