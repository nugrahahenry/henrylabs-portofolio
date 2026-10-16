import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { chromium, expect } from "@playwright/test";
import { checkPages } from "../scripts/check-pages.mjs";
import { startPagesPreview } from "./helpers/pages-preview.mjs";

checkPages();
const host = await startPagesPreview();
let browser;
mkdirSync("test-results/pages", { recursive: true });
try {
  browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe" });
  const parser = await browser.newPage();
  const sitemap = await (await fetch(`${host.url}/sitemap.xml`)).text();
  const locations = await parser.evaluate(xml => [...new DOMParser().parseFromString(xml, "text/xml").querySelectorAll("loc")].map(node => node.textContent), sitemap);
  assert.equal(locations.length, 13);
  const origin = new URL(locations[0]).origin;
  assert.ok((await (await fetch(`${host.url}/robots.txt`)).text()).includes(`${origin}/sitemap.xml`));
  for (const location of locations) {
    const url = new URL(location);
    assert.equal(url.origin, origin);
    const response = await fetch(`${host.url}${url.pathname}`);
    assert.equal(response.status, 200, url.pathname);
    const metadata = await parser.evaluate(html => {
      const doc = new DOMParser().parseFromString(html, "text/html");
      return { title: doc.title, canonical: doc.querySelector('link[rel="canonical"]')?.href, og: doc.querySelector('meta[property="og:image"]')?.content,
        twitter: doc.querySelector('meta[name="twitter:image"]')?.content };
    }, await response.text());
    assert.equal(metadata.canonical, location);
    assert.ok(metadata.title.includes("StarGod"));
    assert.ok(metadata.og && metadata.twitter, `Both sharing previews required: ${url.pathname}`);
    for (const image of [metadata.og, metadata.twitter]) {
      assert.equal(new URL(image).origin, origin);
      assert.equal(new URL(image).pathname, "/opengraph-image");
    }
  }
  await parser.close();
  const image = await fetch(`${host.url}/opengraph-image`);
  assert.match(image.headers.get("content-type"), /^image\/png/);
  assert.equal(Buffer.from(await image.arrayBuffer()).subarray(1, 4).toString(), "PNG");
  const partial = await fetch(`${host.url}/assets/projects/polara/walkthrough.webm`, { headers: { Range: "bytes=0-63" } });
  assert.equal(partial.status, 206);
  assert.equal((await partial.arrayBuffer()).byteLength, 64);
  for (const path of ["/unknown-world", "/projects/unknown-world", "/docs/HANDOFF.md", "/_headers"]) {
    assert.equal((await fetch(`${host.url}${path}`)).status, 404, path);
  }
  const redirect = await fetch(`${host.url}/projects/rentalmobil-sg.html?lang=id`, { redirect: "manual" });
  assert.equal(redirect.status, 308);
  assert.equal(redirect.headers.get("location"), "/projects/rentalmobil-sg?lang=id");
  console.log("PASS static routes, canonical metadata, OG image, real 404 and video byte ranges");

  for (const [width, height, language] of [[1440, 900, "en"], [768, 1024, "en"], [390, 844, "id"], [320, 740, "id"], [844, 390, "en"]]) {
    const page = await browser.newPage({ viewport: { width, height }, hasTouch: width < 500 });
    const errors = [], missing = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("response", response => { if (response.url().startsWith(host.url) && response.status() >= 400) missing.push(`${response.status()} ${response.url()}`); });
    await page.goto(`${host.url}/projects?category=university&q=rentalmobil&lang=${language}&motion=off`);
    await expect(page.locator(".project-record")).toHaveCount(1);
    await page.locator("#project-card-rental").click();
    await expect(page.locator("h1")).toHaveText("RentalMobil.SG");
    await expect(page.getByRole("tab")).toHaveCount(3);
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("lang", language);
    await expect(page.locator("html")).toHaveAttribute("data-motion", "off");
    await expect(page.locator(".reading-sky")).toHaveAttribute("data-ready", "true");
    assert.ok(await page.locator(".reading-sky canvas").evaluate(canvas => {
      const gl = canvas.getContext("webgl2"), pixels = new Uint8Array(canvas.width * canvas.height * 4);
      gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      let lit = 0;
      for (let i = 0; i < pixels.length; i += 4) if (pixels[i] + pixels[i + 1] + pixels[i + 2] > 30) lit++;
      return lit > canvas.width * canvas.height * .02;
    }), "Static reading sky renders nonblank WebGL");
    await page.screenshot({ path: `test-results/pages/${width}-rental.png` });
    await page.locator(".detail-route a").click();
    await expect(page.locator(".project-record")).toHaveCount(1);
    await expect(page.locator("#project-card-rental")).toBeFocused();
    await page.goBack();
    await expect(page.locator("h1")).toHaveText("RentalMobil.SG");

    await page.goto(`${host.url}/credentials?lang=en&motion=off&record=gemini-certified-educator`);
    const dialog = page.getByRole("dialog");
    await expect(dialog.locator("h2")).toHaveText("Gemini Certified Educator");
    await expect(dialog.locator(".credential-dialog-stage")).toHaveAttribute("data-image-state", "ready");
    await page.screenshot({ path: `test-results/pages/${width}-credential.png` });
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(page.locator(".credential-record")).toHaveCount(37);
    await page.getByRole("searchbox").fill("zzzzzz");
    await expect(page.locator(".credential-record")).toHaveCount(0);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    assert.deepEqual(errors, []);
    assert.deepEqual(missing, []);
    await page.close();
    console.log(`PASS static ${width}x${height}: direct/reload/query/filter/Back, watermarked viewer and sky`);
  }

  for (const width of [1440, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(`${host.url}/?world=catmoji&lang=id`);
    const scene = page.locator(".cosmic-canvas");
    await expect(scene).toHaveAttribute("data-ready", "true", { timeout: 30000 });
    await expect(scene).toHaveAttribute("data-active-world", "catmoji");
    await expect(scene).toHaveAttribute("data-flight", "1.000", { timeout: 20000 });
    const time = Number(await scene.getAttribute("data-time"));
    await expect.poll(async () => Number(await scene.getAttribute("data-time"))).toBeGreaterThan(time);
    await page.getByRole("button", { name: "Zoom in on planets", exact: true }).click();
    await expect(scene).toHaveAttribute("data-view-zoom", "0.12");
    await page.screenshot({ path: `test-results/pages/${width}-universe.png` });
    await page.getByRole("button", { name: "Buka dunia aktif", exact: true }).click();
    await page.locator(".world-inspector").getByRole("link", { name: "Baca proyek", exact: true }).click();
    await expect(page.locator("h1")).toHaveText("Catmoji");
    assert.deepEqual(errors, []);
    await page.close();
    console.log(`PASS static ${width}: animated universe, bookmark, zoom and project navigation`);
  }
  if (process.argv.includes("--regression")) {
    for (const script of ["polara-story", "rental-story", "project-contact"]) {
      await new Promise((resolve, reject) => {
        const child = spawn(process.execPath, [`tests/${script}.mjs`], { env: { ...process.env, PORTFOLIO_URL: host.url }, stdio: "inherit" });
        child.once("error", reject);
        child.once("exit", code => code === 0 ? resolve() : reject(new Error(`${script} failed with ${code}`)));
      });
    }
  }
} finally {
  await browser?.close();
  await host.close();
}
