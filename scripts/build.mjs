#!/usr/bin/env node
/**
 * build.mjs — turns data/*.json + src/templates/* into a static site in dist/.
 *
 * No dependencies, on purpose: node builtins only. Run it with `node scripts/build.mjs`.
 * Nothing here should ever need editing to add a project — that is what
 * data/projects.json is for.
 */

import { readFile, writeFile, mkdir, rm, cp } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "src");
const DIST = path.join(ROOT, "dist");

/* --- helpers -------------------------------------------------------------- */

const ESCAPES = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/** Escape anything that comes from a data file before it touches HTML. */
export function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ESCAPES[c]);
}

/** A value counts as "filled in" when it is a non-empty string that is not a TODO marker. */
export function isSet(value) {
  if (value === null || value === undefined) return false;
  const s = String(value).trim();
  return s !== "" && s.toUpperCase() !== "TODO";
}

/** Numeric HTML entities — keeps the address readable to browsers, less so to scrapers. */
export function entities(text) {
  return [...String(text)].map((ch) => `&#${ch.codePointAt(0)};`).join("");
}

/**
 * Minimal template engine: {{#if key}}…{{/if}}, {{{raw}}}, {{escaped}}.
 * Unknown placeholders throw, so a typo fails the build instead of the page.
 */
export function render(template, data) {
  let out = template;

  let previous;
  do {
    previous = out;
    out = out.replace(
      /\{\{#if\s+([\w.]+)\s*\}\}([\s\S]*?)\{\{\/if\}\}/g,
      (_, key, body) => (isSet(data[key]) || data[key] === true ? body : ""),
    );
  } while (out !== previous);

  out = out.replace(/\{\{\{\s*([\w.]+)\s*\}\}\}/g, (_, key) => {
    if (!(key in data)) throw new Error(`Unknown template key: {{{${key}}}}`);
    return data[key] ?? "";
  });

  out = out.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key) => {
    if (!(key in data)) throw new Error(`Unknown template key: {{${key}}}`);
    return esc(data[key]);
  });

  return out;
}

async function readJson(file) {
  return JSON.parse(await readFile(path.join(ROOT, file), "utf8"));
}

async function readTemplate(name) {
  return readFile(path.join(SRC, "templates", name), "utf8");
}

async function emit(relativePath, contents) {
  const target = path.join(DIST, relativePath);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, contents, "utf8");
  return relativePath;
}

/* --- projects ------------------------------------------------------------- */

/** Hand-written `overrides` always beat whatever the sync wrote into the base fields. */
export function effective(entry) {
  return { ...entry, ...(entry.overrides ?? {}) };
}

function sortProjects(a, b) {
  if (Boolean(a.featured) !== Boolean(b.featured)) return a.featured ? -1 : 1;
  const byDate = String(b.pushedAt ?? "").localeCompare(String(a.pushedAt ?? ""));
  if (byDate !== 0) return byDate;
  return String(a.name ?? "").localeCompare(String(b.name ?? ""));
}

export function renderProject(template, project) {
  const repoUrl = isSet(project.repo)
    ? `https://github.com/${project.repo}`
    : null;
  const name = isSet(project.name)
    ? project.name
    : String(project.repo ?? project.slug ?? "untitled").split("/").pop();

  const links = [];
  if (repoUrl) links.push(`<a href="${esc(repoUrl)}">&rarr; repo</a>`);
  if (isSet(project.url))
    links.push(`<a href="${esc(project.url)}">&rarr; live</a>`);
  if (links.length === 0) links.push('<span class="empty">no public link</span>');

  const tags = Array.isArray(project.tags) ? project.tags.filter(isSet) : [];

  return render(template, {
    nameHtml: repoUrl
      ? `<a href="${esc(repoUrl)}">${esc(name)}</a>`
      : esc(name),
    status:
      isSet(project.status) && project.status !== "active" ? project.status : "",
    year: isSet(project.pushedAt) ? String(project.pushedAt).slice(0, 4) : "",
    tagline: isSet(project.tagline) ? project.tagline : "",
    tagsHtml: tags.map((t) => `<li>${esc(t)}</li>`).join(""),
    linksHtml: links.join(" "),
  });
}

/* --- pages ---------------------------------------------------------------- */

export async function build() {
  const site = await readJson("data/site.json");
  const projectData = await readJson("data/projects.json");

  const layout = await readTemplate("layout.html");
  const host = new URL(site.url).host;
  const repoUrl = `https://github.com/${site.handle}/${host}`;
  const impressumComplete =
    isSet(site.impressum?.name) &&
    isSet(site.impressum?.email) &&
    (site.impressum?.address ?? []).some(isSet);
  const showImpressum = site.impressum?.enabled === true && impressumComplete;

  /** Wraps page content in the shared shell. */
  function page({ title, description, canonicalPath, content, headExtra = "" }) {
    return render(layout, {
      pageTitle: title,
      pageDescription: description,
      canonical: site.url + canonicalPath,
      siteName: site.name,
      host,
      tagline: site.tagline,
      repoUrl,
      headExtra,
      impressumLink: showImpressum
        ? '<a href="/impressum/">impressum</a>'
        : "",
      content,
    });
  }

  const written = [];

  /* index ------------------------------------------------------------------ */

  const projectTemplate = await readTemplate("project.html");
  const projects = (projectData.projects ?? [])
    .map(effective)
    .filter((p) => p.hidden !== true)
    .sort(sortProjects);

  const projectList =
    projects.length > 0
      ? `  <ol class="projects">\n${projects
          .map((p) => renderProject(projectTemplate, p))
          .join("")}  </ol>`
      : '  <p class="empty">Nothing published yet — first entries coming soon.</p>';

  const contact = [
    ...(site.links ?? []).map(
      (link) =>
        `    <li><span class="contact__label">${esc(link.label)}</span>` +
        `<a href="${esc(link.url)}">${esc(link.url.replace(/^https?:\/\//, ""))}</a></li>`,
    ),
    isSet(site.email)
      ? `    <li><span class="contact__label">email</span>` +
        `<a href="mailto:${entities(site.email)}">${entities(site.email)}</a></li>`
      : "",
    isSet(site.location)
      ? `    <li><span class="contact__label">where</span>${esc(site.location)}</li>`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  written.push(
    await emit(
      "index.html",
      page({
        title: site.title,
        description: site.description,
        canonicalPath: "/",
        content: render(await readTemplate("index.html"), {
          aboutParagraphs: (site.about ?? [])
            .map((p) => `  <p>${esc(p)}</p>`)
            .join("\n"),
          projectList,
          contactItems: contact,
        }),
      }),
    ),
  );

  /* impressum -------------------------------------------------------------- */

  const imprint = site.impressum ?? {};
  const filledAddress = [imprint.name, ...(imprint.address ?? [])].filter(isSet);
  const addressLines =
    filledAddress.length > 0
      ? filledAddress.map(esc).join("<br />\n")
      : '<span class="todo">TODO</span> name and address';

  written.push(
    await emit(
      "impressum/index.html",
      page({
        title: `Impressum — ${site.name}`,
        description: `Impressum for ${host}.`,
        canonicalPath: "/impressum/",
        headExtra: showImpressum
          ? ""
          : '    <meta name="robots" content="noindex" />',
        content: render(await readTemplate("impressum.html"), {
          incomplete: !impressumComplete,
          addressLines,
          contactLine: isSet(imprint.email)
            ? `  <p>Email: <a href="mailto:${entities(imprint.email)}">${entities(imprint.email)}</a></p>`
            : '  <p>Email: <span class="todo">TODO</span></p>',
          note: isSet(imprint.note) ? imprint.note : "",
        }),
      }),
    ),
  );

  /* 404 -------------------------------------------------------------------- */

  written.push(
    await emit(
      "404.html",
      page({
        title: `404 — ${site.name}`,
        description: "Page not found.",
        canonicalPath: "/404.html",
        headExtra: '    <meta name="robots" content="noindex" />',
        content: await readTemplate("404.html"),
      }),
    ),
  );

  /* assets and machine-readable extras -------------------------------------- */

  await cp(path.join(SRC, "assets"), path.join(DIST, "assets"), {
    recursive: true,
  });
  await cp(
    path.join(SRC, "styles", "typewriter.css"),
    path.join(DIST, "assets", "typewriter.css"),
  );

  const urls = [site.url + "/", ...(showImpressum ? [site.url + "/impressum/"] : [])];
  written.push(
    await emit(
      "sitemap.xml",
      `<?xml version="1.0" encoding="UTF-8"?>\n` +
        `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
        urls.map((u) => `  <url><loc>${esc(u)}</loc></url>`).join("\n") +
        `\n</urlset>\n`,
    ),
  );
  written.push(
    await emit(
      "robots.txt",
      `User-agent: *\nAllow: /\n\nSitemap: ${site.url}/sitemap.xml\n`,
    ),
  );
  // Belt and braces: Pages must never run this through Jekyll.
  written.push(await emit(".nojekyll", ""));

  return { written, projects: projects.length, showImpressum };
}

/* --- cli ------------------------------------------------------------------ */

async function main() {
  await rm(DIST, { recursive: true, force: true });
  const result = await build();

  console.log(`Built ${result.written.length} files into dist/`);
  console.log(`  projects listed: ${result.projects}`);
  if (!result.showImpressum) {
    console.log(
      "  note: impressum is incomplete or disabled — page built but not linked",
    );
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  await main();
}
