import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium, expect } from "@playwright/test";

const base = (process.env.PORTFOLIO_URL ?? "http://localhost:3002").replace(/\/$/, "");
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH ?? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" });
const failures = [], reports = [];
mkdirSync("test-results/orbit-return", { recursive: true });
const check = (ok, message) => { if (!ok) failures.push(message); };
async function ready(page, id) {
  const scene = page.locator(".cosmic-canvas");
  await expect(scene).toHaveAttribute("data-ready", "true", { timeout: 20000 });
  await expect(scene).toHaveAttribute("data-active-world", id);
  await expect(scene).toHaveAttribute("data-flight", "1.000");
  await expect(scene).toBeFocused();
  await expect(page.locator(".world-inspector")).toHaveCount(0);
  return scene;
}
async function sample(page) {
  return page.locator(".cosmic-canvas").evaluate(n => {
    const h = document.querySelector(".hero-stage");
    return { pitch: +n.dataset.pitch, angle: +n.dataset.angle, zoom: +n.dataset.viewZoom, time: +n.dataset.time,
      progress: (scrollY - h.offsetTop) / (h.offsetHeight - innerHeight) };
  });
}
try {
  const cases = [[1440, 900], [390, 844]].flatMap(size => [["nalira", "Nalira"], ["pos", "POS Z Shoes"], ["soreva", "Soreva Autonomous Content"]].map(([id, title]) => ({ size, id, title })));
  for (const { size: [width, height], id, title } of process.argv.includes("--visual") ? cases.filter(item => item.id === "pos" && item.size[0] === 390) : cases) {
    const page = await browser.newPage({ viewport: { width, height }, hasTouch: width < 500 });
    const errors = [];
    page.on("pageerror", e => errors.push(e.message));
    await page.goto(`${base}/?world=${id}&lang=id`);
    const scene = await ready(page, id);
    await page.locator(".hero-stage").evaluate(h => window.scrollTo({ top: h.offsetTop + (h.offsetHeight - innerHeight) * .73, behavior: "instant" }));
    await page.waitForTimeout(300);
    const point = await scene.locator("canvas").evaluate(canvas => {
      const r = canvas.getBoundingClientRect();
      for (const y of [.28, .4, .55].map(p => innerHeight * p)) for (const x of [.1, .3, .5].map(p => innerWidth * p)) {
        if (x > r.left && y > r.top && x + 90 < Math.min(r.right, innerWidth) && y + 60 < Math.min(r.bottom, innerHeight) && document.elementFromPoint(x, y) === canvas) return { x, y };
      }
      return null;
    });
    assert.ok(point, `${width}/${id}: canvas must receive an actual pointer drag`);
    await page.mouse.move(point.x, point.y);
    await page.mouse.down();
    await page.mouse.move(point.x + 90, point.y + 60, { steps: 8 });
    await page.mouse.up();
    await page.getByRole("button", { name: "Zoom in on planets", exact: true }).click({ clickCount: 2 });
    await expect(scene).toHaveAttribute("data-view-zoom", "0.24");
    const before = await sample(page);
    check(Math.abs(before.pitch) > .2, `${width}/${id}: drag must actually tilt the orbit`);
    for (const kind of ["browser", "link"]) {
      await page.getByRole("button", { name: "Buka dunia aktif", exact: true }).click();
      await page.locator(".world-inspector").getByRole("link", { name: "Baca proyek", exact: true }).click();
      await expect(page.locator("h1")).toHaveText(title);
      if (width === 390 && kind === "link") await page.setViewportSize({ width: 844, height: 390 });
      if (kind === "browser") await page.goBack();
      else await page.getByRole("link", { name: "Kembali ke semesta", exact: true }).click();
      await ready(page, id);
      const after = await sample(page);
      check(Math.abs(after.pitch - before.pitch) < .002, `${width}/${kind}: pitch reset ${before.pitch} -> ${after.pitch}`);
      check(after.zoom === before.zoom, `${width}/${kind}: zoom reset ${before.zoom} -> ${after.zoom}`);
      check(Math.abs(after.angle - before.angle) < .3, `${width}/${kind}: orbital angle reset ${before.angle} -> ${after.angle}`);
      check(Math.abs(after.progress - .73) < .003, `${width}/${kind}: scroll reset ${after.progress}`);
      check(after.time >= before.time, `${width}/${kind}: orbital clock rewound`);
      await page.waitForTimeout(900);
      check(await page.locator(".planet-label").evaluateAll(nodes => nodes.every(n => {
        const r = n.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight;
      })), `${width}/${id}/${kind}: all planet names must remain in the viewport`);
      if (width === 390 && kind === "link") {
        const labels = await page.locator(".planet-label").evaluateAll(nodes => nodes.map(n => { const r = n.getBoundingClientRect(); return { x: r.x, y: r.y, right: r.right, bottom: r.bottom }; }));
        for (let i = 0; i < labels.length; i++) for (let j = i + 1; j < labels.length; j++) {
          const a = labels[i], b = labels[j];
          check(a.right <= b.x || b.right <= a.x || a.bottom <= b.y || b.bottom <= a.y, `${id}: landscape project labels overlap`);
        }
      }
      await page.screenshot({ path: `test-results/orbit-return/${width}-${id}-${kind}.png` });
      reports.push({ width, id, kind, before, after });
    }
    check(errors.length === 0, `${width}: ${errors}`);
    await page.close();
    console.log(`PASS orbit return ${id} ${width}px`);
  }
  const still = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: "no-preference" });
  await still.addInitScript(() => {
    Storage.prototype.getItem = Storage.prototype.setItem = () => { throw new DOMException("Unavailable", "SecurityError"); };
  });
  await still.goto(`${base}/?world=pos&motion=off`);
  const stillScene = await ready(still, "pos");
  await still.getByRole("button", { name: "Zoom in on planets", exact: true }).click();
  await expect(stillScene).toHaveAttribute("data-view-zoom", "0.12");
  await still.getByRole("button", { name: "Open active world", exact: true }).click();
  await still.getByRole("link", { name: "Read project", exact: true }).click();
  await still.getByRole("link", { name: "Back to the universe", exact: true }).click();
  await ready(still, "pos");
  await expect(stillScene).toHaveAttribute("data-view-zoom", "0.12");
  await expect(still).toHaveURL(/motion=off/);
  await still.getByRole("button", { name: "Open active world", exact: true }).click();
  await still.getByRole("link", { name: "Read project", exact: true }).click();
  await still.locator(".detail-neighbor--next").click();
  await still.getByRole("link", { name: "Back to the universe", exact: true }).click();
  await ready(still, "labq");
  await expect(stillScene).toHaveAttribute("data-view-zoom", "0.00");
  await still.goto(`${base}/?world=pos&motion=off`);
  await ready(still, "pos");
  await expect(stillScene).toHaveAttribute("data-view-zoom", "0.00");
  await still.close();
  console.log("PASS Still, unavailable storage, different-world isolation and fresh-document defaults");
  assert.deepEqual(failures, []);
  console.log("PASS orbit pose, zoom, scroll, focus and collapsed inspector across browser/link return and rotation");
} finally {
  writeFileSync("test-results/orbit-return/report.json", JSON.stringify({ reports, failures }, null, 2));
  await browser.close();
}
