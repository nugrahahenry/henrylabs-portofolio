import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { chromium, expect } from "@playwright/test";

const url = process.env.PORTFOLIO_URL ?? "http://localhost:3002/";
const INTRO_DURATION = 12600;
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH ?? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" });
async function hydrateWithClock(page) {
  // Advance React's scheduler without consuming the short entrance timeline.
  await expect.poll(async () => {
    await page.clock.runFor(16);
    return page.locator(".site-shell").getAttribute("data-motion");
  }, { timeout: 20000, intervals: [100, 250, 500] }).toBe("on");
}
try {
  mkdirSync("test-results", { recursive: true });
  for (const viewport of process.argv.includes("--reduced") ? [] : [{ width: 1440, height: 900 }, { width: 1024, height: 768 }, { width: 768, height: 1024 }, { width: 390, height: 844 }, { width: 360, height: 800 }, { width: 844, height: 390 }]) {
    const page = await browser.newPage({ viewport, reducedMotion: "no-preference" });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.clock.install();
    await page.clock.pauseAt(new Date());
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await hydrateWithClock(page);
    await page.clock.runFor(500);
    const intro = page.locator(".arrival-intro");
    await expect(intro).toBeVisible();
    await expect(intro).toContainText("StarGod");
    await expect(intro).toContainText("128 UNIVERSES");
    await expect(intro).toContainText("COSMIC WEB");
    await expect(intro).not.toContainText("I build things");
    await expect(intro.getByRole("progressbar")).toHaveAttribute("aria-valuenow", /[0-9]+/);
    await expect(page.getByRole("button", { name: "Skip intro" })).toBeVisible();
    assert.equal(await intro.locator(".stargod-mark").evaluate(image => image.complete && image.naturalWidth > 0), true, "the authored StarGod mark must decode before reveal");
    await page.screenshot({ path: `test-results/${viewport.width}-stargod-entry.png` });
    await page.clock.runFor(8200);
    await expect(page.locator(".worldline-backdrop")).toHaveAttribute("data-spacecraft-visible", "true");
    await expect(page.locator(".worldline-backdrop")).toHaveAttribute("data-scout-visible", "true");
    await expect(page.locator(".worldline-backdrop")).toHaveAttribute("data-moon-orbits", "7");
    await expect(page.locator(".worldline-backdrop")).toHaveAttribute("data-moon-counts", "2,1,0,3,1");
    if (viewport.width === 1440) await page.getByRole("button", { name: "Skip intro" }).click();
    else await page.clock.runFor(INTRO_DURATION + 100);
    const bounds = await page.locator(".arrival-content").boundingBox();
    assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= viewport.width);
    assert.ok(bounds.y >= 0 && bounds.y + bounds.height <= viewport.height);
    await page.clock.runFor(900);
    await expect(intro).toBeHidden();
    await page.screenshot({ path: `test-results/${viewport.width}-arrival.png` });
    const heroText = await page.locator('.hero-copy').evaluate(el => [...el.querySelectorAll('h1,p,.hero-actions')].map(item => {
      const r = item.getBoundingClientRect(); return { x:r.x, y:r.y, right:r.right, bottom:r.bottom };
    }));
    assert.ok(heroText.every(r => r.x >= 0 && r.right <= viewport.width && r.y >= 60 && r.bottom <= viewport.height), JSON.stringify(heroText));
    await expect(page.locator(".hero-transition")).toHaveCount(0);
    await page.locator(".hero-stage").evaluate((hero) => window.scrollTo({ top: (hero.offsetHeight - innerHeight) * .35, behavior: "instant" }));
    await page.clock.runFor(700);
    await expect(page.locator(".hero-stage")).toHaveAttribute("data-phase", "worlds");
    await expect(page.getByRole("button", { name: "Explore HenryLabs galaxy", exact: true })).toBeVisible();
    await page.screenshot({ path: `test-results/${viewport.width}-arrival-map.png` });
    for (const progress of [.45, .57, .8]) {
      await page.locator('.hero-stage').evaluate((hero, p) => window.scrollTo({top:(hero.offsetHeight-innerHeight)*p, behavior:'instant'}), progress);
      await page.clock.runFor(450);
      await expect(page.locator('.hero-stage')).toHaveAttribute('data-phase', 'worlds');
      await expect(page.locator('.cosmic-canvas')).toHaveAttribute('data-departure', '0.000');
      for (const selector of ['.cosmic-frame-wrap', '.map-departure']) assert.equal(await page.locator(selector).evaluate(el => Number(getComputedStyle(el).opacity)), 1);
    }
    await page.locator('.home-preview-heading').evaluate(el => window.scrollTo({top:scrollY+el.getBoundingClientRect().top-110,behavior:'instant'}));
    await page.clock.runFor(700);
    await page.screenshot({path:`test-results/${viewport.width}-project-reading.png`});
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.reload({ waitUntil: "domcontentloaded" });
    await hydrateWithClock(page);
    await page.clock.runFor(900);
    await expect(intro).toBeHidden();
    await page.goto(`${url}?view=universe`, {waitUntil:'domcontentloaded'});
    await hydrateWithClock(page); await page.clock.runFor(1200);
    const landed = await page.locator('.hero-stage').evaluate(hero => (scrollY-hero.offsetTop)/(hero.offsetHeight-innerHeight));
    assert.ok(Math.abs(landed-.57)<.003, `Universe link must land inside plateau: ${landed}`);
    await page.screenshot({path:`test-results/${viewport.width}-universe-settled.png`});
    await page.goto(`${url}?intro=1`, { waitUntil: "domcontentloaded" });
    await hydrateWithClock(page);
    await expect(intro).toBeVisible();
    await page.clock.runFor(INTRO_DURATION + 1200);
    await expect(intro).toBeHidden();
    assert.deepEqual(errors, []);
    await page.close();
    console.log(`arrival, skip, session return, and direct galaxy handoff passed at ${viewport.width}px`);
  }
  const reduced = await browser.newPage({ reducedMotion: "reduce" });
  await reduced.goto(url, { waitUntil: "domcontentloaded" });
  await expect(reduced.locator("html")).toHaveAttribute("data-preferences-ready", "true", { timeout: 20000 });
  await expect(reduced.locator(".intro-loader")).toBeHidden();
  await expect(reduced.locator(".site-shell")).toHaveAttribute("data-motion", "off");
  await expect(reduced.locator(".worldline-backdrop")).toHaveAttribute("data-pursuit-bolts", "0");
  await reduced.close();
  console.log("reduced motion skips arrival and disables pursuit shots");
} finally { await browser.close(); }
