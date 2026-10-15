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
  const localRequire = specifier => specifier.startsWith("./") ? loadContent(specifier.slice(2)) : specifier.startsWith("../content/") ? loadContent(specifier.slice(11)) : require(specifier);
  new Function("require", "module", "exports", compiled)(localRequire, module, module.exports);
  return module.exports;
}
const { projectCatalog, findProject, findWorld, filterProjects, normalizeCategory } = loadContent("catalog");
const { certificates } = loadContent("credentials");
const { orbitTechNodes } = loadContent("technologies");
const { projectWorkflowNotes } = loadContent("project-workflows");
const { makerGroups, readMakerRoute, makerRouteHref, makerRouteQuery } = loadContent("../components/maker-route");

test("maker return routes preserve every technology, owner group, All, and selected world", () => {
  assert.deepEqual(makerGroups.map(group => group.items.length), [6, 6, 13, 25]);
  for (const [group, entry] of makerGroups.entries()) for (const tool of entry.items) {
    const route = { chapter: "tools", group, tool, world: "nalira" };
    assert.deepEqual(readMakerRoute(makerRouteQuery(route)), route);
    assert.equal(makerRouteHref(route), `/?${makerRouteQuery(route)}`);
    assert.equal(makerRouteHref(route, "/projects/nalira"), `/projects/nalira?${makerRouteQuery(route)}`);
  }
});

test("maker return routes reject unknown chapters and tools and normalize untrusted values", () => {
  for (const value of ["", "chapter=unknown", "chapter=tools", "chapter=tools&tool=missing", "chapter=https://example.org"]) assert.equal(readMakerRoute(new URLSearchParams(value)), null);
  const normalized = readMakerRoute(new URLSearchParams("chapter=tools&tool=react&group=build&world=https://example.org&returnTo=https://example.org"));
  assert.equal(normalized.group, 1);
  assert.equal(normalized.world, null);
  assert.equal(makerRouteHref(normalized), "/?chapter=tools&tool=react&group=interface");
  assert.equal(makerRouteQuery(readMakerRoute(new URLSearchParams("chapter=proof&tool=missing&group=unknown&world=catmoji"))).toString(), "chapter=proof&world=catmoji");
});

test("public project artwork dimensions reserve the actual source ratio", async () => {
  const { default: sharp } = await import("sharp");
  for (const project of projectCatalog.filter(project => project.media)) {
    const metadata = await sharp(`public${project.media}`).metadata();
    assert.deepEqual(project.mediaSize, [metadata.width, metadata.height], project.id);
  }
});

test("each public project has three bilingual workflow explanations matching its ordered steps", () => {
  assert.deepEqual(Object.keys(projectWorkflowNotes).sort(), projectCatalog.map(p => p.id).sort());
  for (const project of projectCatalog) for (const language of ["en", "id"]) {
    const notes = projectWorkflowNotes[project.id][language];
    assert.equal(notes.length, project.flow[language].length);
    for (const note of notes) assert.ok(note.length >= 30 && note.length < 160);
  }
});

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
  for (const id of ["canox", "hengs", "polara", "yventures", "soreva", "rental"]) assert.equal(findWorld(id).source, undefined);
  assert.equal(findWorld("nalira").source, undefined);
  assert.equal(findWorld("polara").status.en, "Live");
  assert.match(findWorld("soreva").ownership.en, /Vieri prototype account/);
  assert.equal(projectCatalog.some(p => /neurova/i.test(p.name)), false);
});
test("Polara live status, public access, and destination agree in both languages", () => {
  const polara = findWorld("polara");
  assert.deepEqual(polara.status, { en: "Live", id: "Live" });
  assert.deepEqual(polara.access, { en: "Public product", id: "Produk publik" });
  assert.equal(polara.link, "https://polara.vercel.app/");
  assert.deepEqual(polara.linkLabel, { en: "Open live product", id: "Buka produk live" });
  assert.deepEqual(polara.evidence, { en: "Live product and original product artwork", id: "Produk live dan artwork produk asli" });
  assert.deepEqual(polara.next, { en: "Try the live photobooth in your browser", id: "Coba photobooth live di browser" });
  assert.equal(polara.media, "/assets/projects/polara-og.png");
  assert.equal(polara.mediaKind, "artwork");
});
test("technology satellites retain factual ownership in all galaxies", () => {
  assert.equal(orbitTechNodes.length, 25);
  for (const tech of orbitTechNodes) assert.deepEqual(tech.projectIds, projectCatalog.filter(p => p.stack.includes(tech.label)).map(p => p.id));
  assert.deepEqual(orbitTechNodes.find(t => t.label === "n8n").projectIds, ["yventures"]);
});
test("37 credentials have unique IDs, small previews, and preserved featured order", () => {
  assert.equal(certificates.length, 37);
  assert.equal(new Set(certificates.map(c => c.id)).size, 37);
  assert.equal(certificates[0].id, "google-student-ambassador");
  assert.equal(certificates.filter(c => c.featuredOrder !== null).length, 5);
  assert.equal(certificates.find(c => c.id === "dicoding-oop").title, "Belajar Prinsip Pemrograman SOLID");
  assert.ok(certificates.some(c => c.kind === "Completion badge"));
  for (const record of certificates) for (const file of [record.image, record.thumbnail, record.source].filter(Boolean)) assert.ok(existsSync(`public${file}`), file);
});

test("October import preserves badge types and only dates printed in the artwork", () => {
  const added = certificates.slice(26);
  assert.equal(added.length, 11);
  for (const record of added) {
    assert.equal(record.issuer, "Google Cloud");
    assert.equal(record.kind, "Completion badge");
    assert.equal(record.featuredOrder, null);
    assert.equal(record.source, undefined, "image badges must not invent PDFs");
  }
  assert.equal(added.filter(record => record.date === "Date not shown").length, 8);
  assert.equal(added.filter(record => record.date === "Sep 2026").length, 3);
});
