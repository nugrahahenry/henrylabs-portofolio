import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import ts from "typescript";
import { segmentAlias } from "../scripts/pages-segments.mjs";

const require = createRequire(import.meta.url);
const config = ts.transpileModule(readFileSync("next.config.ts", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;
function load(env) {
  const module = { exports: {} };
  new Function("require", "module", "exports", "process", "__dirname", config)(require, module, module.exports, { env }, process.cwd());
  return module.exports.default;
}

test("Pages export is opt-in; existing development and server builds remain available", () => {
  assert.equal(load({}).output, undefined);
  assert.equal(load({ PORTFOLIO_STATIC_EXPORT: "0" }).output, undefined);
  for (const origin of ["https://stargod.example", "https://chosen-name.pages.dev", "https://portfolio.example.com/"]) {
    assert.equal(load({ PORTFOLIO_STATIC_EXPORT: "1", NEXT_PUBLIC_SITE_URL: origin }).output, "export");
  }
});

test("Pages refuses missing, non-HTTPS, local and non-root public metadata addresses", () => {
  for (const origin of [undefined, "", "/portfolio", "bad url", "http://portfolio.example", "https://localhost", "https://localhost.", "https://demo.localhost.", "https://demo.local", "https://demo.localhost", "https://127.0.0.1", "https://[::1]", "https://portfolio.example:3000", "https://user:pass@portfolio.example", "https://portfolio.example/site", "https://portfolio.example/?lang=id", "https://portfolio.example/#contact"]) {
    assert.throws(() => load({ PORTFOLIO_STATIC_EXPORT: "1", NEXT_PUBLIC_SITE_URL: origin }), /Pages export requires NEXT_PUBLIC_SITE_URL/, String(origin));
  }
});

test("Windows nested segment exports map to the filenames requested by the browser", () => {
  assert.equal(segmentAlias("projects/__next.projects/__PAGE__.txt"), "projects/__next.projects.__PAGE__.txt");
  assert.equal(segmentAlias("projects/rentalmobil-sg/__next.projects/$d$slug/__PAGE__.txt"), "projects/rentalmobil-sg/__next.projects.$d$slug.__PAGE__.txt");
  for (const file of ["projects/__next.projects.__PAGE__.txt", "__next._tree.txt", "assets/brand/catmoji.png", "../__next.projects/page.txt", "projects/__next.projects/page.js", "projects\\__next.projects\\page.txt"]) assert.equal(segmentAlias(file), null);
});
