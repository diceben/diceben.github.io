# diceben.github.io — Portfolio

Statische Portfolio-Seite von Ben (GitHub: `diceben`), live auf https://diceben.github.io/.
Sprache der Website: **Englisch**. Sprache im Gespräch mit Ben: **Deutsch**.

## Die eine Regel

**Um ein Projekt hinzuzufügen, wird `data/projects.json` bearbeitet — niemals HTML.**
Das HTML in `dist/` ist generiert und gehört nicht ins Repo.

## Aufbau

```
data/site.json          Name, Tagline, About-Text, Kontakt, Impressum
data/projects.json      Projektliste — die einzige Datei für neue Projekte
src/templates/*.html    Seitengerüst, {{platzhalter}}
src/styles/typewriter.css   Das gesamte Design, Tokens ganz oben
src/assets/             Courier-Prime-Fonts (OFL), favicon.svg, theme.js
scripts/build.mjs       data + templates -> dist/
scripts/sync-projects.mjs   GitHub-Topic "portfolio" -> data/projects.json
scripts/*.test.mjs      Tests (node:test, keine Abhängigkeiten)
```

Keine npm-Abhängigkeiten, kein Framework, nur Node-Builtins. **Das bleibt so.**
Wenn etwas ein Paket zu brauchen scheint: erst mit Ben reden.

## Befehle

```bash
node --test                 # Tests (26 Stück, laufen in ~1s)
node scripts/build.mjs      # baut nach dist/
python3 -m http.server 8000 -d dist   # lokal ansehen
node scripts/sync-projects.mjs        # Projektliste von GitHub holen
```

Nach jeder Änderung: **erst `node --test`, dann `node scripts/build.mjs`.**
Der Build wirft bei einem Tippfehler im Template einen Fehler, statt eine kaputte
Seite zu erzeugen — das ist Absicht.

## Ein Projekt hinzufügen

Es gibt zwei Wege, beide enden in `data/projects.json`:

1. **`/add-project`** — trägt ein bestehendes Repo von Hand ein (`source: "manual"`).
2. **`/new-project`** — legt ein neues GitHub-Repo an, setzt das Topic `portfolio`
   und trägt es ein.

Automatisch: Jedes öffentliche Repo von `diceben` mit dem Topic **`portfolio`**
landet spätestens am nächsten Tag über `sync-projects.yml` auf der Seite.

### Das Datenmodell

```json
{
  "slug": "beispiel-tool",
  "repo": "diceben/beispiel-tool",
  "name": "Beispiel Tool",
  "tagline": "Eine Zeile, maximal ~90 Zeichen, auf Englisch.",
  "tags": ["python", "cli"],
  "url": "https://…",
  "status": "active",
  "featured": false,
  "hidden": false,
  "pushedAt": "2026-08-01",
  "source": "sync",
  "overrides": { "tagline": "Von Hand geschrieben, gewinnt immer." }
}
```

**Die Merge-Regel — das Wichtigste an diesem Repo:**
`scripts/sync-projects.mjs` schreibt ausschließlich in die **Basisfelder**.
Alles in `overrides` ist handgeschrieben und wird nie angefasst. Der Build rendert
`{...basis, ...overrides}`.

Daraus folgt:
- Text von Hand verbessern → **in `overrides` schreiben**, nicht ins Basisfeld.
  Sonst überschreibt der nächste Sync ihn.
- Einträge mit `"source": "manual"` fasst der Sync komplett nicht an.
- Verliert ein Repo das Topic, wird der Eintrag `hidden: true` — nie gelöscht.
- Ein Projekt dauerhaft verstecken: `"overrides": { "hidden": true }`.

Sortierung: `featured` zuerst, danach `pushedAt` absteigend. Reihenfolge nicht
von Hand in der Datei umsortieren — das macht der Sync wieder rückgängig.

**Grenze:** Der Sync sieht nur **öffentliche** Repos. Private Projekte müssen mit
`source: "manual"` eingetragen werden.

## Design-Regeln

- Look: saubere Schreibmaschinenseite. Courier Prime, Papierweiß, feine Körnung.
- **Alle Farben und Maße sind Tokens in `:root`** in `src/styles/typewriter.css`.
  Niemals Farben hart in Regeln oder gar inline schreiben.
- Zwei Themes: `paper` (hell) und `carbon` (dunkel). Jede neue Farbe braucht
  **beide** Werte, sonst bricht der Dark Mode.
- Die Seite muss **ohne JavaScript vollständig funktionieren**. `theme.js` ist der
  einzige Skriptcode und darf nur den Umschalter hinzufügen.
- **Keine externen Requests.** Keine CDNs, keine Google Fonts, kein Analytics.
  Fonts liegen selbst gehostet in `src/assets/fonts/`.
- Kontrast in beiden Themes mindestens 7:1, sichtbare Fokusringe, und alles muss
  `prefers-reduced-motion` respektieren.

## Platzhalter und Entscheidungen

Der `isSet()`-Mechanismus im Build behandelt `"TODO"` wie leer. Ein Feld auf
`"TODO"` zu setzen ist also der saubere Weg, etwas bewusst offen zu lassen — die
zugehörige Zeile verschwindet dann einfach von der Seite.

Getroffene Entscheidungen, nicht eigenmächtig ändern:

- **`email`** — `deissben@gmail.com`, von Ben ausdrücklich freigegeben. Wird als
  HTML-Entities ausgegeben, steht nirgends im Klartext.
- **`impressum`** — Name `Ben Dice`, **bewusst ohne Postadresse** (Ben:
  „keine Adresse angeben"). Die Vollständigkeitsprüfung
  (`impressumComplete()`) verlangt deshalb nur Name und E-Mail. Seite ist
  freigeschaltet, verlinkt und in der Sitemap.
- **`LICENSE`** — die Copyright-Zeile nennt noch den GitHub-Handle. Kann auf
  „Ben Dice" umgestellt werden.

Nichts erfinden, was hier nicht steht. Nachfragen.

## Git

- Entwicklung auf `claude/*`-Branches, dann Pull Request nach `main`.
- Push auf `main` deployt automatisch (`.github/workflows/deploy.yml`).
- `dist/` ist gitignored und wird nie committet.

## Bekannte Eigenheit der Sandbox

In Claude-Code-Sessions ist `api.github.com` über den Proxy nicht direkt
erreichbar (401/403). `node scripts/sync-projects.mjs` schlägt dort also fehl —
das ist kein Bug. Die Merge-Logik ist vollständig durch
`scripts/sync-projects.test.mjs` abgedeckt; in GitHub Actions läuft der Sync
normal.
