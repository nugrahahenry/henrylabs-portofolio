import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { chromium, expect as playwrightExpect } from "@playwright/test";

const expect = playwrightExpect.configure({ timeout: 20000 });

const base = process.env.PORTFOLIO_URL ?? "http://localhost:3002/";
const edgeCase = process.argv.find(argument => argument.startsWith("--case="))?.slice(7);
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe" });
mkdirSync("test-results/reading-return", { recursive: true });
async function makerAt(page, phase) {
  await page.locator(".maker-chapter").evaluate((node, phase) => {
    window.dispatchEvent(new Event("stargod:scroll-cancel"));
    window.scrollTo({ top: scrollY + node.getBoundingClientRect().top + (node.offsetHeight - innerHeight) * phase, behavior: "instant" });
  }, phase);
}
async function toolReturned(page) {
  await expect(page.locator(".maker-groups button[aria-pressed='true']")).toContainText("Interface");
  await expect(page.locator(".maker-tool-detail strong")).toHaveText("React");
  await expect(page.locator(".maker-tool-detail")).toBeInViewport();
  await expect(page.locator(".maker-tool-detail a").first()).toBeFocused();
}
try {
  for (const [width, height] of edgeCase || process.argv.includes("--edges") || process.argv.includes("--same-route") ? [] : [[1440, 900], [390, 844]]) {
    const page = await browser.newPage({ viewport: { width, height } });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.addInitScript(() => sessionStorage.setItem("henrylabs-intro-seen", "1"));
    await page.goto(new URL("/?world=nalira", base).href);
    await page.locator(".intro-loader").waitFor({ state: "hidden" });
    await expect(page.locator(".cosmic-canvas")).toHaveAttribute("data-ready", "true");
    await expect(page.locator(".cosmic-canvas")).toBeFocused();
    await makerAt(page, .2);
    await expect(page.locator(".maker-tool-detail strong")).toHaveText("React");
    await page.locator(".maker-tool-detail a").first().click();
    await expect(page.locator(".detail-heading h1")).toBeVisible();
    await page.getByRole("link", { name: "Back to technologies", exact: true }).click();
    await toolReturned(page);
    console.log(`PASS ${width} explicit tech return`);
    await page.screenshot({ path: `test-results/reading-return/${width}-tools.png` });
    await page.locator(".maker-tool-detail a").first().click();
    await expect(page.locator(".detail-heading h1")).toBeVisible();
    await page.goBack();
    await toolReturned(page);
    console.log(`PASS ${width} browser tech return`);
    await makerAt(page, .9);
    await page.getByRole("link", { name: "Credential library", exact: true }).click();
    await expect(page.locator(".credential-record")).toHaveCount(37);
    await page.screenshot({ path: `test-results/reading-return/${width}-library.png` });
    await page.getByRole("link", { name: "Back to selected credentials", exact: true }).click();
    await expect(page.locator(".maker-chapter")).toHaveAttribute("data-proof", "true");
    await expect(page.getByRole("link", { name: "Credential library", exact: true })).toBeFocused();
    await expect(page.locator(".maker-evidence-card").first()).toBeInViewport();
    await page.screenshot({ path: `test-results/reading-return/${width}-proof.png` });
    await page.getByRole("link", { name: "Credential library", exact: true }).click();
    await expect(page.locator(".credential-record")).toHaveCount(37);
    await page.goBack();
    await expect(page.getByRole("link", { name: "Credential library", exact: true })).toBeFocused();
    await expect(page.locator(".maker-evidence-card").first()).toBeInViewport();
    await page.goto(new URL("/projects?category=university&lang=id&motion=off", base).href);
    await expect(page.locator(".project-record-link")).toHaveCount(3);
    await expect(page.locator("html")).toHaveAttribute("lang", "id");
    const card = page.locator(".project-record-link").last();
    const name = await card.getAttribute("aria-labelledby");
    await card.click();
    await page.getByRole("link", { name: "Semua proyek", exact: true }).click();
    const returned = page.locator(`.project-record-link[aria-labelledby='${name}']`);
    await expect(returned).toBeFocused();
    await expect(returned).toBeInViewport();
    assert.equal(new URL(page.url()).searchParams.get("category"), "university");
    assert.equal(new URL(page.url()).searchParams.get("lang"), "id");
    assert.equal(new URL(page.url()).searchParams.get("motion"), "off");
    await returned.click();
    await expect(page.locator(".detail-heading h1")).toBeVisible();
    await page.goBack();
    await expect(returned).toBeFocused();
    await expect(returned).toBeInViewport();
    await page.getByRole("searchbox", { name: "Cari proyek" }).fill("Laravel");
    await expect(page.locator(".project-record-link")).toHaveCount(1);
    assert.equal(new URL(page.url()).hash, "");
    await expect(page.getByRole("searchbox")).toBeFocused();
    assert.deepEqual(errors, []);
    await page.close();
    console.log(`PASS contextual return ${width}x${height}`);
  }
  for (const [label, width, height, motion, reducedMotion] of process.argv.includes("--same-route") ? [] : [["landscape", 844, 390, "on", "no-preference"], ["still", 320, 740, "off", "no-preference"], ["reduced", 390, 844, "on", "reduce"]]) {
    if (edgeCase && label !== edgeCase) continue;
    const page = await browser.newPage({ viewport: { width, height }, reducedMotion });
    const errors = []; page.on("pageerror", error => errors.push(error.message));
    await page.addInitScript(() => {
      for (const key of ["localStorage", "sessionStorage"]) Object.defineProperty(window, key, { get() { throw new DOMException("Storage unavailable", "SecurityError"); } });
    });
    await page.goto(new URL(`/?chapter=tools&tool=react&group=all&world=soreva&lang=id&motion=${motion}`, base).href);
    await expect(page.locator(".maker-tool-detail strong")).toHaveText("React");
    await expect(page.locator(".maker-groups [aria-pressed='true']")).toContainText("All");
    const link = page.locator(".maker-tool-detail a").first();
    await expect(link).toBeFocused(); await expect(link).toBeInViewport();
    await link.click();
    await expect(page.locator(".detail-heading h1")).toBeVisible();
    await page.locator(".detail-continuation a").first().click();
    await page.getByRole("link", { name: "Kembali ke teknologi", exact: true }).click();
    await expect(link).toBeFocused(); await expect(link).toBeInViewport();
    await expect(page.locator(".maker-groups [aria-pressed='true']")).toContainText("All");
    await expect(page.locator(".maker-tool-detail strong")).toHaveText("React");
    assert.equal(new URL(page.url()).searchParams.get("world"), "soreva");
    await page.reload();
    await expect(link).toBeFocused(); await expect(link).toBeInViewport();
    if (label === "still") {
      await page.locator(".motion-toggle").evaluate(node => node.click());
      await expect(page.locator(".maker-chapter")).toHaveAttribute("data-spatial", "true");
      await expect(page.locator(".maker-chapter")).toHaveAttribute("data-proof", "false");
      await expect(page.locator(".maker-groups [aria-pressed='true']")).toContainText("All");
      await expect(page.locator(".maker-tool-detail strong")).toHaveText("React");
      await page.locator(".motion-toggle").evaluate(node => node.click());
      await expect(page.locator(".maker-chapter")).toHaveAttribute("data-spatial", "false");
      await expect(page.locator(".maker-tool-detail strong")).toHaveText("React");
    }
    await page.screenshot({ path: `test-results/reading-return/${label}-tools.png` });
    await page.goto(new URL(`/credentials?chapter=proof&world=soreva&lang=id&motion=${motion}`, base).href);
    await page.getByRole("link", { name: "Kembali ke kredensial pilihan", exact: true }).click();
    await expect(page.locator(".maker-proof-heading a")).toBeFocused();
    try { await expect(page.locator(".maker-evidence-card").first()).toBeInViewport(); }
    catch (error) {
      console.log(await page.evaluate(() => ({ y: scrollY, focus: document.activeElement?.outerHTML, nodes: [".maker-chapter", ".maker-proof-heading", ".maker-evidence-card"].map(selector => { const node = document.querySelector(selector); return { selector, bounds: node.getBoundingClientRect().toJSON(), state: { ...node.dataset } }; }) })));
      await page.screenshot({ path: `test-results/reading-return/${label}-proof-failure.png` });
      throw error;
    }
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.goto(new URL("/projects/catmoji?chapter=tools&tool=missing", base).href);
    await expect(page.getByRole("link", { name: "All projects", exact: true })).toHaveAttribute("href", "/projects#project-card-catmoji");
    await page.goto(new URL("/credentials", base).href);
    await expect(page.getByRole("link", { name: "Back to the universe", exact: true })).toHaveAttribute("href", "/?view=universe");
    assert.deepEqual(errors, []);
    await page.close(); console.log(`PASS ${label}: direct/reload, All, continuation, proof, invalid context, unavailable storage`);
  }
  const home = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await home.goto(new URL("/?chapter=tools&tool=react&group=all&motion=off", base).href);
  await expect(home.locator(".maker-tool-detail a").first()).toBeFocused();
  await home.getByRole("link", { name: "StarGod home", exact: true }).focus();
  await home.getByRole("link", { name: "StarGod home", exact: true }).click();
  await expect(home).toHaveURL(new URL("/?motion=off", base).href);
  await home.goBack();
  await expect(home.locator(".maker-tool-detail strong")).toHaveText("React");
  await expect(home.locator(".maker-tool-detail a").first()).toBeFocused();
  await expect(home.locator(".maker-tool-detail a").first()).toBeInViewport();
  await home.close(); console.log("PASS Home-to-Home history re-arms the reading return");
} finally { await browser.close(); }
