import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { chromium, expect } from "@playwright/test";
import { certificates } from "../content/credentials.ts";

const base = (process.env.PORTFOLIO_URL ?? "http://localhost:3002").replace(/\/$/,"");
const browser = await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe"});
mkdirSync("test-results/credential-import",{recursive:true});
try {
  for (const viewport of [{width:1440,height:900},{width:390,height:844},{width:320,height:740}]) {
    const page = await browser.newPage({viewport});
    const errors=[]; page.on("pageerror",error=>errors.push(error.message));
    await page.goto(`${base}/credentials`);
    await expect(page.locator(".credential-record")).toHaveCount(37);
    for (const record of certificates.slice(26)) {
      await page.getByRole("searchbox").fill(record.title);
      await expect(page.locator(".credential-record")).toHaveCount(1);
      const preview=page.getByRole("button",{name:`Open ${record.title}`,exact:true});
      await preview.click();
      await expect(page.locator(".credential-dialog-stage")).toHaveAttribute("data-image-state","ready");
      await expect(page.locator(".credential-dialog h2")).toHaveText(record.title);
      await expect(page.locator("[data-credential-original]")).toHaveAttribute("src",record.image);
      assert.ok(await page.locator("[data-credential-original]").evaluate(img=>img.naturalWidth>=990));
      if(record.id.endsWith("managed-prometheus")||record.id.endsWith("arcade-devops-engineer")) await page.screenshot({path:`test-results/credential-import/${viewport.width}-${record.id}.png`});
      await page.keyboard.press("Escape");
      await expect(preview).toBeFocused();
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    }
    await page.getByRole("searchbox").fill("Google Skills Arcade");
    await expect(page.locator(".credential-record")).toHaveCount(8);
    await page.screenshot({path:`test-results/credential-import/${viewport.width}-arcade.png`});
    assert.deepEqual(errors,[]);
    await page.close(); console.log(`PASS 11 badge previews, search and focus ${viewport.width}`);
  }
} finally { await browser.close(); }
