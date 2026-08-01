/**
 * Tests for the sync merge rules. Run with `node --test` from the repo root.
 * Uses node's built-in test runner — no dependencies, nothing to install.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { mergeProjects, baseFieldsFrom, titleize } from "./sync-projects.mjs";

/** A GitHub API repo object, trimmed to the fields the sync reads. */
function repo(overrides = {}) {
  return {
    name: "example-tool",
    full_name: "diceben/example-tool",
    private: false,
    archived: false,
    description: "Does one thing.",
    homepage: "",
    language: "Python",
    topics: ["portfolio", "cli"],
    pushed_at: "2026-07-22T10:00:00Z",
    ...overrides,
  };
}

test("titleize turns a repo slug into a readable name", () => {
  assert.equal(titleize("ripgrep-notes"), "Ripgrep Notes");
  assert.equal(titleize("schularbeit_gen"), "Schularbeit Gen");
});

test("the marker topic never becomes a tag, the language does", () => {
  const fields = baseFieldsFrom(repo());
  assert.deepEqual(fields.tags, ["cli", "python"]);
  assert.equal(fields.pushedAt, "2026-07-22");
  assert.equal(fields.status, "active");
});

test("a repo without the portfolio topic is ignored", () => {
  const { projects } = mergeProjects([], [repo({ topics: ["cli"] })]);
  assert.deepEqual(projects, []);
});

test("the portfolio repo never lists itself", () => {
  const self = repo({
    name: "diceben.github.io",
    full_name: "diceben/diceben.github.io",
  });
  const { projects } = mergeProjects([], [self]);
  assert.deepEqual(projects, []);
});

test("a new tagged repo is added", () => {
  const { projects, added } = mergeProjects([], [repo()]);
  assert.equal(added, 1);
  assert.equal(projects[0].repo, "diceben/example-tool");
  assert.equal(projects[0].source, "sync");
});

test("overrides survive a sync and win when rendered", () => {
  const existing = [
    {
      repo: "diceben/example-tool",
      tagline: "old description",
      source: "sync",
      overrides: { tagline: "Hand-written and untouchable." },
    },
  ];
  const { projects } = mergeProjects(existing, [repo()]);
  assert.equal(projects[0].tagline, "Does one thing."); // base was refreshed
  assert.equal(projects[0].overrides.tagline, "Hand-written and untouchable.");
});

test("manual entries are never touched", () => {
  const manual = {
    repo: "diceben/example-tool",
    name: "Totally Different",
    tagline: "written by hand",
    source: "manual",
  };
  const { projects } = mergeProjects([manual], [repo()]);
  assert.deepEqual(projects[0], manual);
});

test("featured stays put across syncs", () => {
  const existing = [
    { repo: "diceben/example-tool", source: "sync", featured: true },
  ];
  const { projects } = mergeProjects(existing, [repo()]);
  assert.equal(projects[0].featured, true);
});

test("losing the topic hides an entry instead of deleting it", () => {
  const existing = [
    {
      repo: "diceben/example-tool",
      source: "sync",
      overrides: { tagline: "keep me" },
    },
  ];
  const { projects, hidden } = mergeProjects(existing, []);
  assert.equal(hidden, 1);
  assert.equal(projects.length, 1);
  assert.equal(projects[0].hidden, true);
  assert.equal(projects[0].overrides.tagline, "keep me");
});

test("regaining the topic unhides the entry", () => {
  const existing = [
    { repo: "diceben/example-tool", source: "sync", hidden: true },
  ];
  const { projects } = mergeProjects(existing, [repo()]);
  assert.equal(projects[0].hidden, false);
});

test("an archived repo is listed as archived", () => {
  const { projects } = mergeProjects([], [repo({ archived: true })]);
  assert.equal(projects[0].status, "archived");
});

test("homepage becomes the live link", () => {
  const { projects } = mergeProjects(
    [],
    [repo({ homepage: "https://example.com" })],
  );
  assert.equal(projects[0].url, "https://example.com");
});

test("featured entries sort first, then newest first", () => {
  const repos = [
    repo({ name: "old", full_name: "diceben/old", pushed_at: "2024-01-01T00:00:00Z" }),
    repo({ name: "new", full_name: "diceben/new", pushed_at: "2026-01-01T00:00:00Z" }),
    repo({ name: "star", full_name: "diceben/star", pushed_at: "2020-01-01T00:00:00Z" }),
  ];
  const existing = [{ repo: "diceben/star", source: "sync", featured: true }];
  const { projects } = mergeProjects(existing, repos);
  assert.deepEqual(
    projects.map((p) => p.repo),
    ["diceben/star", "diceben/new", "diceben/old"],
  );
});

test("running the merge twice changes nothing the second time", () => {
  const first = mergeProjects([], [repo()]).projects;
  const second = mergeProjects(first, [repo()]).projects;
  assert.deepEqual(second, first);
  assert.equal(JSON.stringify(second), JSON.stringify(first)); // key order too
});
