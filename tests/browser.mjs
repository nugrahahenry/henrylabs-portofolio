import assert from "node:assert/strict";
import { existsSync, mkdirSync } from "node:fs";
import { chromium, expect } from "@playwright/test";

const executablePath = process.env.CHROME_PATH ?? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const baseUrl = process.env.PORTFOLIO_URL ?? "http://localhost:3001/";
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
    await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
    await page.locator(".certificate-shelf").waitFor();
    await page.locator(".intro-loader").waitFor({ state: "hidden" });
    const result = await page.evaluate(() => ({
      viewport: innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      planets: document.querySelectorAll(".planet-label").length,
      certificates: document.querySelectorAll(".certificate-card").length,
      sourceLinks: document.querySelectorAll("a[href*='/assets/certificates/source/']").length,
      chapterRails: document.querySelectorAll(".chapter-rail").length,
      phaseBridges: document.querySelectorAll(".phase-bridge").length,
      stackMarquees: document.querySelectorAll(".stack-marquee").length,
      stackOrbits: document.querySelectorAll(".stack-orbit").length,
      stackGroups: document.querySelectorAll(".maker-orbit-track").length,
      showcaseWorlds: document.querySelectorAll(".project-showcase-index [role='tab']").length,
      worldChainNodes: document.querySelectorAll(".world-chain-node").length,
      heroTelemetry: document.querySelectorAll(".hero-telemetry span").length,
    }));
    assert.equal(result.viewport, viewport.width);
    assert.equal(result.scrollWidth, viewport.width);
    assert.equal(result.planets, 5);
    assert.equal(result.certificates, 5);
    assert.equal(result.sourceLinks, 5);
    assert.equal(result.chapterRails, 0);
    assert.equal(result.phaseBridges, 0);
    assert.equal(result.stackMarquees, 0);
    assert.equal(result.stackOrbits, 0);
    assert.equal(result.stackGroups, 3);
    assert.equal(result.showcaseWorlds, 5);
    assert.equal(result.worldChainNodes, 5);
    assert.equal(result.heroTelemetry, 3);
    assert.equal(await page.locator(".certificate-feature-preview > img").getAttribute("src"), "/assets/certificates/previews/google-student-ambassador.png");
    await page.getByRole("button", { name: /Open full archive/ }).click();
    await expect(page.locator(".certificate-card")).toHaveCount(26);
    assert.equal(await page.locator("a[href*='/assets/certificates/source/']").count(), 8);
    await page.getByRole("tab", { name: "Completion badge", exact: true }).click();
    await expect(page.locator(".certificate-card")).toHaveCount(17);
    await page.getByRole("tab", { name: "All", exact: true }).click();
    await expect(page.locator(".certificate-card")).toHaveCount(26);
    await page.getByRole("button", { name: /Show featured five/ }).click();
    await expect(page.locator(".certificate-card")).toHaveCount(5);
    const featuredTitle = await page.locator(".certificate-feature-copy h3").innerText();
    await page.getByRole("button", { name: "Next featured credential" }).click();
    await expect.poll(async () => page.locator(".certificate-feature-copy h3").innerText()).not.toBe(featuredTitle);
    await page.getByRole("button", { name: "Previous featured credential" }).click();
    await expect.poll(async () => page.locator(".certificate-feature-copy h3").innerText()).toBe(featuredTitle);
    await expect(page.locator('a[href="https://www.linkedin.com/in/nugrahahenry/"]')).toHaveCount(1);

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
    const directPlanetLabel = page.locator(".planet-label").nth(1);
    const directPlanetBounds = await directPlanetLabel.boundingBox();
    assert.ok(directPlanetBounds, "Nalira label should be projected for direct canvas click");
    await page.mouse.click(directPlanetBounds.x + directPlanetBounds.width / 2, directPlanetBounds.y - 30);
    await expect(page.locator(".project-showcase")).toContainText("Nalira");
    await page.getByRole("tab", { name: "Focus Canox" }).click();
    await expect(page.locator(".project-showcase")).toContainText("Canox");
    await expect(page.locator(".dossier")).toContainText("Canox");
    assert.match(await page.locator(".dossier-art-evidence").innerText(), /PRIVATE WALKTHROUGH/);
    await page.locator(".planet-label").nth(2).evaluate((button) => button.click());
    await page.locator(".dossier").waitFor();
    assert.equal(await page.locator(".dossier-art-evidence span").count(), 3);
    await expect(page.locator(".project-showcase")).toContainText("Canox");
    await expect.poll(async () => page.locator(".dossier").innerText()).toMatch(/Context is the interface/);
    assert.match(await page.locator(".dossier").innerText(), /PRIVATE DETAILS STAY PROTECTED/);
    assert.equal(await page.locator(".dossier-sequence span").count(), 3);
    await page.locator(".planet-label").first().evaluate((button) => button.click());
    await expect(page.locator(".project-showcase")).toContainText("Catmoji");
    await expect.poll(async () => page.locator(".dossier").innerText()).toMatch(/Read source/);
    assert.equal(await page.locator(".dossier-art-preview").count(), 1);
    await page.locator(".certificate-feature-preview").click();
    await page.locator('[role="dialog"]').waitFor();
    assert.match(await page.locator('[role="dialog"]').innerText(), /Google Student Ambassador/i);
    await page.keyboard.press("Escape");
    await page.locator('[role="dialog"]').waitFor({ state: "detached" });
    await expect(page.locator(".certificate-feature-preview")).toBeFocused();
    assert.deepEqual(errors, []);
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.locator(".intro-loader")).toHaveClass(/intro-loader--done/);
    await page.close();

    const reducedPage = await browser.newPage({ viewport, reducedMotion: "reduce" });
    await reducedPage.goto(baseUrl, { waitUntil: "domcontentloaded" });
    await expect(reducedPage.locator(".intro-loader")).toHaveClass(/intro-loader--done/);
    await expect(reducedPage.locator(".site-shell")).toHaveAttribute("data-motion", "off");
    await expect(reducedPage.locator(".hero-stage")).toHaveAttribute("data-phase", "all");
    await reducedPage.close();
    console.log(`browser QA passed at ${viewport.width}x${viewport.height}`);
  }
} finally {
  await browser.close();
}
