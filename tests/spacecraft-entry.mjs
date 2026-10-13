import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium, expect } from "@playwright/test";
import sharp from "sharp";

const base = (process.env.PORTFOLIO_URL ?? "http://localhost:3002").replace(/\/$/, "");
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH ?? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" });
const sizes = [[1440, 900], [390, 844], [1024, 768], [768, 1024], [360, 800], [844, 390], [1280, 720]];
const report = [];
mkdirSync("test-results/spacecraft-entry", { recursive: true });

async function sample(page) {
  return page.locator(".worldline-backdrop").evaluate(h => {
    const d = h.dataset;
    const craft = kind => ({ x: +d[`${kind}X`], y: +d[`${kind}Y`], radius: +d[`${kind}Radius`], opacity: +d[`${kind}Opacity`], entry: +d[`${kind}Entry`], clearance: +d[`${kind}Clearance`], retired: d[`${kind}Retired`] });
    return { age: +d.flightTime, cycle: +d.flightCycle, phase: d.pursuitPhase, delay: +d.pursuitDelay, ufo: craft("ufo"), scout: craft("scout"), calls: +d.drawCalls, portal: +d.wormholeOpacity };
  });
}

async function encounter(page, label, cycle = 0) {
  const viewport = page.viewportSize();
  const seen = { ufo: false, scout: false };
  const deadline = Date.now() + (cycle ? 80000 : 23000);
  let frame;
  while (Date.now() < deadline) {
    frame = await sample(page);
    if (frame.cycle === cycle) {
      for (const kind of ["ufo", "scout"]) {
        const craft = frame[kind];
        if (craft.opacity < .75 || craft.x < craft.radius || craft.x + craft.radius > viewport.width) continue;
        assert.ok(craft.clearance >= .0348, `${label}: ${kind} must clear planet silhouettes`);
        assert.equal(craft.retired, "false");
        if (kind === "scout") assert.ok(seen.ufo, `${label}: UFO must arrive before its pursuer`);
        seen[kind] = true;
      }
      if (seen.ufo && seen.scout) break;
    }
    await page.waitForTimeout(120);
  }
  assert.ok(seen.ufo && seen.scout, `${label}: first encounter was skipped: ${JSON.stringify(frame)}`);
  assert.ok(frame.calls < 65, `${label}: draw-call budget`);
  assert.equal(await page.evaluate(() => scrollY), 0, "do not rescue a missing opening by scrolling to another chapter");
  const opening = await page.evaluate(() => ({
    note: document.querySelector(".hero-note").getBoundingClientRect().bottom,
    gap: document.querySelector(".hero-kicker").getBoundingClientRect().top - document.querySelector(".site-header").getBoundingClientRect().bottom,
  }));
  if ((viewport.width < 1100 || viewport.width / viewport.height < .9 || viewport.height < 620 || opening.gap < 112) && viewport.height - opening.note >= 90) {
    for (const craft of [frame.ufo, frame.scout]) assert.ok(craft.y - craft.radius >= opening.note + 10, `${label}: lower flight must clear availability text`);
  }
  const screenshot = await page.screenshot({ path: `test-results/spacecraft-entry/${label}.png` });
  for (const kind of ["ufo", "scout"]) {
    const craft = frame[kind];
    const edge = Math.floor(Math.min(craft.radius, craft.x, viewport.width - craft.x, craft.y, viewport.height - craft.y));
    assert.ok(edge > 8, `${label}: ${kind} must have a readable silhouette`);
    const stats = await sharp(screenshot).extract({ left: Math.floor(craft.x - edge), top: Math.floor(craft.y - edge), width: edge * 2, height: edge * 2 }).stats();
    assert.ok(Math.max(...stats.channels.slice(0, 3).map(channel => channel.stdev)) > 10, `${label}: blank craft region`);
  }
  report.push({ label, ...frame });
}

async function portalSequence(page, label) {
  const seen = { ufo: false, scout: false, closed: false };
  const deadline = Date.now() + 35000;
  while (Date.now() < deadline) {
    const frame = await sample(page);
    for (const kind of ["ufo", "scout"]) {
      if (frame[kind].entry > .8 && frame[kind].opacity > .05 && frame.portal > .6) {
        if (kind === "scout") assert.ok(seen.ufo, "UFO enters the wormhole before the scout");
        seen[kind] = true;
      }
    }
    if (frame.age > 20.7 + frame.delay && frame.portal < .001) { seen.closed = true; break; }
    await page.waitForTimeout(80);
  }
  assert.ok(seen.ufo && seen.scout && seen.closed, `${label}: portal sequence incomplete: ${JSON.stringify(seen)}`);
}

try {
  const targets = process.argv.includes("--laptop") ? sizes.slice(-1) : process.argv.includes("--confirm") ? [...sizes.slice(0, 2), sizes.at(-1)] : sizes;
  const scenarios = targets.map(size => ({ size, entry: "return" }));
  if (!process.argv.includes("--return-only")) scenarios.push(
    { size: sizes[0], entry: "intro" }, { size: sizes[1], entry: "intro" },
    { size: sizes[0], entry: "skip" }, { size: sizes[0], entry: "still" },
  );
  const entryFilter = process.argv.find(arg => arg.startsWith("--entry="))?.slice(8);
  for (const { size: [width, height], entry } of scenarios.filter(item => !entryFilter || item.entry === entryFilter)) {
    const page = await browser.newPage({ viewport: { width, height } });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("console", message => { if (/Shader Error|THREE.WebGLProgram/.test(message.text())) errors.push(message.text()); });
    if (entry === "return" || entry === "still") await page.addInitScript(() => sessionStorage.setItem("henrylabs-intro-seen", "1"));
    await page.goto(`${base}/${entry === "intro" || entry === "skip" ? "?intro=1" : entry === "still" ? "?motion=off" : ""}`, { waitUntil: "domcontentloaded" });
    await expect(page.locator("html")).toHaveAttribute("data-preferences-ready", "true", { timeout: 20000 });
    await expect(page.locator(".worldline-backdrop")).toHaveAttribute("data-ready", "true", { timeout: 20000 });
    if (entry === "skip") await page.getByRole("button", { name: "Skip intro", exact: true }).click();
    await expect(page.locator(".site-shell")).toHaveAttribute("data-intro", "done", { timeout: 35000 });
    if (entry === "still") {
      const before = await sample(page);
      await page.waitForTimeout(600);
      assert.equal((await sample(page)).age, before.age, "Still mode must not advance the chase");
      await page.getByRole("button", { name: "Animation", exact: true }).click();
    }
    const label = `${width}x${height}-${entry}`;
    await encounter(page, label);
    if (process.argv.includes("--portal")) await portalSequence(page, label);
    if (entry === "return" && width === 1440 && process.argv.includes("--loop")) await encounter(page, `${label}-repeat`, 1);
    assert.deepEqual(errors, []);
    await page.close();
    console.log(`PASS opening pursuit ${label}`);
  }
} finally {
  writeFileSync("test-results/spacecraft-entry/report.json", JSON.stringify(report, null, 2));
  await browser.close();
}
