import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { chromium, expect } from "@playwright/test";

// Capture the actual public interface; never read private project or portrait sources.
const url = process.env.PORTFOLIO_URL ?? "http://localhost:3002/";
const output = "test-results/readme-frames";
const { version } = JSON.parse(readFileSync("package.json", "utf8"));
mkdirSync(output, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROME_PATH ?? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
});
const errors = [];
try {
  const page = await browser.newPage({ viewport: { width: 1360, height: 900 }, deviceScaleFactor: 1 });
  page.on("pageerror", error => errors.push(error.message));
  await page.addInitScript(() => sessionStorage.setItem("henrylabs-intro-seen", "1"));
  await page.clock.install();
  await page.clock.pauseAt(new Date());
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.clock.runFor(2200);
  await expect(page.locator(".intro-loader")).toBeHidden();
  await page.locator(".hero-stage").evaluate(hero => window.scrollTo({
    top: scrollY + hero.getBoundingClientRect().top + (hero.offsetHeight - innerHeight) * .65,
    behavior: "instant",
  }));
  await page.clock.runFor(1200);
  await expect(page.locator(".hero-stage")).toHaveAttribute("data-phase", "worlds");
  await expect(page.locator(".cosmic-canvas")).toHaveAttribute("data-ready", "true");
  // Exclude browser chrome and development controls without changing the artwork.
  const clip = { x: 0, y: 76, width: 1360, height: 824 };
  let frame = 0;
  const record = async count => {
    for (let n = 0; n < count; n++) {
      await page.clock.runFor(100);
      await page.screenshot({ path: `${output}/frame-${String(frame++).padStart(3, "0")}.png`, clip });
    }
  };
  await page.screenshot({ path: `${output}/universe.png`, clip });
  console.log("Capturing three-galaxy overview");
  await record(14);
  await page.getByRole("button", { name: "Explore HenryLabs galaxy", exact: true }).evaluate(button => button.click());
  console.log("Capturing native galaxy approach");
  await record(16);
  await expect(page.locator(".cosmic-canvas")).toHaveAttribute("data-flight", "1.000");
  console.log("Capturing project identities and technology satellites");
  await record(14);
  await page.screenshot({ path: `${output}/worlds.png`, clip });
  await page.locator(".planet-label").filter({ hasText: "Nalira" }).evaluate(button => button.click());
  await record(24);
  await page.screenshot({ path: `${output}/nalira.png`, clip });
  await page.getByRole("button", { name: "Back to universe", exact: true }).evaluate(button => button.click());
  console.log("Capturing return to the universe");
  await record(20);
  await expect(page.locator(".cosmic-canvas")).toHaveAttribute("data-flight", "0.000");
  assert.deepEqual(errors, []);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  writeFileSync(`${output}/capture.json`, JSON.stringify({
    source: `HenryLabs Portfolio v${version}`, viewport: { width: 1360, height: 900 },
    clip, frames: frame, frameDurationMs: 100, errors,
    sequence: ["Three galaxies", "HenryLabs approach", "Catmoji orbit", "Nalira focus", "Universe return"],
  }, null, 2));
  console.log(`Captured ${frame} genuine browser frames; no page errors or horizontal overflow.`);
} finally {
  await browser.close();
}
