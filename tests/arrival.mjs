import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { chromium, expect } from "@playwright/test";

const url = process.env.PORTFOLIO_URL ?? "http://localhost:3002/";
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH ?? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" });
try {
  mkdirSync("test-results", { recursive: true });
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    const page = await browser.newPage({ viewport });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.clock.install();
    await page.clock.pauseAt(new Date());
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await page.clock.runFor(900);
    const intro = page.locator(".arrival-intro");
    await expect(intro).toBeVisible();
    await expect(intro).toContainText("HenryLabs");
    await expect(intro).not.toContainText("I build things");
    const bounds = await page.locator(".arrival-content").boundingBox();
    assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= viewport.width);
    assert.ok(bounds.y >= 0 && bounds.y + bounds.height <= viewport.height);
    await page.screenshot({ path: `test-results/${viewport.width}-arrival.png` });
    if (viewport.width === 1440) await page.getByRole("button", { name: "Skip intro" }).click();
    else await page.clock.runFor(900);
    await page.clock.runFor(900);
    await expect(intro).toBeHidden();
    await expect(page.locator(".hero-transition")).toHaveCount(0);
    await page.locator(".hero-stage").evaluate((hero) => window.scrollTo({ top: (hero.offsetHeight - innerHeight) * .35, behavior: "instant" }));
    await page.clock.runFor(700);
    await expect(page.locator(".hero-stage")).toHaveAttribute("data-phase", "worlds");
    await expect(page.getByRole("button", { name: "Explore HenryLabs galaxy", exact: true })).toBeVisible();
    await page.screenshot({ path: `test-results/${viewport.width}-arrival-map.png` });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.clock.runFor(900);
    await expect(intro).toBeHidden();
    await page.goto(`${url}?intro=1`, { waitUntil: "domcontentloaded" });
    await page.clock.runFor(500);
    await expect(intro).toBeVisible();
    await page.clock.runFor(2100);
    await expect(intro).toBeHidden();
    assert.deepEqual(errors, []);
    await page.close();
    console.log(`arrival, skip, session return, and direct galaxy handoff passed at ${viewport.width}px`);
  }
  const reduced = await browser.newPage({ reducedMotion: "reduce" });
  await reduced.goto(url, { waitUntil: "domcontentloaded" });
  await expect(reduced.locator(".intro-loader")).toBeHidden();
  await expect(reduced.locator(".site-shell")).toHaveAttribute("data-motion", "off");
  await expect(reduced.locator(".worldline-backdrop")).toHaveAttribute("data-pursuit-bolts", "0");
  await reduced.close();
  console.log("reduced motion skips arrival and disables pursuit shots");
} finally { await browser.close(); }
