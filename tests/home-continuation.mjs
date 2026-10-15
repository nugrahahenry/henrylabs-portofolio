import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { chromium, expect } from "@playwright/test";

const base = process.env.PORTFOLIO_URL ?? "http://localhost:3002/";
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe" });
const cases = [[1440,900,"catmoji"],[1024,768,"nalira"],[768,1024,"pos"],[390,844,"soreva"],[360,800,"polara"],[320,740,"catmoji"],[844,390,"hengs"]];
mkdirSync("test-results/home-continuation/after", { recursive: true });
async function at(page, selector) {
  await page.locator(selector).evaluate(node => {
    window.dispatchEvent(new Event("stargod:scroll-cancel"));
    window.scrollTo({top: scrollY + node.getBoundingClientRect().top - 90, behavior:"instant"});
  });
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
}
try {
  for (const [width,height,world] of cases) {
    const page = await browser.newPage({viewport:{width,height}});
    const errors=[];
    page.on("pageerror", error=>errors.push(error.message));
    page.on("console", message=>{if(/Shader Error|THREE.WebGLProgram/.test(message.text())) errors.push(message.text());});
    await page.addInitScript(()=>sessionStorage.setItem("henrylabs-intro-seen","1"));
    await page.goto(new URL(`/?world=${world}`,base).href);
    await page.locator(".intro-loader").waitFor({state:"hidden"});
    await expect(page.locator(".worldline-backdrop")).toHaveAttribute("data-ready","true");
    const article = page.locator(".home-project-preview");
    await expect(article).toHaveAttribute("data-project",world);
    await at(page,".home-preview-heading");
    await expect(page.locator(".home-project-copy")).toHaveCSS("background-color","rgba(0, 0, 0, 0)");
    await expect(article).toHaveCSS("border-top-width","0px");
    await expect(article).toHaveCSS("border-bottom-width","0px");
    assert.equal(await page.locator(".work-section").evaluate(node=>getComputedStyle(node,"::after").bottom),"0px","reading shade finishes inside the clipped section instead of leaving a hard edge");
    assert.equal(await article.locator("h3").count(),1);
    await page.screenshot({path:`test-results/home-continuation/after/${width}-${world}.png`});
    const visual=article.locator(".project-visual-open");
    if (await visual.count()) {
      const image=visual.locator("img");
      await expect.poll(()=>image.evaluate(img=>img.complete && img.naturalWidth>0)).toBe(true);
      const fit=await visual.evaluate(node=>{const img=node.querySelector("img"),box=node.getBoundingClientRect();return {frame:box.width/box.height,source:img.naturalWidth/img.naturalHeight};});
      assert.ok(Math.abs(fit.frame-fit.source)<.01,"artwork retains its real ratio without letterbox panels");
      const imageBounds=await image.boundingBox(), expand=visual.locator(".project-visual-expand"), expandBounds=await expand.boundingBox();
      assert.ok(expandBounds.y>=imageBounds.y+imageBounds.height,"expand affordance clears the actual artwork");
      assert.ok(expandBounds.width>=44 && expandBounds.height>=44);
      await expand.click();
      await expect(page.locator(".project-art-stage")).toHaveAttribute("data-image-state","ready");
      await page.keyboard.press("Escape"); await expect(visual).toBeFocused();
    } else {
      await expect(article.locator(".home-project-system li")).toHaveCount(3);
      await expect(article.locator(".home-project-evidence")).not.toBeEmpty();
    }
    await at(page,".home-project-copy");
    await page.screenshot({path:`test-results/home-continuation/after/${width}-${world}-reading.png`});
    const bounds=await article.locator("h3, p, dd, .library-stack, a").evaluateAll(nodes=>nodes.map(node=>{const r=node.getBoundingClientRect();return {left:r.left,right:r.right,overflow:node.scrollWidth>node.clientWidth+1};}));
    assert.ok(bounds.every(box=>box.left>=0 && box.right<=width+1 && !box.overflow),"reading content stays within every viewport");
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await page.getByRole("link",{name:"Read the project",exact:true}).click();
    await expect(page.locator(".detail-heading h1")).toBeVisible();
    assert.deepEqual(errors,[]);
    await page.close(); console.log(`PASS unframed project ${world} ${width}x${height}`);
  }
} finally { await browser.close(); }
