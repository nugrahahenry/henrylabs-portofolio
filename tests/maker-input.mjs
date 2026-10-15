import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { chromium, expect } from "@playwright/test";

const url = process.env.PORTFOLIO_URL ?? "http://localhost:3002/";
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe" });
mkdirSync("test-results/maker-input", { recursive: true });
const progress = page => page.locator(".maker-chapter").evaluate(node => Number(node.style.getPropertyValue("--maker-progress")));
const settled = (page, progress) => expect.poll(() => page.locator(".maker-chapter").evaluate((node, target) => Math.abs(scrollY - Math.round(scrollY + node.getBoundingClientRect().top + (node.offsetHeight - innerHeight) * target)), progress)).toBeLessThanOrEqual(1);
async function move(page, value) {
  await page.locator(".maker-chapter").evaluate((node, value) => {
    window.dispatchEvent(new Event("stargod:scroll-cancel"));
    window.scrollTo({ top: scrollY + node.getBoundingClientRect().top + (node.offsetHeight - innerHeight) * value, behavior: "instant" });
  }, value);
  await expect.poll(() => progress(page)).toBeCloseTo(value, 2);
}
try {
  for (const viewport of (process.argv.includes("--phone") ? [{width:390,height:844},{width:360,height:640}] : [{width:1440,height:900}, {width:599,height:606}, {width:390,height:844}, {width:360,height:640}])) {
    const page = await browser.newPage({ viewport });
    const errors = []; page.on("pageerror", error => errors.push(error.message));
    await page.addInitScript(() => sessionStorage.setItem("henrylabs-intro-seen", "1"));
    await page.goto(url);
    await page.locator(".intro-loader").waitFor({ state:"hidden" });
    await move(page, .06);
    const groups = page.locator(".maker-groups");
    await groups.getByRole("button", {name:"All 25",exact:true}).click();
    await settled(page, .52);
    await page.mouse.wheel(0, 30);
    await expect(groups.locator("[aria-pressed='true']")).toHaveText("All25");
    await expect(page.locator(".maker-tool")).toHaveCount(25);
    // All four genuine click targets must work in the tool chapter and in proof.
    for (const phase of [.52, .9]) {
      await move(page, phase);
      for (const [name, mode] of [["Henry","human"],["Clear glasses","glasses"],["Dark glasses","sunglasses"],["StarGod","cosmic"]]) {
        const button = page.getByRole("group",{name:"Portrait appearance"}).getByRole("button",{name,exact:true});
        await button.click();
        await expect(page.locator(".portrait-reveal")).toHaveAttribute("data-portrait-mode",mode);
        await expect(button).toHaveAttribute("aria-pressed","true");
      }
    }
    await move(page,.06);
    await expect(page.locator(".portrait-reveal")).toHaveAttribute("data-interactive","true");
    const face = await page.locator(".portrait-reveal").boundingBox();
    await page.mouse.move(face.x+face.width*.48,face.y+face.height*.35);
    await page.mouse.down();
    await page.mouse.move(face.x+face.width*.56,face.y+face.height*.35,{steps:5});
    await expect(page.locator(".maker-scene")).not.toHaveAttribute("data-dragging","true");
    await expect.poll(() => page.locator(".portrait-reveal").evaluate(node=>Number(node.style.getPropertyValue("--human-opacity")))).toBeGreaterThan(.9).catch(async error=>{
      await page.screenshot({path:`test-results/maker-input/${viewport.width}-scan-failure.png`});
      console.log(await page.locator(".portrait-reveal").evaluate(node=>{const b=node.getBoundingClientRect();return {bounds:b.toJSON(),mode:node.dataset.portraitMode,hit:document.elementsFromPoint(b.x+b.width*.56,b.y+b.height*.35).slice(0,5).map(el=>({tag:el.tagName,class:el.className}))};}));
      throw error;
    });
    await page.mouse.up();
    await page.screenshot({path:`test-results/maker-input/${viewport.width}-scan.png`});
    await page.mouse.move(5,80);
    await groups.getByRole("button",{name:"All 25",exact:true}).click();
    await expect.poll(()=>progress(page)).toBeGreaterThan(.08);
    await page.keyboard.press("Escape");
    const stopped = await progress(page);
    await page.waitForTimeout(800);
    assert.ok(Math.abs(await progress(page)-stopped)<.015,"Escape cancels the journey without later snapping");
    await groups.getByRole("button",{name:"All 25",exact:true}).click();
    await settled(page, .52);
    await page.screenshot({path:`test-results/maker-input/${viewport.width}-all.png`});
    assert.deepEqual(errors,[]);
    await page.close(); console.log(`PASS maker input ${viewport.width}x${viewport.height}`);
  }
} finally { await browser.close(); }
