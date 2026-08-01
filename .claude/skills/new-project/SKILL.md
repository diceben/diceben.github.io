---
name: new-project
description: Legt ein neues GitHub-Repo für ein Projekt von Ben an, richtet es ein und listet es auf diceben.github.io. Diesen Skill sofort verwenden, wenn Ben `/new-project` tippt, sagt "neues Projekt", "mach ein Repo dafür", "lass uns ein Tool bauen" oder ein frisch gebautes Tool dauerhaft speichern will. Erstellt das Repo, setzt Topics inklusive `portfolio`, scaffoldet README/LICENSE/CLAUDE.md und trägt es ins Portfolio ein.
---

# Neues Projekt anlegen

Ein Projekt = **ein eigenes GitHub-Repo**, das automatisch auf
https://diceben.github.io/ erscheint. Lies vorher `CLAUDE.md` im Repo-Root.

## 1. Eckdaten klären

Frage Ben — kurz, in einem Rutsch, nicht einzeln:

- **Name des Repos** (kleingeschrieben, mit Bindestrichen, z. B. `exam-builder`)
- **Was macht es?** Eine Zeile. Wird zur Repo-Description *und* zur Tagline.
- **Öffentlich oder privat?** Nur öffentliche Repos kann der Sync sehen.
  Bei privat: Hinweis geben, dass der Eintrag dann `source: "manual"` braucht.
- **Sprache/Stack** (Python, Node, Shell, …) — bestimmt `.gitignore` und README.

Schlag einen Namen vor, wenn Ben keinen hat. Frag nicht nach Dingen, die du
ableiten kannst.

## 2. Repo anlegen

Mit `mcp__github__create_repository`:

- `name`, `description` (der Einzeiler), `private` nach Absprache
- `autoInit: true`

Danach die **Topics** setzen — ohne das Topic `portfolio` taucht das Projekt nie
automatisch auf der Seite auf:

```
portfolio, <sprache>, <1-2 sachliche stichwörter>
```

Und `homepage` setzen, falls es eine Live-Seite oder Doku gibt.

> Wenn `create_repository` an fehlenden Rechten scheitert: Bens GitHub-Verbindung
> in der Claude-App braucht Zugriff auf **alle** Repos, nicht nur ausgewählte.
> Das kann nur Ben in den GitHub-Einstellungen ändern — sag ihm das konkret,
> statt es zu umgehen.

## 3. Grundgerüst hineinlegen

Mit `mcp__github__push_files` in einem Commit:

- **`README.md`** — Titel, der Einzeiler, "Install", "Usage", "License".
  Kein Marketing, keine Emoji-Tabellen. Der erste Absatz muss jemandem, der das
  Repo zufällig findet, in zehn Sekunden erklären, wofür es gut ist.
- **`LICENSE`** — MIT auf "Ben", aktuelles Jahr, sofern Ben nichts anderes sagt.
- **`.gitignore`** — passend zum Stack.
- **`CLAUDE.md`** — kurz: was das Projekt ist, wie man es startet, wie man es
  testet. Drei Sätze reichen; er wächst mit dem Projekt.

Wenn in dieser Session schon Code entstanden ist, kommt der natürlich mit ins
Repo statt eines leeren Gerüsts.

## 4. Ins Portfolio eintragen

Jetzt in **diesem** Repo (`diceben.github.io`) den Eintrag anlegen — dafür den
Ablauf aus `/add-project` verwenden, Schritt 3 und 4. Kurzfassung:

```bash
node --test && node scripts/build.mjs
```

Eintrag nach `data/projects.json`, `source: "sync"` (das Topic ist ja gesetzt),
`pushedAt` auf heute. Dann Branch, Commit, Push, und Ben fragen, ob ein Pull
Request aufgemacht werden soll.

## 5. Ben zeigen, was passiert ist

Am Ende in zwei, drei Zeilen:

- Link zum neuen Repo
- wie die Zeile auf der Portfolio-Seite aussehen wird
- was noch offen ist (z. B. "README hat noch keinen Usage-Abschnitt")

Und der Hinweis, dass das Projekt ab jetzt von allein aktuell bleibt: solange das
Topic `portfolio` gesetzt ist, aktualisiert der tägliche Sync Beschreibung, Tags
und Datum automatisch.
