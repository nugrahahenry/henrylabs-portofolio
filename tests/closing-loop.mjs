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
    page.on("console", (message) => { if (/Shader Error|THREE.WebGLProgram/.test(message.text())) errors.push(message.text()); });
    await page.clock.install({ time: new Date("2026-10-07T00:00:00Z") });
    await page.clock.pauseAt(new Date("2026-10-07T00:00:01Z"));
    await page.addInitScript(() => sessionStorage.setItem("henrylabs-intro-seen", "1"));
    await page.goto(url, { waitUntil: "domcontentloaded" });
    for (let i = 0; i < 8; i++) await page.clock.fastForward(250);
    const field = page.locator(".worldline-backdrop");
    await expect(field).toHaveAttribute("data-ready", "true");
    await page.waitForLoadState("load");
    await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" }));
    // Native intersection notifications need a real browser frame, not just a virtual RAF.
    for (let i = 0; i < 50; i++) {
      await page.clock.fastForward(250);
      if (Number(await field.getAttribute("data-birth-age")) > .5) break;
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    assert.ok(Number(await field.getAttribute("data-hole-growth")) < .5);
    await expect(field).toHaveAttribute("data-pull", "0.000");
    await expect(field).toHaveAttribute("data-visitor-opacity", "0.000");
    await expect(field).toHaveAttribute("data-feeding-dust", "false");
    await page.screenshot({ path: `test-results/${viewport.width}-black-hole-birth.png` });
    for (let i = 0; i < 18; i++) await page.clock.fastForward(250);
    await expect(field).toHaveAttribute("data-gravity-active", "true");
    await expect(field).toHaveAttribute("data-hole-growth", "1.000");
    async function advanceTo(target) {
      let steps = 0;
      while (Number(await field.getAttribute("data-gravity-age")) < target && steps++ < 1100) await page.clock.fastForward(250);
      assert.ok(steps < 1100, "the closing clock must advance with visible frame time");
    }
    await advanceTo(16);
    await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" }));
    await expect(page.locator("footer")).toBeInViewport();
    assert.ok(await page.locator("footer").evaluate((node) => Number(getComputedStyle(node).zIndex) > 0), "footer words must paint above the fixed backdrop");
    const pull = Number(await field.getAttribute("data-pull"));
    assert.ok(pull >= .49 && pull <= .55, `mid-intake must be slow and continuous: ${pull}`);
    await expect(field).toHaveAttribute("data-visitor-count", "3");
    await expect(field).toHaveAttribute("data-visitor-direction", "left");
    assert.ok(Number(await field.getAttribute("data-visible-visitors")) > 0, "the arriving orbit must actually enter the viewport");
    await page.screenshot({ path: `test-results/${viewport.width}-slow-gravity-middle.png` });
    await advanceTo(32.25);
    await expect(field).toHaveAttribute("data-gravity-phase", "rest");
    await expect(field).toHaveAttribute("data-visitor-opacity", "0.000");
    await expect(field).toHaveAttribute("data-feeding-dust", "true");
    await page.screenshot({ path: `test-results/${viewport.width}-black-hole-rest.png` });
    await advanceTo(61);
    await expect(field).toHaveAttribute("data-gravity-cycle", "0");
    await expect(field).toHaveAttribute("data-gravity-phase", "rest");
    await advanceTo(65);
    await expect(field).toHaveAttribute("data-gravity-cycle", "1");
    await expect(field).toHaveAttribute("data-visitor-count", "5");
    await expect(field).toHaveAttribute("data-visitor-direction", "top");
    assert.ok(Number(await field.getAttribute("data-visitor-opacity")) > .35, "a different cached planet must appear after the quiet interval");
    await expect(field).toHaveAttribute("data-pull", "1.000");
    await page.screenshot({ path: `test-results/${viewport.width}-second-gravity-visitor.png` });
    await advanceTo(78);
    await page.screenshot({ path: `test-results/${viewport.width}-five-gravity-visitors.png` });
    assert.ok(Number(await field.getAttribute("data-visible-visitors")) > 0, "the five-planet orbit must enter from above");
    assert.ok(Number(await field.getAttribute("data-draw-calls")) < 65);
    assert.equal(await page.locator("canvas").count(), 2);
    const contactHit = await page.locator('#contact a[href*="wa.me"]').evaluate((link) => {
      const rect = link.getBoundingClientRect();
      return document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2)?.closest("a") === link;
    });
    assert.equal(contactHit, true, "the repeat visitor must not block the contact action");
    assert.deepEqual(errors, []);
    await page.close();
    console.log(`birth, continuous dust and 30-second recurrence passed at ${viewport.width}x${viewport.height}`);
  }
} finally { await browser.close(); }
