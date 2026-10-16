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
const { polaraStory } = loadContent("polara-story");
const { projectContactLinks } = loadContent("project-contact");
const { makerGroups, readMakerRoute, makerRouteHref, makerRouteQuery } = loadContent("../components/maker-route");

test("Polara evidence has bilingual stories and small, traceable actual product captures", () => {
  const capture = JSON.parse(readFileSync("public/assets/projects/polara/capture.json", "utf8"));
  assert.equal(capture.version, "1.1.3");
  assert.match(capture.revision, /^[a-f0-9]{40}$/);
  assert.match(capture.origin, /Demo mode.*fictional/);
  assert.equal(capture.video.audio, false);
  assert.deepEqual(capture.video.fixedViewport, [1440, 1000]);
  assert.equal(capture.video.finalHoldSeconds, 3);
  assert.equal(capture.mobileCapture, "Separate unrecorded browser context");
  assert.ok(capture.video.durationSeconds > 5 && capture.video.durationSeconds < 25);
  assert.equal(polaraStory.captures.length, 3);
  for (const shot of polaraStory.captures) {
    assert.ok(readFileSync(`public${shot.src}`).length < 200_000);
    assert.equal(shot.size.length, 2);
    for (const lang of ["en", "id"]) assert.ok(shot.title[lang] && shot.alt[lang]);
  }
  assert.ok(readFileSync("public/assets/projects/polara/walkthrough.webm").length < 1_500_000);
  for (const lang of ["en", "id"]) {
    assert.ok(polaraStory.problem[lang] && polaraStory.result[lang] && polaraStory.limit[lang]);
    assert.ok(polaraStory.decisions.every(item => item.title[lang] && item.body[lang]));
  }
});

test("public contact destinations use Henry's confirmed WhatsApp number", () => {
  for (const file of ["components/portfolio-experience.tsx", "content/projects.ts", "README.md"]) {
    const source = readFileSync(file, "utf8");
    assert.ok(!source.includes("6289513559554"), file);
    assert.ok(source.includes("https://wa.me/6289513595554"), file);
  }
});

test("every project drafts a localized message to Henry without adding visitor data", () => {
  for (const project of projectCatalog) for (const language of ["en", "id"]) {
    const links = projectContactLinks(project, language);
    const wa = new URL(links.whatsapp), email = new URL(links.email);
    assert.equal(wa.origin, "https://wa.me");
    assert.equal(wa.pathname, "/6289513595554");
    assert.deepEqual([...wa.searchParams.keys()], ["text"]);
    assert.match(wa.searchParams.get("text"), language === "en" ? /^Hi Henry,/ : /^Halo Henry,/);
    assert.ok(wa.searchParams.get("text").includes(project.name));
    assert.equal(email.protocol, "mailto:");
    assert.equal(email.pathname, "henrynugraha1210@gmail.com");
    assert.equal(email.searchParams.get("body"), wa.searchParams.get("text"));
    assert.ok(email.searchParams.get("subject").includes(project.name));
    assert.doesNotMatch(links.whatsapp + links.email, /localhost|127\.0\.0\.1|utm_|returnTo/);
  }
});

test("contextual contact preserves live products, sources, and private walkthrough intent", () => {
  for (const id of ["catmoji", "polara", "nalira"]) assert.equal(projectContactLinks(findWorld(id), "en").primary, findWorld(id).link);
  for (const id of ["pos", "labq"]) assert.equal(projectContactLinks(findWorld(id), "en").primary, undefined);
  for (const id of ["canox", "rental", "yventures", "soreva"]) {
    const primary = new URL(projectContactLinks(findWorld(id), "id").primary);
    assert.match(primary.searchParams.get(primary.protocol === "mailto:" ? "body" : "text"), /minta walkthrough/);
  }
  assert.equal(new URL(projectContactLinks(findWorld("hengs"), "en").primary).pathname, "henrynugraha1210@gmail.com");
});

test("project drafts encode punctuation without creating extra recipients or parameters", () => {
  const name = "R&D / A+B #2? to=someone@example.com";
  const links = projectContactLinks({ name }, "en");
  const wa = new URL(links.whatsapp), email = new URL(links.email);
  assert.ok(wa.searchParams.get("text").includes(name));
  assert.ok(email.searchParams.get("subject").includes(name));
  assert.ok(email.searchParams.get("body").includes(name));
  assert.deepEqual([...email.searchParams.keys()], ["subject", "body"]);
  assert.equal(email.pathname, "henrynugraha1210@gmail.com");
  assert.equal(wa.hash, "");
});

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
  assert.deepEqual(polara.evidence, { en: "Live product, recorded demo workflow, and application screenshots", id: "Produk live, rekaman alur demo, dan screenshot aplikasi" });
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
