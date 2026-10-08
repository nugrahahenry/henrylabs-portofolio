import assert from "node:assert/strict";
import { existsSync, mkdirSync } from "node:fs";
import { chromium, expect } from "@playwright/test";

const executablePath = process.env.CHROME_PATH ?? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const baseUrl = process.env.PORTFOLIO_URL ?? "http://localhost:3001/";
const browser = await chromium.launch({
  headless: true,
  ...(existsSync(executablePath) ? { executablePath } : {}),
});

async function clearDragPoint(page, bounds) {
  return page.evaluate((rect) => {
    for (const y of [.18, .3, .42]) for (const x of [.16, .3, .44]) {
      const point = { x: rect.x + rect.width * x, y: rect.y + rect.height * y };
      const target = document.elementFromPoint(point.x, point.y);
      if (target?.closest(".cosmic-canvas") && !target.closest("button, a")) return point;
    }
    throw new Error("no unobstructed canvas area for orbit drag");
  }, bounds);
}

try {
  mkdirSync("test-results", { recursive: true });
  const sizes = [{ width: 1440, height: 900 }, { width: 1024, height: 768 }, { width: 768, height: 1024 }, { width: 390, height: 844 }, { width: 360, height: 800 }];
  for (const viewport of process.argv.includes("--phone") ? sizes.slice(-1) : process.argv.includes("--desktop") ? sizes.slice(0, 1) : sizes) {
    const page = await browser.newPage({ viewport, reducedMotion: "no-preference" });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
    await page.locator(".maker-chapter").waitFor();
    await page.locator(".intro-loader").waitFor({ state: "hidden" });
    const result = await page.evaluate(() => ({
      viewport: innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      planets: document.querySelectorAll(".planet-label").length,
      galaxies: document.querySelectorAll(".galaxy-label").length,
      certificates: document.querySelectorAll(".maker-evidence-card").length,
      sourceLinks: document.querySelectorAll("a[href*='/assets/certificates/source/']").length,
      chapterRails: document.querySelectorAll(".chapter-rail").length,
      phaseBridges: document.querySelectorAll(".phase-bridge").length,
      stackMarquees: document.querySelectorAll(".stack-marquee").length,
      stackOrbits: document.querySelectorAll(".stack-orbit").length,
      stackGroups: document.querySelectorAll(".maker-groups button").length,
      techNodes: document.querySelectorAll(".maker-tool").length,
      stackInspector: document.querySelectorAll(".maker-tool-detail").length,
      makerPortrait: document.querySelectorAll(".portrait-reveal").length,
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
      scrollDriver: document.documentElement.dataset.scrollDriver ?? "",
    }));
    assert.equal(result.viewport, viewport.width);
    assert.equal(result.scrollWidth, viewport.width);
    assert.equal(result.planets, 0);
    assert.equal(result.galaxies, 3);
    assert.equal(result.certificates, 5);
    assert.equal(result.sourceLinks, 0);
    assert.equal(result.chapterRails, 0);
    assert.equal(result.phaseBridges, 0);
    assert.equal(result.stackMarquees, 0);
    assert.equal(result.stackOrbits, 0);
    assert.equal(result.stackGroups, 3);
    assert.equal(result.techNodes, 6);
    assert.equal(result.stackInspector, 1);
    assert.equal(result.makerPortrait, 1);

    assert.equal(result.academicSourceLinks, 0);
    assert.equal(result.academicCards, 0);
    assert.equal(result.academicStackChips, 0);
    assert.equal(result.showcaseWorlds, 0);
    assert.equal(result.continuumNodes, 0);
    assert.equal(result.continuumRouteStages, 0);
    assert.equal(result.worldlineActiveStages, 0);
    assert.equal(result.heroTelemetry, 3);
    assert.equal(result.starFields, 2);
    assert.ok(result.credentialControlHeights.every((height) => height >= 44), `credential controls must remain touchable: ${result.credentialControlHeights}`);
    assert.equal(result.clientEvidenceMaps, 0);
    assert.equal(result.methodScenes, 0);
    assert.equal(result.projectSignatures, 0);
    assert.equal(result.fieldContinuum, 1);
    assert.equal(result.fieldContinuumOrbits, 0);
    assert.equal(result.worldlineBackdrops, 1);
    assert.equal(result.worldlineBackdropPosition, "fixed");
    assert.equal(result.scrollDriver, "lenis-gsap");
    await expect(page.locator(".home-project-preview")).toHaveCount(1);
    await expect(page.locator(".maker-evidence-card img").first()).toHaveAttribute("src", "/assets/certificates/thumbnails/google-student-ambassador.webp");
    await expect(page.getByRole("link", { name: /Credential library/ })).toHaveAttribute("href", /\/credentials/);
    await expect(page.getByRole("button", { name: /Open full archive/ })).toHaveCount(0);
    await expect(page.locator('a[href="https://www.linkedin.com/in/nugrahahenry/"]')).toHaveCount(1);
    await page.locator("#stack").evaluate(node => window.scrollTo({top: scrollY + node.getBoundingClientRect().top, behavior: "instant"}));
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
    await page.locator(".hero-stage").evaluate((hero) => window.scrollTo({ top: scrollY + hero.getBoundingClientRect().top + (hero.offsetHeight - innerHeight) * .7, behavior: "instant" }));
    await expect(page.locator(".hero-stage")).toHaveAttribute("data-phase", "worlds");
    const scene = page.locator(".cosmic-canvas");
    await page.getByRole("button", { name: "Explore HenryLabs galaxy", exact: true }).focus();
    await page.keyboard.press("Enter");
    await expect(scene).toHaveAttribute("data-flight", "1.000");
    await page.locator(".planet-label").filter({ hasText: "Nalira" }).press("Enter");
    await expect(scene).toHaveAttribute("data-ready", "true");
    await expect(scene).toHaveAttribute("data-tech-count", "15");
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
    await page.getByRole("button", { name: "Reset planet zoom" }).click();
    await page.getByRole("button", { name: "Zoom in on planets" }).click();
    await expect(scene).toHaveAttribute("data-view-zoom", "0.12");
    await page.getByRole("button", { name: "Reset planet zoom" }).click();
    await expect(scene).toHaveAttribute("data-view-zoom", "0.00");
    await expect(page.locator(".project-showcase")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Open active world" })).toBeVisible();
    await page.getByRole("button", { name: "Open active world" }).click();
    await expect(page.getByRole("button", { name: "Close active world" })).toBeVisible();
    await expect(page.locator(".project-showcase-index [role='tab']")).toHaveCount(5);
    await expect.poll(() => page.locator(".project-showcase").evaluate((panel) => Number(getComputedStyle(panel).opacity))).toBe(1);
    await expect(page.getByRole("button", { name: "Close active world" })).toBeInViewport({ ratio: 1 });
    await page.getByRole("button", { name: "Close active world" }).click();
    await expect(page.locator(".project-showcase")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Open active world" })).toBeVisible();
    await page.screenshot({ path: `test-results/${viewport.width}-orbit.png` });

    const bounds = await scene.boundingBox();
    const horizontalStart = await clearDragPoint(page, bounds);
    const beforeDrag = Number(await scene.getAttribute("data-angle"));
    await page.mouse.move(horizontalStart.x, horizontalStart.y);
    await page.mouse.down();
    await page.mouse.move(horizontalStart.x + bounds.width * .3, horizontalStart.y, { steps: 8 });
    await page.mouse.up();
    await expect.poll(async () => Math.abs(Number(await scene.getAttribute("data-angle")) - beforeDrag)).toBeGreaterThan(.15);
    await page.screenshot({ path: `test-results/${viewport.width}-orbit-drag.png` });
    const verticalBounds = await scene.boundingBox();
    const verticalStart = await clearDragPoint(page, verticalBounds);
    const beforePitch = Number(await scene.getAttribute("data-pitch"));
    await page.mouse.move(verticalStart.x, verticalStart.y);
    await page.mouse.down();
    await page.mouse.move(verticalStart.x, verticalStart.y + verticalBounds.height * .3, { steps: 8 });
    await page.mouse.up();
    await expect.poll(async () => Math.abs(Number(await scene.getAttribute("data-pitch")) - beforePitch)).toBeGreaterThan(.1);
    const directPlanetLabel = page.locator(".planet-label").nth(1);
    const directPlanetBounds = await directPlanetLabel.boundingBox();
    assert.ok(directPlanetBounds, "Nalira label should be projected for direct canvas click");
    await page.mouse.click(directPlanetBounds.x + directPlanetBounds.width / 2, directPlanetBounds.y - 30);
    // After free rotation, a nearer planet may occlude this screen-space point.
    // Verify the raycast-selected world rather than assuming an unoccluded Nalira.
    await expect(scene).toHaveAttribute("data-view-zoom", "0.20");
    const pickedWorld = await scene.getAttribute("data-active-world");
    const worldNames = { catmoji: "Catmoji", nalira: "Nalira", canox: "Canox", hengs: "Hengs", polara: "Polara" };
    assert.ok(worldNames[pickedWorld]);
    await expect(page.locator(".project-showcase")).toHaveCount(0);
    await page.getByRole("button", { name: "Open active world" }).click();
    await expect(page.locator(".project-showcase")).toHaveAttribute("aria-label", `Active project: ${worldNames[pickedWorld]}`);
    await page.getByRole("tab", { name: "Focus Canox" }).click();
    await expect(page.locator(".project-showcase")).toContainText("Canox");
    await expect(scene).toHaveAttribute("data-linked-tech-count", "3");
    await expect(page.locator(".home-project-preview")).toHaveAttribute("data-project", "canox");
    await expect(page.locator(".home-project-preview")).toContainText(/private/i);
    await expect(page.locator(".home-project-preview a").last()).toHaveAttribute("href", /\/projects\/canox/);
    await page.locator(".planet-label").first().evaluate((button) => button.click());
    await expect(page.locator(".project-showcase")).toContainText("Catmoji");
    await expect(page.locator(".home-project-preview")).toHaveAttribute("data-project", "catmoji");
    await expect(page.locator(".home-project-preview a").last()).toHaveAttribute("href", /\/projects\/catmoji/);
    assert.equal(await page.locator(".home-project-media > img").count(), 1);
    await page.locator(".maker-chapter").evaluate(node => window.scrollTo({top: scrollY + node.getBoundingClientRect().top + Math.max(0, node.offsetHeight-innerHeight)*.94, behavior: "instant"}));
    await page.locator(".maker-evidence-card").first().click();
    await page.getByRole("dialog").waitFor();
    assert.match(await page.getByRole("dialog").innerText(), /Google Student Ambassador/i);
    assert.equal(await page.locator(".credential-dialog").evaluate((modal) => getComputedStyle(modal).backgroundColor), "rgb(15, 23, 31)");
    await expect(page.locator(".credential-dialog-stage")).toHaveAttribute("data-image-state", "ready");
    assert.equal(await page.locator("[data-credential-original]").evaluate((image) => image.complete && image.naturalWidth > 0), true);
    await page.screenshot({ path: `test-results/${viewport.width}-credential-modal.png` });
    await expect.poll(async () => (await page.getByRole("button", { name: "Close certificate viewer" }).boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
    await page.keyboard.press("Escape");
    await page.getByRole("dialog").waitFor({ state: "detached" });
    await expect(page.locator(".maker-evidence-card").first()).toBeFocused();
    await page.locator("#contact").scrollIntoViewIfNeeded();
    await expect(page.locator("#contact h2")).toBeInViewport();
    await page.waitForTimeout(500);
    assert.equal(await page.locator(".contact-section").evaluate((section) => getComputedStyle(section).backgroundColor), "rgba(0, 0, 0, 0)");
    await page.screenshot({ path: `test-results/${viewport.width}-contact.png` });
    assert.deepEqual(errors, []);
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.locator("html")).toHaveAttribute("data-preferences-ready", "true", { timeout: 20000 });
    await expect(page.locator(".intro-loader")).toHaveClass(/intro-loader--done/);
    await page.close();

    const reducedPage = await browser.newPage({ viewport, reducedMotion: "reduce" });
    await reducedPage.goto(baseUrl, { waitUntil: "domcontentloaded" });
    await expect(reducedPage.locator("html")).toHaveAttribute("data-preferences-ready", "true", { timeout: 20000 });
    await expect(reducedPage.locator(".intro-loader")).toHaveClass(/intro-loader--done/);
    await expect(reducedPage.locator(".site-shell")).toHaveAttribute("data-motion", "off");
    await expect(reducedPage.locator(".hero-stage")).toHaveAttribute("data-phase", "all");
    await expect(reducedPage.locator(".maker-principles span")).toHaveCount(3);
    await expect(reducedPage.locator(".method-scene")).toHaveCount(0);
    await reducedPage.close();
    console.log(`browser QA passed at ${viewport.width}x${viewport.height}`);
  }
} finally {
  await browser.close();
}
