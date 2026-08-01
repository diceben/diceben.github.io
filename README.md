# diceben.github.io

Portfolio site — a typed sheet of paper listing the tools and projects I build.
Live at **https://diceben.github.io/**

Static HTML, built by a dependency-free Node script. No framework, no npm
packages, no external requests: the fonts are self-hosted and there is no
analytics of any kind.

## Adding a project

Edit `data/projects.json`. That is the whole job — the HTML is generated.

Any public repo of mine tagged with the GitHub topic **`portfolio`** is picked up
automatically by a daily workflow, so in practice a new project only needs its
topic set.

Hand-written text goes into an entry's `overrides` object, which the sync never
touches.

## Commands

```bash
node --test                            # run the tests
node scripts/build.mjs                 # build into dist/
python3 -m http.server 8000 -d dist    # preview at localhost:8000
node scripts/sync-projects.mjs         # pull tagged repos into projects.json
```

## Layout

| Path | What it is |
| --- | --- |
| `data/site.json` | Name, tagline, about text, contact, imprint |
| `data/projects.json` | The project list — the only file you edit to add one |
| `src/templates/` | Page templates |
| `src/styles/typewriter.css` | The entire design; tokens at the top |
| `src/assets/` | Courier Prime (OFL), favicon, theme toggle |
| `scripts/` | Build, sync, and their tests |

Deployment runs on push to `main` via GitHub Actions.

## License

Code is MIT. Courier Prime is licensed under the SIL Open Font License 1.1, see
`src/assets/fonts/OFL.txt`.
