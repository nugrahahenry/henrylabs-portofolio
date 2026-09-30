import assert from "node:assert/strict";
import { existsSync, mkdirSync } from "node:fs";
import { chromium, expect } from "@playwright/test";

const executablePath = process.env.CHROME_PATH ?? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const browser = await chromium.launch({
  headless: true,
  ...(existsSync(executablePath) ? { executablePath } : {}),
});

try {
  mkdirSync("test-results", { recursive: true });
  for (const viewport of [{ width: 1280, height: 800 }, { width: 768, height: 1024 }, { width: 390, height: 844 }]) {
    const page = await browser.newPage({ viewport, reducedMotion: "no-preference" });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("http://localhost:3001/", { waitUntil: "domcontentloaded" });
    await page.locator(".certificate-shelf").waitFor();
    await page.locator(".intro-loader").waitFor({ state: "hidden" });
    const result = await page.evaluate(() => ({
      viewport: innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      planets: document.querySelectorAll(".planet-label").length,
      certificates: document.querySelectorAll(".certificate-card").length,
      sourceLinks: document.querySelectorAll(".certificate-foot a").length,
      chapterRails: document.querySelectorAll(".chapter-rail").length,
      phaseBridges: document.querySelectorAll(".phase-bridge").length,
      stackMarquees: document.querySelectorAll(".stack-marquee").length,
      stackOrbits: document.querySelectorAll(".stack-orbit").length,
      stackGroups: document.querySelectorAll(".stack-manifest-row").length,
    }));
    assert.equal(result.viewport, viewport.width);
    assert.equal(result.scrollWidth, viewport.width);
    assert.equal(result.planets, 5);
    assert.equal(result.certificates, 8);
    assert.equal(result.sourceLinks, 6);
    assert.equal(result.chapterRails, 0);
    assert.equal(result.phaseBridges, 0);
    assert.equal(result.stackMarquees, 0);
    assert.equal(result.stackOrbits, 0);
    assert.equal(result.stackGroups, 3);

    await page.evaluate(() => window.scrollTo({ top: innerHeight, behavior: "instant" }));
    await expect(page.locator(".hero-stage")).toHaveAttribute("data-phase", "worlds");
    const scene = page.locator(".cosmic-canvas");
    await expect(scene).toHaveAttribute("data-ready", "true");
    const angle = Number(await scene.getAttribute("data-angle"));
    await expect.poll(async () => Number(await scene.getAttribute("data-angle"))).toBeGreaterThan(angle + .02);
    const hasPixels = await page.locator(".cosmic-canvas canvas").evaluate((canvas) => new Promise((resolve) => {
      requestAnimationFrame(() => {
        const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
        if (!gl) return resolve(false);
        const pixels = new Uint8Array(gl.drawingBufferWidth * gl.drawingBufferHeight * 4);
        gl.readPixels(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
        let painted = 0;
        for (let i = 3; i < pixels.length; i += 4) if (pixels[i] > 20) painted++;
        resolve(painted > pixels.length / 400);
      });
    }));
    assert.equal(hasPixels, true, "WebGL scene must contain painted pixels");
    await page.screenshot({ path: `test-results/${viewport.width}-orbit.png` });

    const bounds = await scene.boundingBox();
    const beforeDrag = Number(await scene.getAttribute("data-angle"));
    await page.mouse.move(bounds.x + bounds.width * .35, bounds.y + bounds.height * .35);
    await page.mouse.down();
    await page.mouse.move(bounds.x + bounds.width * .7, bounds.y + bounds.height * .35, { steps: 8 });
    await page.mouse.up();
    await expect.poll(async () => Number(await scene.getAttribute("data-angle"))).toBeGreaterThan(beforeDrag + .4);
    await page.screenshot({ path: `test-results/${viewport.width}-orbit-drag.png` });
    await page.locator(".project-row").nth(2).click();
    await page.locator(".dossier").waitFor();
    assert.match(await page.locator(".dossier").innerText(), /Context is the interface/);
    assert.match(await page.locator(".dossier").innerText(), /PRIVATE DETAILS STAY PROTECTED/);
    await page.locator(".project-row").first().click();
    assert.match(await page.locator(".dossier").innerText(), /Read source/);
    assert.equal(await page.locator(".dossier-art-preview").count(), 1);
    await page.locator(".certificate-card").first().getByRole("button").click();
    await page.locator('[role="dialog"]').waitFor();
    assert.match(await page.locator('[role="dialog"]').innerText(), /Gemini Certified Educator/);
    await page.keyboard.press("Escape");
    await page.locator('[role="dialog"]').waitFor({ state: "detached" });
    assert.deepEqual(errors, []);
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.locator(".intro-loader")).toHaveClass(/intro-loader--done/);
    await page.close();

    const reducedPage = await browser.newPage({ viewport, reducedMotion: "reduce" });
    await reducedPage.goto("http://localhost:3001/", { waitUntil: "domcontentloaded" });
    await expect(reducedPage.locator(".intro-loader")).toHaveClass(/intro-loader--done/);
    await expect(reducedPage.locator(".site-shell")).toHaveAttribute("data-motion", "off");
    await expect(reducedPage.locator(".hero-stage")).toHaveAttribute("data-phase", "all");
    await reducedPage.close();
    console.log(`browser QA passed at ${viewport.width}x${viewport.height}`);
  }
} finally {
  await browser.close();
}
