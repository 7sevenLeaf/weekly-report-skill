// 调试横向滚动：滑到底，列出右边超出屏幕的元素。node overflow.mjs <页面.html> [宽度=400]
import { chromium } from "playwright-core";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
const [file, w = "400"] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" });
const page = await browser.newPage({ viewport: { width: +w, height: 860 } });
await page.goto(pathToFileURL(resolve(file)).href, { waitUntil: "load" });
await page.waitForTimeout(1500);
const H = await page.evaluate(() => document.documentElement.scrollHeight);
const seen = new Map();
for (let y = 0; y < H; y += 600) {
  await page.evaluate(v => scrollTo(0, v), y); await page.waitForTimeout(250);
  const r = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, list: [...document.querySelectorAll("body *")].filter(e => e.getBoundingClientRect().right > innerWidth + 2 && getComputedStyle(e).position !== "fixed")
    .slice(0, 6).map(e => `${e.tagName.toLowerCase()}.${String(e.className?.baseVal ?? e.className).split(" ")[0]} right=${Math.round(e.getBoundingClientRect().right)}`) }));
  if (r.sw > +w) seen.set(y, r);
}
console.log(JSON.stringify([...seen].slice(0, 5), null, 1));
await browser.close();
