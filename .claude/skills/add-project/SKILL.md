---
name: add-project
description: Trägt ein bestehendes GitHub-Repo als Projekt auf diceben.github.io ein. Diesen Skill sofort verwenden, wenn Ben `/add-project` tippt, sagt "trag das Projekt ein", "das soll auf die Seite", "füg mein Repo zum Portfolio hinzu" oder ein Repo nennt, das gelistet werden soll. Fragt die fehlenden Angaben ab, schreibt den Eintrag nach data/projects.json, baut die Seite und pusht.
---

# Projekt ins Portfolio eintragen

Ziel: ein Eintrag in `data/projects.json`, der auf https://diceben.github.io/ erscheint.
Lies vorher `CLAUDE.md` im Repo-Root — besonders die Merge-Regel.

## 1. Klären, welcher Weg richtig ist

Frage Ben, um welches Repo es geht, und prüfe:

- **Repo ist öffentlich und gehört `diceben`?** Dann ist der beste Weg das Topic
  `portfolio` auf dem Repo zu setzen — dann pflegt der Sync den Eintrag von
  selbst weiter. Setze es mit `mcp__github__` (Repo-Topics aktualisieren) und
  lege den Eintrag zusätzlich sofort an, damit die Seite nicht bis zum nächsten
  Cron-Lauf wartet. `source` bleibt dabei `"sync"`.
- **Repo ist privat, gehört jemand anderem, oder es ist gar kein Repo?**
  Dann ein Eintrag mit `"source": "manual"` — den fasst der Sync nie an.

## 2. Angaben einsammeln

Hole dir so viel wie möglich selbst über `mcp__github__get_file_contents`
(README lesen) und die Repo-Metadaten, statt Ben Fragen zu stellen, die du
beantworten kannst. Frage nur nach, was wirklich fehlt:

| Feld | Bedeutung | Woher |
|---|---|---|
| `repo` | `diceben/name` | von Ben / GitHub |
| `name` | Anzeigename | aus dem Repo-Namen ableiten, von Ben bestätigen lassen |
| `tagline` | **eine** Zeile Englisch, max ~90 Zeichen | Repo-Description oder README-Anfang |
| `tags` | 1–4 kleingeschriebene Stichwörter | Sprache + Topics |
| `url` | Live-Demo/Doku, optional | Repo-Homepage |
| `status` | `active` oder `archived` | Repo-Status |
| `pushedAt` | `YYYY-MM-DD` | letzter Push |
| `featured` | `true` hebt es nach oben | nur fragen, wenn es ein Aushängeschild ist |

Die `tagline` ist das Einzige, was Besucher wirklich lesen. Sie sagt, **was das
Ding tut**, nicht wie es gebaut ist. Schlecht: "A Python tool using Click."
Gut: "Turns a topic list into a print-ready exam PDF."

Schreib sie auf Englisch und leg sie Ben vor, bevor du committest.

## 3. Eintrag schreiben

In `data/projects.json` in das Array `projects` einfügen. Reihenfolge egal — der
Build sortiert (`featured` zuerst, dann `pushedAt` absteigend).

Wenn ein Eintrag zu dem Repo schon existiert: **nicht** das Basisfeld ändern,
sondern in `overrides` schreiben. Sonst überschreibt der nächste Sync die Arbeit.

## 4. Prüfen und pushen

```bash
node --test
node scripts/build.mjs
```

Beides muss grün sein. Danach den gerenderten Eintrag kurz gegenlesen
(`dist/index.html`) und Ben zeigen, wie die Zeile aussehen wird.

Dann committen — auf einem `claude/*`-Branch, nicht direkt auf `main`:

```bash
git checkout -b claude/add-<slug>
git add data/projects.json
git commit -m "content: add <name> to the project list"
git push -u origin claude/add-<slug>
```

Frag Ben, ob du einen Pull Request aufmachen sollst. Nach dem Merge nach `main`
deployt GitHub Actions automatisch; ein bis zwei Minuten später steht es live.
