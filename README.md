# Laufwelt 走る世界

Lauf-Tracker, so simpel wie eine normale Running-App – aber jeder Kilometer lässt deine eigene japanische Voxel-Insel wachsen.

## So funktioniert's

- **Laufen**: Start → Pause/Weiter → Beenden. Danach Zusammenfassung mit Route, Zeit und Pace; Speichern oder Verwerfen.
  Pro km gibt es 10 ⚡. Läufe mit Ø über 22 km/h werden nicht gewertet (Rad/Auto/GPS-Fehler).
- **Welt**: Mit Energie Land gewinnen (jedes Stück wird teurer) und bauen: Weg, Bambus, Sakura, Laterne, Kiefer,
  Reisfeld, Koi-Teich, Torii, Teehaus, Pagode – und die Burg erst nach einem Marathon (42,2 km).
- **Welten**: Insel zum Start, **Stadt** ab 50 km (Straßen, Wohnhaus, Konbini, Ramen-Laden, Bahnhof, Hochhaus …),
  **Berg** ab 150 km (Schneekiefer, Jizo, Onsen, Bergtempel). Energie ist gemeinsam, oben im Welt-Tab wechselst du.
- **Bewohner**: Jedes Gebäude hat einen Bewohner mit einer Lauf-Challenge (z. B. Teehaus → „Lauf 2 km am Stück“ →
  Teemeisterin Hana zieht ein). Jeder passende Lauf zählt automatisch. Die Bewohner leben nach echter Uhrzeit:
  morgens spazieren, tagsüber arbeiten, abends treffen, nachts schlafen (der Nachtwächter umgekehrt).
  Tippe auf eine Figur, um zu sehen, was sie gerade macht. Übersicht: 住-Knopf in der Welt.
  Tagsüber sind sie ständig unterwegs; nachts schlafen sie im Haus und über dem Dach steigen „z z z“ auf.
- **Himmel**: Sonnenaufgang, Tag, Sonnenuntergang und Nacht mit Mond und Sternen nach echter Uhrzeit;
  nachts wird die Welt dunkler und Fenster und Laternen leuchten.
- **Karte**: mit zwei Fingern zoomen, mit einem Finger verschieben, oder die Knöpfe ＋ / － / ◎ (im Browser auch Mausrad).
- **Streaks**: Eine Woche zählt ab 2 Läufen (je mind. 1 km). Jede Woche in Folge gibt +10 % Energie (max. +50 %),
  und bei 1, 2, 4, 8, 12, 26 und 52 Wochen gibt es seltene Sammelobjekte, die man nicht kaufen kann:
  Glocke, Koinobori, Steingarten, Winkekatze, Fuji, Gold-Torii, Gold-Pagode.
- **Verlauf**: Level, Kilometer pro Woche, alle Läufe mit Routen-Skizze.

## Als Web-App aufs iPhone (kostenlos)

Bei jedem Push auf `main` baut GitHub die Web-Version und veröffentlicht sie auf GitHub Pages
(`.github/workflows/pages.yml`). Einmalig im Repo: **Settings → Pages → Source: GitHub Actions**.

Danach auf dem iPhone `https://<dein-name>.github.io/<repo>/` in Safari öffnen → Teilen → **Zum Home-Bildschirm**.
Während eines Laufs bleibt der Bildschirm an, denn im Browser misst GPS nur, solange die App offen ist.
Spielstand und Läufe liegen nur auf dem Gerät.

Lokal bauen: `BASE_URL=/laufwelt npm run build:web` → Ordner `dist/`.

## Online-Backup mit Supabase (kostenlos)

Ohne Supabase läuft alles nur lokal. Mit Supabase werden Läufe, Welt und Streaks nach jeder Änderung
gesichert und zwischen Geräten abgeglichen (Läufe gehen dabei nie verloren; bei Welt/Energie gewinnt der neueste Stand).

1. Auf [supabase.com](https://supabase.com) ein kostenloses Projekt anlegen.
2. Im Dashboard **SQL Editor → New query**, Inhalt von `supabase/schema.sql` einfügen, **Run**.
3. **Project Settings → API**: *Project URL* und *anon public key* kopieren
   (nie den `service_role`-Key verwenden).
4. Im GitHub-Repo **Settings → Secrets and variables → Actions → Variables**:
   `SUPABASE_URL` und `SUPABASE_ANON_KEY` anlegen, dann den Workflow neu laufen lassen.
   Lokal stattdessen `.env.example` nach `.env.local` kopieren und ausfüllen.
5. In der App: **Verlauf → Backup** → Konto erstellen.

Hinweis: Supabase pausiert kostenlose Projekte nach ca. einer Woche ohne Nutzung; im Dashboard per Klick wieder starten.
Bis dahin speichert die App lokal weiter und sichert nach, sobald die Verbindung wieder da ist.

## Entwicklermodus (Spielwiese)

Im **Verlauf** ganz unten **5× auf die Versionszeile tippen** → „Spielwiese öffnen“.
Die Spielwiese ist ein eigener Spielstand mit allem freigeschaltet (alle Welten fertig gebaut, alle Bewohner,
alle Sammelobjekte, 99.999 ⚡, Testlauf-Buttons). Sie wird nie mit Supabase gesichert; der echte Spielstand bleibt unverändert.
Über den Knopf „開発 Spielwiese“ über der Tab-Leiste: Uhrzeit der Bewohner umstellen, Spielwiese zurücksetzen, zurück zum echten Spielstand.

## Tests

`npm test` prüft Streak-Regeln, Challenges, den Tagesablauf der Bewohner und das Zusammenführen von Spielständen.

## Mit Expo Go starten

1. Auf dem Handy die App **Expo Go** installieren (App Store / Play Store).
2. Am Computer (Node.js ≥ 20 nötig):
   ```bash
   npm install
   npx expo start
   ```
3. QR-Code scannen – iPhone mit der Kamera-App, Android direkt in Expo Go.
   Handy und Computer müssen im selben WLAN sein (sonst `npx expo start --tunnel`).

In Expo Go misst die App nur, solange sie geöffnet ist. Für Tracking bei gesperrtem Bildschirm
braucht es einen eigenen Build (z. B. `npx eas-cli@latest build --profile development --platform android`).
Im Dev-Modus gibt es auf dem Lauf-Tab Buttons für Testläufe.

## Aufbau

| Pfad | Inhalt |
| --- | --- |
| `src/app/` | Screens (Expo Router Tabs): Welt, Laufen, Verlauf |
| `src/world/voxels.ts` | Voxel-Engine: Gitter, isometrische Projektion, Mesh für Skia |
| `src/world/models*.ts` | Voxel-Modelle pro Welt, Figuren, Aufbau der Welt |
| `src/world/life.ts` | Tagesablauf und Wegfindung der Bewohner |
| `src/lib/characters.ts` | Bewohner und ihre Challenges |
| `src/components/VoxelWorld.tsx` | Zeichnet die Welt mit Skia, Tippen → Kachel |
| `src/lib/game.ts` | Spielregeln: Gegenstände, Kosten, Level, Energie, Wochenstatistik |
| `src/lib/tracker.ts` | GPS-Tracking mit Pause, Hintergrund-Task und Filtern |
| `src/lib/storage.ts` | Speicherung in AsyncStorage |
| `src/lib/sync.ts`, `src/lib/cloud.ts` | Zusammenführen von Spielständen, Supabase-Anbindung |
| `src/state/CloudProvider.tsx` | Anmeldung und automatischer Sync |
| `src/state/GameProvider.tsx` | Spielzustand und Aktionen |
