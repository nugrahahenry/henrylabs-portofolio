import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { chromium, expect } from "@playwright/test";

const base = process.env.PORTFOLIO_URL ?? "http://localhost:3002";
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe" });
mkdirSync("test-results/polara-story", { recursive: true });
try {
  for (const [width, height, lang] of [[1440, 900, "en"], [768, 1024, "en"], [390, 844, "id"], [320, 740, "en"], [844, 390, "id"]]) {
    const page = await browser.newPage({ viewport: { width, height }, hasTouch: width < 500, reducedMotion: width === 320 ? "reduce" : "no-preference" });
    const errors = [], videos = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("request", req => { if (req.url().includes("walkthrough.webm")) videos.push(req.url()); });
    await page.goto(`${base}/projects/polara?from=universe&lang=${lang}`);
    await expect(page.locator("html")).toHaveAttribute("data-preferences-ready", "true");
    await expect(page.locator("h1")).toHaveText("Polara");
    assert.deepEqual(videos, [], "video bytes are not loaded on arrival");
    const video = page.locator(".polara-demo video");
    const openingMedia = await video.boundingBox();
    if (height > 600) assert.ok(openingMedia.y < height - 110, "actual product media is visible in the first viewport");
    assert.equal(await video.evaluate(v => v.paused && !v.autoplay && !v.loop), true);
    await video.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `test-results/polara-story/${width}-demo.png` });
    await video.evaluate(v => v.play());
    await expect.poll(() => video.evaluate(v => v.currentTime), { timeout: 15000 }).toBeGreaterThan(.5);
    const pixels = await video.evaluate(v => {
      const canvas = document.createElement("canvas"); canvas.width = 144; canvas.height = 100;
      const ctx = canvas.getContext("2d"); ctx.drawImage(v, 0, 0, 144, 100);
      return [...ctx.getImageData(0, 0, 144, 100).data].filter(value => value > 90).length;
    });
    assert.ok(pixels > 1000, "real decoded product video is not blank");
    await video.evaluate(v => v.pause());
    await page.locator(".polara-transcript summary").click();
    await expect(page.locator(".polara-transcript")).toHaveAttribute("open", "");
    for (const opener of await page.locator(".polara-story .project-visual-open").all()) {
      await opener.click();
      const dialog = page.getByRole("dialog");
      const zoom = dialog.getByRole("button", { name: lang === "en" ? "Zoom screenshot" : "Perbesar screenshot", exact: true });
      await expect(zoom).toBeEnabled();
      await expect(dialog).toContainText(lang === "en" ? "Fictional sample photos" : "Foto contoh fiktif");
      await zoom.click();
      const region = dialog.locator(".project-art-stage");
      await expect(region).toBeFocused();
      await page.keyboard.press("ArrowRight");
      await expect.poll(() => region.evaluate(n => n.scrollLeft)).toBeGreaterThan(0);
      await page.keyboard.press("Escape");
      await expect(opener).toBeFocused();
      await expect(dialog).toHaveCount(0);
    }
    await page.locator(".polara-result").scrollIntoViewIfNeeded();
    await page.screenshot({ path: `test-results/polara-story/${width}-result.png` });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "no overflow");
    for (const text of await page.locator(".polara-story h2, .polara-story h3, .polara-story p").all()) {
      assert.ok(await text.evaluate(n => n.scrollWidth <= n.clientWidth + 1), "copy fits");
    }
    const back = page.locator(".detail-route a");
    await expect(back).toHaveAttribute("href", new RegExp("world=polara"));
    await page.evaluate(async () => {
      document.activeElement?.blur();
      window.scrollTo({ top: 0, behavior: "instant" });
      await document.fonts.ready;
    });
    await page.mouse.move(0, 0);
    await page.waitForTimeout(600);
    await page.screenshot({ path: `test-results/polara-story/${width}-page.png`, fullPage: true });
    assert.deepEqual(errors, []);
    await page.close();
    console.log(`PASS Polara ${width}x${height} ${lang}: video, screenshots, zoom, keyboard, focus, layout`);
  }
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(`${base}/projects?q=polara&motion=off`);
  await page.locator("#project-card-polara").click();
  await expect(page.locator(".polara-story")).toBeVisible();
  await page.locator(".detail-route a").click();
  await expect(page.locator("#project-card-polara")).toBeFocused();
  await expect(page.locator(".project-record")).toHaveCount(1);
  await page.goto(`${base}/projects/catmoji?motion=off`);
  await expect(page.locator(".polara-story")).toHaveCount(0);
  await page.locator(".project-visual-open").click();
  await expect(page.getByRole("dialog")).toContainText("Original artwork, not an application screenshot.");
  await page.keyboard.press("Escape");
  let failImage = true, failVideo = true;
  await page.route("**/assets/projects/polara/review.webp*", route => failImage ? route.abort() : route.continue());
  await page.route("**/assets/projects/polara/walkthrough.webm*", route => failVideo ? route.abort() : route.continue());
  await page.goto(`${base}/projects/polara?motion=off`);
  await page.locator(".polara-captures").scrollIntoViewIfNeeded();
  await expect(page.getByRole("button", { name: "Retry screenshot", exact: true })).toBeVisible();
  failImage = false;
  await page.getByRole("button", { name: "Retry screenshot", exact: true }).click();
  await expect(page.locator(".polara-captures .project-visual-open").first()).toBeEnabled();
  await page.locator(".polara-captures .project-visual-open").first().click();
  await expect(page.getByRole("button", { name: "Zoom screenshot", exact: true })).toBeEnabled();
  await page.keyboard.press("Escape");
  await page.locator("video").evaluate(v => v.load());
  await expect(page.locator(".polara-video-error")).toBeVisible();
  failVideo = false;
  await page.getByRole("button", { name: "Retry video", exact: true }).click();
  await page.locator("video").evaluate(v => v.play());
  await expect.poll(() => page.locator("video").evaluate(v => v.currentTime)).toBeGreaterThan(.2);
  await expect(page.locator(".polara-video-error")).toHaveCount(0);
  console.log("PASS filtered return, unchanged artwork, image/video failure and recovery");
  await page.close();
} finally { await browser.close(); }
