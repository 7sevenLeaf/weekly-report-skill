// 调试：在指定的滚动位置截图，并打印固定场景（pin）的布局。node probe.mjs <页面.html> <输出目录> y1 y2 ...
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
const [file, out, ...ys] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" });
const page = await browser.newPage({ viewport: { width: 400, height: 860 } });
page.on("pageerror", e => console.log("pageerror", String(e)));
await page.goto(pathToFileURL(resolve(file)).href, { waitUntil: "load" });
await page.waitForTimeout(2500);
console.log(await page.evaluate(() => JSON.stringify([...document.querySelectorAll(".pin-spacer")].map(s => [s.firstElementChild.className, Math.round(s.getBoundingClientRect().top + scrollY), s.offsetHeight]))));
for (const y of ys) {
  await page.evaluate(v => scrollTo(0, +v), y);
  await page.waitForTimeout(1800);
  await page.screenshot({ path: `${out}/y${String(y).padStart(5, "0")}.png` });
}
await browser.close();
