import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { chromium, expect } from "@playwright/test";

const base = (process.env.PORTFOLIO_URL ?? "http://localhost:3002").replace(/\/$/, "");
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH ?? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" });
const viewports = [{ width: 1440, height: 900 }, { width: 1024, height: 768 }, { width: 768, height: 1024 }, { width: 390, height: 844 }, { width: 360, height: 740 }, { width: 844, height: 390 }];
mkdirSync("test-results/libraries", { recursive: true });
async function fits(page) {
  await expect(page.locator("html")).toHaveAttribute("data-preferences-ready", "true", { timeout: 20000 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, "No horizontal overflow");
  assert.equal(await page.locator("canvas").count(), 0, "Reading routes do not mount WebGL");
}
try {
  for (const viewport of process.argv.includes("--integration") ? [] : viewports) {
    const page = await browser.newPage({ viewport });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(`${base}/projects`, { waitUntil: "domcontentloaded" });
    await expect(page.locator(".project-record")).toHaveCount(10);
    await fits(page);
    await page.screenshot({ path: `test-results/libraries/${viewport.width}-projects.png`, animations: "disabled" });
    await page.getByRole("button", { name: "University", exact: true }).click();
    await expect(page.locator(".project-record")).toHaveCount(3);
    await page.getByRole("searchbox", { name: "Search projects" }).fill("Laravel");
    await expect(page.locator(".project-record")).toHaveCount(1);
    await page.getByRole("link", { name: "LabQ", exact: true }).click();
    await expect(page.locator("h1")).toHaveText("LabQ");
    await fits(page);
    await expect(page.getByRole("link", { name: "Read source", exact: true })).toHaveAttribute("href", "https://github.com/nugrahahenry/labQ-Android");
    await page.getByRole("link", { name: "All projects", exact: true }).click();
    await expect(page.locator(".project-record")).toHaveCount(1);
    await expect(page.getByRole("searchbox")).toHaveValue("Laravel");
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.locator(".project-record")).toHaveCount(1);
    await page.goto(`${base}/credentials`);
    await expect(page.locator(".credential-record")).toHaveCount(26);
    await fits(page);
    await expect(page.locator(".credential-record").first()).toContainText("Google Student Ambassador");
    await page.screenshot({ path: `test-results/libraries/${viewport.width}-credentials.png`, animations: "disabled" });
    const trigger = page.getByRole("button", { name: "Open Class of 2026 Graduation", exact: true });
    await trigger.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.locator("img")).toHaveJSProperty("complete", true);
    assert.ok(await dialog.locator("img").evaluate(image => image.naturalWidth > 0));
    const bounds = await dialog.boundingBox();
    assert.ok(bounds.x >= 0 && bounds.y >= 0 && bounds.x + bounds.width <= viewport.width && bounds.y + bounds.height <= viewport.height);
    await page.screenshot({ path: `test-results/libraries/${viewport.width}-viewer.png` });
    for (let i = 0; i < 7; i++) { await page.keyboard.press("Tab"); assert.ok(await dialog.evaluate(el => el.contains(document.activeElement))); }
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await page.getByRole("combobox", { name: "Type", exact: true }).selectOption("Competition");
    await expect(page.locator(".credential-record")).toHaveCount(2);
    await page.getByRole("searchbox").fill("zzzzzz");
    await expect(page.locator(".credential-record")).toHaveCount(0);
    await page.getByRole("button", { name: "Clear filters" }).first().click();
    await expect(page.locator(".credential-record")).toHaveCount(26);
    assert.deepEqual(errors, []);
    await page.close();
    console.log(`Libraries, query return/reload, viewer/focus, overflow passed at ${viewport.width}x${viewport.height}`);
  }
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(`${base}/projects?lang=id&motion=off&category=client`);
  await expect(page.locator(".project-record")).toHaveCount(2);
  await expect(page.locator("html")).toHaveAttribute("lang", "id");
  await page.getByRole("link", { name: "Soreva Autonomous Content", exact: true }).click();
  await expect(page).toHaveURL(/lang=id/);
  await expect(page).toHaveURL(/motion=off/);
  await expect(page.locator(".detail-facts")).toContainText("Vieri");
  await page.goBack();
  await expect(page.locator(".project-record")).toHaveCount(2);
  await page.locator(".desktop-nav").getByRole("link", { name: "Credentials" }).click();
  await expect(page.locator("h1")).toHaveText("Jejak belajar.");
  await expect(page.locator("html")).toHaveAttribute("data-motion", "off");
  await page.goto(`${base}/credentials?kind=Certification&record=gemini-certified`);
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.reload();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("combobox", { name: "Type", exact: true })).toHaveValue("Certification");
  await page.goto(`${base}/projects/not-a-project`);
  await expect(page.locator("h1")).toHaveText("World not found.");
  await page.goto(`${base}/credentials?kind=invalid&record=unknown`);
  await expect(page.locator(".credential-record")).toHaveCount(26);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.goto(`${base}/projects?lang=id&motion=off`);
  await expect(page.locator("html")).toHaveAttribute("data-preferences-ready", "true");
  await page.locator(".desktop-nav").getByRole("link", { name: "Kontak" }).click();
  await expect(page.locator("#contact h2")).toBeInViewport({ timeout: 20000 });
  for (const slug of ["catmoji", "nalira", "canox", "hengs", "polara", "rentalmobil-sg", "pos-z-shoes", "labq", "y-ventures", "soreva"]) {
    const response = await page.request.get(`${base}/projects/${slug}`);
    assert.equal(response.status(), 200, slug);
    assert.match(await response.text(), /rel="canonical"/);
  }
  assert.equal((await page.request.get(`${base}/projects/unknown`)).status(), 404);
  await page.close();
  const reduced = await browser.newPage({ reducedMotion: "reduce" });
  await reduced.goto(`${base}/projects`);
  await expect(reduced.locator("html")).toHaveAttribute("data-motion", "off");
  await expect(reduced.locator(".motion-toggle")).toBeDisabled();
  await reduced.close();
  console.log("Language/motion propagation, native Back, direct viewer URLs, unknown values, 404, and reduced motion passed.");
  console.log("Cross-route Contact and all ten detail HTTP/canonical routes passed.");
} finally { await browser.close(); }
