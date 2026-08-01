#!/usr/bin/env node
/**
 * sync-projects.mjs — fills data/projects.json from GitHub.
 *
 * Every public repo carrying the topic "portfolio" becomes an entry. Run it with
 * `node scripts/sync-projects.mjs`; set GITHUB_TOKEN to lift the anonymous API
 * rate limit (the workflow does).
 *
 * The one rule that matters: this script only ever writes an entry's *base*
 * fields. Anything inside `overrides` is hand-written and is never touched, and
 * entries with `"source": "manual"` are left completely alone.
 *
 * The merge is exported and covered by scripts/sync-projects.test.mjs, so it can
 * be changed with confidence and without hitting the network.
 */

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA_FILE = path.join(ROOT, "data", "projects.json");

export const OWNER = "diceben";
export const TOPIC = "portfolio";
/** The portfolio repo itself never lists itself. */
const SELF = `${OWNER}/${OWNER}.github.io`;
/** Topics used for bookkeeping rather than describing the project. */
const NON_DESCRIPTIVE_TOPICS = new Set([TOPIC]);

/* --- github --------------------------------------------------------------- */

export async function fetchRepos() {
  const headers = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": `${OWNER}-portfolio-sync`,
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  const repos = [];
  for (let page = 1; page <= 10; page++) {
    const url = `https://api.github.com/users/${OWNER}/repos?per_page=100&page=${page}&sort=pushed`;
    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(
        `GitHub API ${response.status} ${response.statusText} for ${url}`,
      );
    }
    const batch = await response.json();
    repos.push(...batch);
    if (batch.length < 100) break;
  }
  return repos;
}

/* --- mapping -------------------------------------------------------------- */

/** "ripgrep-notes" -> "Ripgrep Notes" */
export function titleize(slug) {
  return String(slug)
    .split(/[-_.]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/** The fields the sync owns. Everything else on an entry survives untouched. */
export function baseFieldsFrom(repo) {
  const topics = (repo.topics ?? []).filter(
    (t) => !NON_DESCRIPTIVE_TOPICS.has(t),
  );
  const tags = [...new Set([...topics, repo.language].filter(Boolean))].map(
    (t) => String(t).toLowerCase(),
  );

  return {
    slug: repo.name,
    repo: repo.full_name,
    name: titleize(repo.name),
    tagline: repo.description ?? "",
    tags,
    url: repo.homepage || "",
    status: repo.archived ? "archived" : "active",
    pushedAt: String(repo.pushed_at ?? "").slice(0, 10),
  };
}

function sortEntries(a, b) {
  if (Boolean(a.featured) !== Boolean(b.featured)) return a.featured ? -1 : 1;
  const byDate = String(b.pushedAt ?? "").localeCompare(
    String(a.pushedAt ?? ""),
  );
  if (byDate !== 0) return byDate;
  return String(a.repo ?? "").localeCompare(String(b.repo ?? ""));
}

/** Stable key order, so an unchanged sync produces a byte-identical file. */
const KEY_ORDER = [
  "slug",
  "repo",
  "name",
  "tagline",
  "tags",
  "url",
  "status",
  "featured",
  "hidden",
  "pushedAt",
  "source",
  "overrides",
];

function normalize(entry) {
  const out = {};
  for (const key of KEY_ORDER) {
    if (entry[key] !== undefined) out[key] = entry[key];
  }
  for (const key of Object.keys(entry)) {
    if (!(key in out)) out[key] = entry[key];
  }
  return out;
}

/**
 * Merge GitHub repos into the existing entries.
 * Pure: same inputs, same output, no I/O.
 */
export function mergeProjects(existing, repos) {
  const tagged = repos.filter(
    (repo) =>
      !repo.private &&
      repo.full_name !== SELF &&
      (repo.topics ?? []).includes(TOPIC),
  );

  const byRepo = new Map(existing.map((entry) => [entry.repo, entry]));
  const seen = new Set();
  let added = 0;
  let updated = 0;
  let hidden = 0;

  for (const repo of tagged) {
    seen.add(repo.full_name);
    const previous = byRepo.get(repo.full_name);

    if (previous?.source === "manual") continue; // hands off

    const merged = normalize({
      ...previous,
      ...baseFieldsFrom(repo),
      source: "sync",
      // A repo that carries the topic is meant to be visible again.
      hidden: false,
      ...(previous?.overrides ? { overrides: previous.overrides } : {}),
      ...(previous?.featured !== undefined
        ? { featured: previous.featured }
        : {}),
    });

    if (!previous) added++;
    else if (JSON.stringify(normalize(previous)) !== JSON.stringify(merged))
      updated++;

    byRepo.set(repo.full_name, merged);
  }

  // A synced repo that lost the topic gets hidden, never deleted — its curated
  // text would be gone for good, and that is not a call a cron job should make.
  for (const [repoName, entry] of byRepo) {
    if (entry.source === "sync" && !seen.has(repoName) && entry.hidden !== true) {
      byRepo.set(repoName, normalize({ ...entry, hidden: true }));
      hidden++;
    }
  }

  return {
    projects: [...byRepo.values()].sort(sortEntries).map(normalize),
    added,
    updated,
    hidden,
  };
}

/* --- cli ------------------------------------------------------------------ */

async function main() {
  const current = await readFile(DATA_FILE, "utf8");
  const file = JSON.parse(current);

  const { projects, added, updated, hidden } = mergeProjects(
    file.projects ?? [],
    await fetchRepos(),
  );

  const next = JSON.stringify({ ...file, projects }, null, 2) + "\n";
  if (next === current) {
    console.log("Project list already up to date.");
    return;
  }

  await writeFile(DATA_FILE, next, "utf8");
  console.log(
    `Updated data/projects.json — ${added} added, ${updated} changed, ${hidden} hidden.`,
  );
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  await main();
}
