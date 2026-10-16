import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { segmentAlias } from "./pages-segments.mjs";

const defaultRoot = fileURLToPath(new URL("../", import.meta.url));
const hash = file => createHash("sha256").update(readFileSync(file)).digest("hex");

function filesIn(root, prefix = "") {
  return readdirSync(path.join(root, prefix), { withFileTypes: true }).flatMap(entry => {
    const name = `${prefix}${entry.name}`;
    assert.ok(!entry.isSymbolicLink(), `Symlinks are not public assets: ${name}`);
    return entry.isDirectory() ? filesIn(root, `${name}/`) : [name];
  });
}

export function checkPages(root = defaultRoot) {
  const output = path.join(root, "out");
  const files = filesIn(output);
  assert.ok(files.length <= 20_000, "Pages Free supports at most 20,000 files");
  let totalBytes = 0;
  let largest = { path: "", bytes: 0 };
  for (const file of files) {
    assert.ok(!/(^|\/)(?:\.env[^/]*|\.git|docs|node_modules|_originals|test-results|\.impeccable|assets\/henry)(\/|$)/.test(file), `Private path exported: ${file}`);
    const bytes = statSync(path.join(output, file)).size;
    assert.ok(bytes <= 25 * 1024 * 1024, `Pages asset exceeds 25 MiB: ${file}`);
    totalBytes += bytes;
    if (bytes > largest.bytes) largest = { path: file, bytes };
    const alias = segmentAlias(file);
    if (alias) assert.equal(hash(path.join(output, file)), hash(path.join(output, alias)), `Missing or changed navigation alias: ${alias}`);
  }
  for (const file of ["index.html", "404.html", "projects.html", "credentials.html", "robots.txt", "sitemap.xml", "opengraph-image"]) {
    assert.ok(files.includes(file), `Missing static output: ${file}`);
  }
  const manifest = JSON.parse(readFileSync(path.join(root, ".next/prerender-manifest.json"), "utf8"));
  const projectPaths = Object.keys(manifest.routes).filter(route => route.startsWith("/projects/"));
  assert.equal(projectPaths.length, 10, "All ten project details must be prerendered");
  for (const route of projectPaths) assert.ok(files.includes(`${route.slice(1)}.html`), `Missing detail: ${route}`);
  const sitemap = readFileSync(path.join(output, "sitemap.xml"), "utf8");
  assert.ok(!/localhost|127\.0\.0\.1/.test(sitemap), "Sitemap cannot point to the development server");
  assert.ok(!files.includes("_worker.js") && !files.includes("_redirects"), "Export must not require Workers or an SPA catch-all");

  // Verify the bytes actually shipped, including every permanently marked copy.
  const publicFiles = filesIn(path.join(root, "public"));
  for (const file of publicFiles) {
    assert.equal(hash(path.join(output, file)), hash(path.join(root, "public", file)), `Changed public export: ${file}`);
  }
  const watermarks = JSON.parse(readFileSync(path.join(output, "assets/certificates/watermarks.json"), "utf8"));
  for (const [name, record] of Object.entries(watermarks.files)) {
    const file = path.join(output, name.replace(/^\//, ""));
    assert.equal(hash(file), record.sha256, `Unverified watermarked copy: ${name}`);
    assert.equal(statSync(file).size, record.bytes);
  }
  const result = { files: files.length, totalBytes, largest, projects: projectPaths.length, watermarkedCopies: Object.keys(watermarks.files).length };
  console.log("Pages export verified:", JSON.stringify(result, null, 2));
  return result;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) checkPages();
