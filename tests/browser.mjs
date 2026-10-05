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
  for (const viewport of [{ width: 1440, height: 900 }, { width: 1024, height: 768 }, { width: 768, height: 1024 }, { width: 390, height: 844 }, { width: 360, height: 800 }]) {
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
      techNodes: document.querySelectorAll(".maker-tech").length,
      stackInspector: document.querySelectorAll(".maker-orbit-inspector").length,
      makerPortrait: document.querySelectorAll(".maker-core-portrait").length,
      makerActiveWorld: document.querySelector(".maker-core")?.dataset.activeWorld ?? "",
      academicSourceLinks: document.querySelectorAll(".academic-card-foot a[href*='github.com']").length,
      academicCards: document.querySelectorAll(".academic-card").length,
      academicStackChips: document.querySelectorAll(".academic-card-stack span").length,
      showcaseWorlds: document.querySelectorAll(".project-showcase-index [role='tab']").length,
      continuumNodes: document.querySelectorAll(".field-continuum-node").length,
      continuumRouteStages: document.querySelectorAll(".field-continuum-route-stage").length,
      worldlineActiveStages: document.querySelectorAll(".field-continuum-route-stage.is-active").length,
      heroTelemetry: document.querySelectorAll(".hero-telemetry span").length,
      starFields: document.querySelectorAll(".star-field").length,
      credentialControlHeights: [...document.querySelectorAll(".certificate-feature-switcher button, .certificate-archive-toggle")].map((control) => Math.round(control.getBoundingClientRect().height)),
      clientEvidenceMaps: document.querySelectorAll(".client-evidence-map").length,
      methodScenes: document.querySelectorAll(".method-scene").length,
      projectSignatures: document.querySelectorAll(".project-signature").length,
      fieldContinuum: document.querySelectorAll(".field-continuum").length,
      fieldContinuumOrbits: document.querySelectorAll(".field-continuum-orbit").length,
      worldlineBackdrops: document.querySelectorAll(".worldline-backdrop canvas").length,
      worldlineBackdropPosition: getComputedStyle(document.querySelector(".worldline-backdrop")).position,
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
    assert.equal(result.techNodes, 21);
    assert.equal(result.stackInspector, 1);
    assert.equal(result.makerPortrait, 1);
    assert.equal(result.makerActiveWorld, "catmoji");
    assert.equal(result.academicSourceLinks, 2);
    assert.equal(result.academicCards, 3);
    assert.equal(result.academicStackChips, 9);
    assert.equal(result.showcaseWorlds, 5);
    assert.equal(result.continuumNodes, 5);
    assert.equal(result.continuumRouteStages, 3);
    assert.equal(result.worldlineActiveStages, 1);
    assert.equal(result.heroTelemetry, 3);
    assert.equal(result.starFields, 2);
    assert.ok(result.credentialControlHeights.every((height) => height >= 44), `credential controls must remain touchable: ${result.credentialControlHeights}`);
    assert.equal(result.clientEvidenceMaps, 2);
    assert.equal(result.methodScenes, 1);
    assert.ok(result.projectSignatures >= 1);
    assert.equal(result.fieldContinuum, 1);
    assert.equal(result.fieldContinuumOrbits, 3);
    assert.equal(result.worldlineBackdrops, 1);
    assert.equal(result.worldlineBackdropPosition, "fixed");
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

    await page.locator("#stack").scrollIntoViewIfNeeded();
    await expect(page.locator(".field-continuum-route-stage.is-active b")).toContainText("STACK");
    await expect(page.locator(".field-continuum")).toHaveAttribute("data-worldline-stage", "stack");
    const worldlineBackdropMetrics = await page.locator(".worldline-backdrop canvas").evaluate((canvas) => new Promise((resolve) => {
      requestAnimationFrame(() => {
        const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
        if (!gl) return resolve({ gl: false, width: canvas.width, height: canvas.height, painted: false, ready: canvas.parentElement?.getAttribute("data-ready") });
        const pixels = new Uint8Array(gl.drawingBufferWidth * gl.drawingBufferHeight * 4);
        gl.readPixels(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
        let painted = 0;
        for (let i = 0; i < pixels.length; i += 4) if (pixels[i] > 20 || pixels[i + 1] > 20 || pixels[i + 2] > 20 || pixels[i + 3] > 20) painted++;
        resolve({ gl: true, painted: painted > pixels.length / 10000, ready: canvas.parentElement?.getAttribute("data-ready") });
      });
    }));
    assert.equal(worldlineBackdropMetrics.painted, true, "Worldline backdrop must contain painted WebGL pixels");
    assert.equal(worldlineBackdropMetrics.ready, "true", "Worldline backdrop must render after entering the field");
    await page.getByRole("button", { name: /Focus Nalira through Supabase/ }).click({ force: true });
    await expect(page.locator(".maker-orbit-inspector")).toContainText("Nalira");
    await expect(page.locator(".dossier-art-preview")).toHaveAttribute("src", "/assets/projects/nalira-ambient.svg");
    assert.equal(await page.locator(".dossier-art-preview").evaluate((image) => image.complete && image.naturalWidth > 0), true, "Nalira artwork must render");
    assert.equal(await page.locator(".maker-tech.is-linked").count(), 4);

    await page.evaluate(() => window.scrollTo({ top: innerHeight, behavior: "instant" }));
    await expect(page.locator(".hero-stage")).toHaveAttribute("data-phase", "worlds");
    const scene = page.locator(".cosmic-canvas");
    await expect(scene).toHaveAttribute("data-ready", "true");
    await expect(scene).toHaveAttribute("data-tech-count", "21");
    await expect(scene).toHaveAttribute("data-linked-tech-count", "4");
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
    const beforePitch = Number(await scene.getAttribute("data-pitch"));
    await page.mouse.move(bounds.x + bounds.width * .52, bounds.y + bounds.height * .35);
    await page.mouse.down();
    await page.mouse.move(bounds.x + bounds.width * .52, bounds.y + bounds.height * .72, { steps: 8 });
    await page.mouse.up();
    await expect.poll(async () => Number(await scene.getAttribute("data-pitch"))).toBeGreaterThan(beforePitch + .2);
    const directPlanetLabel = page.locator(".planet-label").nth(1);
    const directPlanetBounds = await directPlanetLabel.boundingBox();
    assert.ok(directPlanetBounds, "Nalira label should be projected for direct canvas click");
    await page.mouse.click(directPlanetBounds.x + directPlanetBounds.width / 2, directPlanetBounds.y - 30);
    await expect(page.locator(".project-showcase")).toContainText("Nalira");
    await page.getByRole("tab", { name: "Focus Canox" }).click();
    await expect(page.locator(".project-showcase")).toContainText("Canox");
    await expect(scene).toHaveAttribute("data-linked-tech-count", "3");
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
    await expect.poll(async () => (await page.locator(".certificate-modal-close").boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
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
