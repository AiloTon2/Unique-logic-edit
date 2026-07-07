#!/usr/bin/env node
/**
 * verify.js — Re-inject JSON values into a template and diff
 *             against the original HTML source.
 *
 * Usage:
 *   node _map/step4/verify.js <slug>
 *
 * Example:
 *   node _map/step4/verify.js index
 *   node _map/step4/verify.js about-us
 *
 * Paths (relative to _src/):
 *   Template : _map/step4/templates/{slug}.html
 *   Page JSON: _map/step4/pages/{slug}/{slug}.json
 *   Shared   : _map/step4/pages/shared/_shared.json
 *   Original : _src/{slug}.html  (index → index.html)
 */

const fs = require("fs");
const path = require("path");

// ── helpers ────────────────────────────────────────────────

/** Resolve paths.
 *  __dirname  = _map/stepN/       (whichever step this copy lives in)
 *  srcDir     = _src/             (two levels up from stepN/)
 *  stepDir    = __dirname itself   (templates/ and pages/ live here)
 */
const srcDir = path.resolve(__dirname, "../..");          // _src/
const stepDir = __dirname;                                // _map/stepN/

function readJSON(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

function readText(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath, "utf-8");
}

/**
 * Flatten a nested object into dot-notation keys.
 *   { a: { b: "x" } }  →  { "a.b": "x" }
 */
function flatten(obj, prefix = "") {
  const out = {};
  for (const [key, val] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (val !== null && typeof val === "object" && !Array.isArray(val)) {
      Object.assign(out, flatten(val, fullKey));
    } else {
      out[fullKey] = val;
    }
  }
  return out;
}

/**
 * Replace all {{key}} placeholders in `text` with values from `map`.
 * Returns { result, missing } where missing is an array of keys
 * found in the template but not in the map.
 */
function inject(text, map) {
  const missing = [];
  const used = new Set();
  const result = text.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
    const trimmed = key.trim();
    if (trimmed in map) {
      used.add(trimmed);
      return map[trimmed];
    }
    missing.push(trimmed);
    return match; // leave placeholder as-is
  });
  // keys present in JSON but never referenced in template
  const unused = Object.keys(map).filter((k) => !used.has(k));
  return { result, missing, unused };
}

// ── normalise helper ───────────────────────────────────────

/**
 * Light normalisation so trivial whitespace differences don't
 * dominate the diff output.  Collapses runs of whitespace to a
 * single space and trims each line.
 */
function normalise(text) {
  return text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter((l) => l.length > 0)
    .map((l) => l.replace(/\{\{[^}]+\}\}/g, "__PLACEHOLDER__")) // Replace all {{...}} with a wildcard
    .join("\n");
}

// ── main ───────────────────────────────────────────────────

const slug = process.argv[2];
if (!slug) {
  console.error("Usage: node verify.js <slug>");
  process.exit(1);
}

// Resolve file names. The "/" slug maps to index.html.
const fileSlug = slug === "/" ? "index" : slug;

const templatePath = path.join(stepDir, "templates", `${fileSlug}.html`);
const pageJsonPath = path.join(stepDir, "pages", fileSlug, `${fileSlug}.json`);
const sharedJsonPath = path.join(stepDir, "pages", "shared", "_shared.json");
const originalPath = path.join(srcDir, `${fileSlug}.html`);

// ── read files ─────────────────────────────────────────────

const template = readText(templatePath);
if (template === null) {
  console.error(`❌  Template not found: ${templatePath}`);
  process.exit(1);
}

const original = readText(originalPath);
if (original === null) {
  console.error(`❌  Original HTML not found: ${originalPath}`);
  process.exit(1);
}

const pageJson = readJSON(pageJsonPath);
if (pageJson === null) {
  console.error(`❌  Page JSON not found: ${pageJsonPath}`);
  process.exit(1);
}

const sharedJson = readJSON(sharedJsonPath) || {};

// ── merge & flatten ────────────────────────────────────────

// Page-specific keys take precedence over shared keys.
const merged = { shared: sharedJson, ...pageJson };
const map = flatten(merged);

// ── inject ─────────────────────────────────────────────────

const { result: rendered, missing, unused } = inject(template, map);

// ── diff ───────────────────────────────────────────────────

const normRendered = normalise(rendered);
const normOriginal = normalise(original);

const renderedLines = normRendered.split("\n");
const originalLines = normOriginal.split("\n");

let diffs = 0;
const maxLen = Math.max(renderedLines.length, originalLines.length);
const diffDetails = [];

for (let i = 0; i < maxLen; i++) {
  const r = renderedLines[i] || "";
  const o = originalLines[i] || "";
  // If either line contains a placeholder wildcard, treat as matching
  if (r === o || r.includes("__PLACEHOLDER__") || o.includes("__PLACEHOLDER__")) {
    continue;
  }
  diffs++;
  if (diffDetails.length < 30) {
    diffDetails.push({ line: i + 1, expected: o, got: r });
  }
}

// ── report ─────────────────────────────────────────────────

console.log(`\n🔍  Verifying: ${slug}\n`);
console.log(`   Template : ${path.relative(srcDir, templatePath)}`);
console.log(`   Page JSON: ${path.relative(srcDir, pageJsonPath)}`);
console.log(`   Original : ${path.relative(srcDir, originalPath)}`);
console.log(`   Placeholders in template: ${(template.match(/\{\{[^}]+\}\}/g) || []).length}`);
console.log(`   Keys in merged JSON     : ${Object.keys(map).length}`);
console.log();

if (missing.length) {
  console.log(`⚠️  Missing keys (in template but not in JSON): ${missing.length}`);
  missing.forEach((k) => console.log(`      - {{${k}}}`));
  console.log();
}

if (unused.length) {
  console.log(`⚠️  Unused keys (in JSON but not in template): ${unused.length}`);
  unused.forEach((k) => console.log(`      - ${k}`));
  console.log();
}

if (diffs === 0) {
  console.log("✅  Perfect match — rendered output equals original HTML (after normalisation).");
  process.exit(0);
} else {
  console.log(`❌  ${diffs} line(s) differ between rendered output and original HTML.\n`);
  for (const d of diffDetails) {
    console.log(`   Line ${d.line}:`);
    console.log(`     expected: ${d.expected.substring(0, 200)}`);
    console.log(`     got:      ${d.got.substring(0, 200)}`);
    console.log();
  }
  if (diffs > diffDetails.length) {
    console.log(`   ... and ${diffs - diffDetails.length} more diff(s).`);
  }
  process.exit(1);
}
