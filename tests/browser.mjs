import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { chromium } from "@playwright/test";

const executablePath = process.env.CHROME_PATH ?? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const browser = await chromium.launch({
  headless: true,
  ...(existsSync(executablePath) ? { executablePath } : {}),
});

try {
  for (const viewport of [{ width: 1280, height: 800 }, { width: 390, height: 844 }]) {
    const page = await browser.newPage({ viewport });
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
    }));
    assert.equal(result.viewport, viewport.width);
    assert.equal(result.scrollWidth, viewport.width);
    assert.equal(result.planets, 5);
    assert.equal(result.certificates, 8);
    assert.equal(result.sourceLinks, 6);
    assert.equal(result.chapterRails, 0);
    assert.equal(result.phaseBridges, 0);
    assert.equal(result.stackMarquees, 0);
    await page.locator(".certificate-card").first().getByRole("button").click();
    await page.locator('[role="dialog"]').waitFor();
    assert.match(await page.locator('[role="dialog"]').innerText(), /Gemini Certified Educator/);
    await page.keyboard.press("Escape");
    await page.locator('[role="dialog"]').waitFor({ state: "detached" });
    await page.close();
    console.log(`browser QA passed at ${viewport.width}x${viewport.height}`);
  }
} finally {
  await browser.close();
}
