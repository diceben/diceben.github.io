/**
 * Tests for the build helpers. Run with `node --test` from the repo root.
 * Uses node's built-in test runner — no dependencies, nothing to install.
 */

import test from "node:test";
import assert from "node:assert/strict";
import {
  esc,
  isSet,
  entities,
  render,
  effective,
  renderProject,
} from "./build.mjs";

test("data from a JSON file cannot inject markup", () => {
  assert.equal(
    esc('<script>alert("x")</script>'),
    "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;",
  );
  assert.equal(esc("Tom & Jerry's"), "Tom &amp; Jerry&#39;s");
});

test("TODO placeholders count as empty", () => {
  assert.equal(isSet("TODO"), false);
  assert.equal(isSet("todo"), false);
  assert.equal(isSet("   "), false);
  assert.equal(isSet(null), false);
  assert.equal(isSet("hello"), true);
});

test("emails are written as numeric entities", () => {
  assert.equal(entities("a@b.c"), "&#97;&#64;&#98;&#46;&#99;");
});

test("{{escaped}} escapes, {{{raw}}} does not", () => {
  assert.equal(render("{{a}}", { a: "<b>" }), "&lt;b&gt;");
  assert.equal(render("{{{a}}}", { a: "<b>" }), "<b>");
});

test("a typo in a template fails the build instead of the page", () => {
  assert.throws(() => render("{{nope}}", {}), /Unknown template key/);
});

test("{{#if}} keeps filled values and drops empty ones", () => {
  assert.equal(render("{{#if a}}yes{{/if}}", { a: "x" }), "yes");
  assert.equal(render("{{#if a}}yes{{/if}}", { a: "" }), "");
  assert.equal(render("{{#if a}}yes{{/if}}", { a: "TODO" }), "");
  assert.equal(render("{{#if a}}yes{{/if}}", { a: true }), "yes");
});

test("two independent conditionals both resolve", () => {
  const out = render("{{#if a}}A{{/if}}-{{#if b}}B{{/if}}", { a: "1", b: "" });
  assert.equal(out, "A-");
});

test("overrides beat base fields", () => {
  const merged = effective({
    tagline: "from the sync",
    name: "Tool",
    overrides: { tagline: "by hand" },
  });
  assert.equal(merged.tagline, "by hand");
  assert.equal(merged.name, "Tool");
});

const PROJECT_TEMPLATE = `{{{nameHtml}}}|{{status}}|{{year}}|{{tagline}}|{{{tagsHtml}}}|{{{linksHtml}}}`;

test("a project renders a repo link, tags and the year", () => {
  const out = renderProject(PROJECT_TEMPLATE, {
    repo: "diceben/tool",
    name: "Tool",
    tagline: "Does things.",
    tags: ["cli", "rust"],
    status: "active",
    pushedAt: "2026-07-22",
  });
  assert.match(out, /href="https:\/\/github.com\/diceben\/tool"/);
  assert.match(out, /<li>cli<\/li><li>rust<\/li>/);
  assert.match(out, /\|2026\|/);
  assert.match(out, /\|\|/); // status "active" is not shown as a badge
});

test("a non-active status is shown, a live url adds a second link", () => {
  const out = renderProject(PROJECT_TEMPLATE, {
    repo: "diceben/tool",
    status: "archived",
    url: "https://example.com",
    pushedAt: "2025-01-01",
  });
  assert.match(out, /\|archived\|/);
  assert.match(out, /&rarr; live/);
});

test("a project with no repo and no url still renders", () => {
  const out = renderProject(PROJECT_TEMPLATE, { name: "Secret Thing" });
  assert.match(out, /Secret Thing/);
  assert.match(out, /no public link/);
});

test("a malicious project name cannot break out of the markup", () => {
  const out = renderProject(PROJECT_TEMPLATE, {
    repo: "diceben/tool",
    name: '"><script>alert(1)</script>',
  });
  assert.doesNotMatch(out, /<script>/);
  assert.match(out, /&lt;script&gt;/);
});
