import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import test from "node:test";
import ts from "typescript";

const require = createRequire(import.meta.url);
const cache = new Map();
function loadContent(name) {
  const file = path.resolve("content", `${name}.ts`);
  if (cache.has(file)) return cache.get(file);
  const module = { exports: {} };
  cache.set(file, module.exports);
  const compiled = ts.transpileModule(readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const localRequire = specifier => specifier.startsWith("./") ? loadContent(specifier.slice(2)) : require(specifier);
  new Function("require", "module", "exports", compiled)(localRequire, module, module.exports);
  return module.exports;
}
const { projectCatalog, findProject, findWorld, filterProjects, normalizeCategory } = loadContent("catalog");
const { certificates } = loadContent("credentials");
const { orbitTechNodes } = loadContent("technologies");

test("ten stable project records share catalog, details, and orbit IDs", () => {
  assert.equal(projectCatalog.length, 10);
  assert.equal(new Set(projectCatalog.map(p => p.slug)).size, 10);
  for (const [category, count] of [["henrylabs", 5], ["university", 3], ["client", 2]]) assert.equal(filterProjects(category, "").length, count);
  for (const project of projectCatalog) {
    assert.equal(findProject(project.slug), findWorld(project.id));
    for (const language of ["en", "id"]) for (const key of ["summary", "ownership", "evidence", "next", "status", "access"]) assert.ok(project[key][language]);
    for (const media of [project.logo, project.media].filter(Boolean)) assert.ok(existsSync(`public${media}`));
  }
  assert.equal(findProject("https://example.org"), undefined);
  assert.equal(normalizeCategory("../../secret"), "all");
  assert.deepEqual(filterProjects("university", " Laravel  ").map(p => p.id), ["labq"]);
  assert.equal(filterProjects("all", "nonexistenttechnology").length, 0);
});
test("public/private and credit boundaries remain factual", () => {
  for (const id of ["canox", "hengs", "yventures", "soreva", "rental"]) assert.equal(findWorld(id).source, undefined);
  assert.equal(findWorld("nalira").source, undefined);
  assert.equal(findWorld("polara").status.en, "In progress");
  assert.match(findWorld("soreva").ownership.en, /Vieri prototype account/);
  assert.equal(projectCatalog.some(p => /neurova/i.test(p.name)), false);
});
test("technology satellites retain factual ownership in all galaxies", () => {
  assert.equal(orbitTechNodes.length, 25);
  for (const tech of orbitTechNodes) assert.deepEqual(tech.projectIds, projectCatalog.filter(p => p.stack.includes(tech.label)).map(p => p.id));
  assert.deepEqual(orbitTechNodes.find(t => t.label === "n8n").projectIds, ["yventures"]);
});
test("26 original credentials have unique IDs, small previews, and preserved featured order", () => {
  assert.equal(certificates.length, 26);
  assert.equal(new Set(certificates.map(c => c.id)).size, 26);
  assert.equal(certificates[0].id, "google-student-ambassador");
  assert.equal(certificates.filter(c => c.featuredOrder !== null).length, 5);
  assert.equal(certificates.find(c => c.id === "dicoding-oop").title, "Belajar Prinsip Pemrograman SOLID");
  assert.ok(certificates.some(c => c.kind === "Completion badge"));
  for (const record of certificates) for (const file of [record.image, record.thumbnail, record.source].filter(Boolean)) assert.ok(existsSync(`public${file}`), file);
});
