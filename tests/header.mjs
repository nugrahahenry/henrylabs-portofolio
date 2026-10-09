import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { chromium, expect } from "@playwright/test";

const base = (process.env.PORTFOLIO_URL ?? "http://localhost:3002").replace(/\/$/, "");
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH ?? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" });
const sizes = [{ width: 1440, height: 900 }, { width: 1024, height: 768 }, { width: 768, height: 1024 }, { width: 390, height: 844 }, { width: 320, height: 740 }, { width: 844, height: 390 }];
const confirmation = process.argv.includes("--confirm");
const interactionOnly = process.argv.includes("--interaction");
mkdirSync("test-results/header", { recursive: true });

async function scroll(page, y) {
  await page.evaluate(y => window.scrollTo({ top: y, behavior: "instant" }), y);
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}
async function settleScroll(page) {
  await page.evaluate(() => new Promise((resolve, reject) => {
    let previous = scrollY, stable = 0;
    const start = performance.now();
    const sample = () => {
      stable = Math.abs(scrollY - previous) < .5 ? stable + 1 : 0;
      previous = scrollY;
      if (stable >= 8) return resolve(true);
      if (performance.now() - start > 3000) return reject(new Error("Scroll did not settle"));
      requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  }));
}
async function visible(page, shown) {
  const header = page.locator(".site-header");
  await expect(header).toHaveAttribute("data-hidden", String(!shown));
  await expect.poll(() => header.evaluate(node => {
    const box = node.getBoundingClientRect();
    return box.bottom <= 0 ? "hidden" : box.top >= -.5 ? "visible" : "moving";
  })).toBe(shown ? "visible" : "hidden");
}

try {
  for (const viewport of interactionOnly ? [] : sizes) {
    if (confirmation && ![1440, 390, 320].includes(viewport.width)) continue;
    const page = await browser.newPage({ viewport });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(base, { waitUntil: "load" });
    await expect(page.locator("html")).toHaveAttribute("data-preferences-ready", "true", { timeout: 20000 });
    await page.locator(".intro-loader").waitFor({ state: "hidden" });
    await visible(page, true);
    const worldTop = await page.locator("#work").evaluate(node => node.getBoundingClientRect().top + scrollY);
    await page.getByRole("button", { name: "Explore the universe", exact: true }).click();
    await expect(page.locator(".cosmic-canvas")).toBeFocused();
    await visible(page, false);
    await expect(page.locator(".cosmic-canvas")).toHaveAttribute("data-ready", "true");
    assert.equal(await page.locator("#work").evaluate(node => node.getBoundingClientRect().top + scrollY), worldTop, "header motion must not move page layout");
    await page.screenshot({ path: `test-results/header/${viewport.width}-descending.png` });
    const start = await page.evaluate(() => scrollY);
    await scroll(page, start - 5);
    await visible(page, false);
    await scroll(page, start - 24);
    await visible(page, true);
    await page.screenshot({ path: `test-results/header/${viewport.width}-ascending.png` });
    await scroll(page, start + 100);
    await visible(page, false);

    // Hidden navigation remains reachable by keyboard, without moving the document.
    const position = await page.evaluate(() => scrollY);
    await page.locator(".language-toggle").focus();
    await visible(page, true);
    assert.equal(await page.evaluate(() => scrollY), position);
    await page.keyboard.press("PageDown");
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(position + 100);
    await settleScroll(page);
    await expect(page.locator(".site-header")).toHaveAttribute("data-hidden", "false");
    await page.locator("#main-content").focus();
    await scroll(page, start);
    await scroll(page, start + 150);
    await visible(page, false);
    await scroll(page, 0);
    await visible(page, true);

    if (viewport.width <= 640) {
      const summary = page.locator(".mobile-nav summary");
      for (const selector of [".mobile-nav summary", ".motion-toggle", ".language-toggle"]) {
        const box = await page.locator(selector).boundingBox();
        assert.ok(box.width >= 44 - .00001 && box.height >= 44 - .00001, `${selector} touch target: ${JSON.stringify(box)}`);
      }
      await summary.click();
      await scroll(page, 600);
      await visible(page, true);
      await expect(page.locator(".mobile-nav")).toHaveAttribute("open", "");
      await page.keyboard.press("Escape");
      await expect(summary).toBeFocused();
      await expect(page.locator(".mobile-nav")).not.toHaveAttribute("open", "");
      await summary.click();
      await page.getByRole("navigation", { name: "Mobile navigation" }).getByRole("link", { name: "Projects", exact: true }).click();
    } else {
      await page.getByRole("navigation", { name: "Primary navigation" }).getByRole("link", { name: "Projects", exact: true }).click();
    }
    await expect(page.locator(".project-record")).toHaveCount(10);
    await visible(page, true);
    await page.locator("#main-content").focus();
    await scroll(page, 500);
    await visible(page, false);
    await scroll(page, 460);
    await visible(page, true);
    // Pointer-focused language controls must not pin the header forever.
    await page.locator(".language-toggle").click();
    await scroll(page, 600);
    await visible(page, false);
    await scroll(page, 560);
    await visible(page, true);
    await page.locator(".language-toggle").click();
    await scroll(page, 0);
    if (viewport.width <= 640) await page.locator(".mobile-nav summary").click();
    await page.locator(viewport.width <= 640 ? ".mobile-nav nav" : ".desktop-nav").getByRole("link", { name: "Credentials", exact: true }).click();
    await expect(page.locator("h1")).toHaveText("Credentials.");
    await visible(page, true);
    await page.locator("#main-content").focus();
    await scroll(page, 700);
    await visible(page, false);
    if (viewport.width === 390) {
      await page.setViewportSize({ width: 390, height: 800 });
      await visible(page, false);
      await scroll(page, 660);
      await visible(page, true);
      await page.locator(".mobile-nav summary").click();
      await page.setViewportSize({ width: 1024, height: 768 });
      await expect(page.locator(".mobile-nav")).not.toHaveAttribute("open", "");
      await visible(page, true);
      await page.locator("#main-content").focus();
      await scroll(page, 800);
      await visible(page, false);
      await page.setViewportSize(viewport);
      await scroll(page, 700);
    }
    await scroll(page, 660);
    await visible(page, true);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.deepEqual(errors, []);
    await page.close();
    console.log(`header QA passed ${viewport.width}x${viewport.height}`);
  }

  for (const mode of ["reduced", "still"]) {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: mode === "reduced" ? "reduce" : "no-preference" });
    await page.goto(`${base}/projects${mode === "still" ? "?motion=off" : ""}`);
    await expect(page.locator("html")).toHaveAttribute("data-motion", "off");
    await scroll(page, 500);
    await visible(page, false);
    assert.ok(await page.locator(".site-header").evaluate(node => parseFloat(getComputedStyle(node).transitionDuration) <= .000001), "motion-off header transitions must be effectively instant");
    await scroll(page, 450);
    await visible(page, true);
    await page.close();
  }

  const touch = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await touch.goto(`${base}/projects`);
  await expect(touch.locator("html")).toHaveAttribute("data-preferences-ready", "true");
  const cdp = await touch.context().newCDPSession(touch);
  const swipe = async (from, to) => {
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 30, y: from }] });
    for (let step = 1; step <= 16; step++) {
      await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: 30, y: from + (to - from) * step / 16 }] });
      await touch.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)));
    }
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await settleScroll(touch);
  };
  await swipe(650, 250);
  await expect.poll(() => touch.evaluate(() => scrollY)).toBeGreaterThan(150);
  await visible(touch, false);
  const touchY = await touch.evaluate(() => scrollY);
  await swipe(350, 490);
  await expect.poll(() => touch.evaluate(() => scrollY)).toBeLessThan(touchY - 12);
  await visible(touch, true);
  await touch.locator(".mobile-nav summary").tap();
  await expect(touch.locator(".mobile-nav")).toHaveAttribute("open", "");
  await touch.close();
  console.log("header native touch, reduced motion and Still mode passed");
} finally { await browser.close(); }
