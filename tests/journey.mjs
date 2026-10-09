import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { chromium, expect } from "@playwright/test";

const base = (process.env.PORTFOLIO_URL ?? "http://localhost:3002").replace(/\/$/, "");
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH ?? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" });
const sizes = [{width:1440,height:900},{width:1024,height:768},{width:768,height:1024},{width:390,height:844},{width:320,height:740},{width:844,height:390}];
const targets = process.argv.includes("--confirm") ? [sizes[0],sizes[3]] : sizes;
mkdirSync("test-results/journey", { recursive: true });
async function at(page, selector, offset = 0) {
  await page.locator(selector).evaluate((node, offset) => window.scrollTo({top:scrollY + node.getBoundingClientRect().top - offset, behavior:"instant"}), offset);
}
async function maker(page, progress) {
  await page.locator(".maker-chapter").evaluate((node, progress) => window.scrollTo({top:scrollY+node.getBoundingClientRect().top+(node.offsetHeight-innerHeight)*progress,behavior:"instant"}),progress);
}
async function inspect(page) {
  const opener = page.getByRole("button",{name:"Inspect artwork: Catmoji",exact:true});
  await opener.click();
  const dialog = page.locator(".project-art-dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.locator(".project-art-stage")).toHaveAttribute("data-image-state","ready");
  await expect(page.getByRole("button",{name:"Close artwork",exact:true})).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(page.getByRole("button",{name:"Zoom artwork",exact:true})).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(dialog.locator(".project-art-stage")).toBeFocused();
  assert.ok(await dialog.locator(".project-art-stage").evaluate(n=>n.scrollWidth>n.clientWidth),"zoom allows real native panning");
  await page.getByRole("button",{name:"Fit artwork",exact:true}).click();
  await expect(dialog.locator(".project-art-stage")).toHaveAttribute("data-zoomed","false");
  const box = await dialog.boundingBox();
  const viewport=page.viewportSize();
  assert.ok(box.x>=0 && box.y>=0 && box.x+box.width<=viewport.width+1 && box.y+box.height<=viewport.height+1);
  await page.screenshot({path:`test-results/journey/${viewport.width}-artwork.png`});
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(opener).toBeFocused();
  assert.equal(await page.evaluate(()=>document.body.style.overflow),"");
}
try {
  for(const viewport of targets) {
    const page = await browser.newPage({viewport});
    const errors=[]; page.on("pageerror",error=>errors.push(error.message));
    await page.goto(base,{waitUntil:"load"});
    await expect(page.locator("html")).toHaveAttribute("data-preferences-ready","true",{timeout:20000});
    await page.locator(".intro-loader").waitFor({state:"hidden"});
    await at(page,".home-project-preview",viewport.height*.75);
    await expect.poll(()=>page.locator(".home-project-media").evaluate(n=>new DOMMatrix(getComputedStyle(n).transform).m42)).toBeGreaterThan(1);
    await at(page,".home-project-preview",viewport.height*.25);
    await expect.poll(()=>page.locator(".home-project-media").evaluate(n=>Math.abs(new DOMMatrix(getComputedStyle(n).transform).m42))).toBeLessThan(.1);
    await expect(page.locator(".home-project-preview .project-visual figcaption")).toContainText("Product artwork");
    assert.equal(await page.locator(".home-project-preview").count(),1);
    await page.screenshot({path:`test-results/journey/${viewport.width}-preview.png`});
    await inspect(page);
    await page.getByRole("link",{name:"Read the project",exact:true}).click();
    await expect(page.locator("h1")).toHaveText("Catmoji");
    await expect(page.locator(".detail-evidence")).toContainText("Live product and open source repository");
    await inspect(page);
    await page.getByRole("link",{name:"Back to the universe",exact:true}).click();
    await expect(page.locator(".cosmic-canvas")).toHaveAttribute("data-ready","true",{timeout:20000});
    await expect(page.locator(".world-inspector")).toHaveCount(0);
    assert.ok(await page.locator(".maker-approach").evaluate(n=>n.getBoundingClientRect().height>=180 && n.getBoundingClientRect().height<=240),"shorter approach retains safe flight space");
    if(viewport.height>=560) {
      await maker(page,.87);
      await expect(page.locator(".maker-evidence-card[data-arrived='true']")).toHaveCount(5);
      await expect(page.locator(".maker-orbit-field")).toHaveCount(0);
      await expect(page.locator(".maker-tools")).toBeHidden();
      await page.screenshot({path:`test-results/journey/${viewport.width}-reading-hold.png`});
      await maker(page,.58);
      await expect(page.locator(".maker-chapter")).toHaveAttribute("data-proof","false");
      await expect(page.locator(".maker-evidence-card[data-arrived='true']")).toHaveCount(0);
      assert.equal(await page.locator(".maker-evidence-card").evaluateAll(nodes=>nodes.every(n=>n.inert)),true);
      await expect(page.locator(".maker-orbit-field")).toHaveAttribute("data-ready","true");
    }
    await at(page,"#contact",100);
    await expect.poll(()=>page.locator(".worldline-backdrop").getAttribute("data-hole-opacity").then(Number)).toBeGreaterThan(.1);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    assert.deepEqual(errors,[]);
    await page.close(); console.log(`PASS journey ${viewport.width}x${viewport.height}`);
  }
  const page = await browser.newPage({viewport:sizes[3],reducedMotion:"reduce"});
  await page.goto(`${base}/projects/nalira?lang=id`);
  await expect(page.locator(".project-visual figcaption")).toContainText("Artwork konsep");
  await page.getByRole("button",{name:"Lihat artwork: Nalira",exact:true}).click();
  await expect(page.locator(".project-art-stage")).toHaveAttribute("data-image-state","ready");
  await page.getByRole("button",{name:"Tutup artwork",exact:true}).click();
  await page.goto(`${base}/projects/soreva`);
  await expect(page.locator(".project-visual")).toHaveCount(0);
  await expect(page.locator(".detail-evidence .privacy-note")).toBeVisible();
  await page.goto(base);
  await expect(page.locator("html")).toHaveAttribute("data-motion","off");
  await at(page,".home-project-preview");
  assert.equal(await page.locator(".home-project-media").evaluate(n=>new DOMMatrix(getComputedStyle(n).transform).m42),0);
  assert.equal(await page.locator(".maker-approach").evaluate(n=>n.getBoundingClientRect().height),48);
  await page.close();
  for(const language of ["en","id"]) {
    const failure = await browser.newPage({viewport:sizes[3]});
    await failure.goto(`${base}/projects/catmoji?lang=${language}`);
    await expect(failure.locator(".project-visual-open img")).toBeVisible();
    await failure.route("**/assets/projects/catmoji-hero.png*",route=>route.abort());
    await failure.locator(".project-visual-open").click();
    await expect(failure.locator(".project-art-stage")).toHaveAttribute("data-image-state","error");
    await expect(failure.locator(".project-art-status [role='alert']")).toBeVisible();
    await failure.unroute("**/assets/projects/catmoji-hero.png*");
    await failure.getByRole("button",{name:language==="en"?"Retry artwork":"Coba muat artwork lagi",exact:true}).click();
    await expect(failure.locator(".project-art-stage")).toHaveAttribute("data-image-state","ready");
    await failure.keyboard.press("Escape");
    await expect(failure.locator(".project-visual-open")).toBeFocused();
    await failure.close();
  }
  console.log("PASS artwork EN/ID, private evidence, reduced motion and failed-image recovery");
} finally { await browser.close(); }
