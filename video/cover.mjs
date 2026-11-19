// 小红书封面：node video/cover.mjs [第几天=0] [这一天里滑到几成=0.4]
// 先在手机尺寸下把云白滑到某一天拍一张，再拼进 cover.html，输出 out/cover.png（1080×1440）。
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const { chromium } = createRequire(resolve(ROOT, "tools/package.json"))("playwright-core");
const [day = "0", frac = "0.4"] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: process.env.BROWSER || "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" });
const ctx = await browser.newContext({ viewport: { width: 400, height: 865 }, deviceScaleFactor: 3 });
const page = await ctx.newPage();
await page.goto(pathToFileURL(resolve(ROOT, "examples/cloud.html")).href, { waitUntil: "load" });
await page.waitForTimeout(3000);
const target = await page.evaluate(([d, f]) => { const s = document.querySelector(`.cl-day[data-d="${d}"]`), sp = s.closest(".pin-spacer") || s;
  return sp.getBoundingClientRect().top + scrollY + sp.offsetHeight * f; }, [day, +frac]);
for (let k = 1; k <= 20; k++) { await page.evaluate(v => scrollTo(0, v), target * k / 20); await page.waitForTimeout(60); }
await page.waitForTimeout(2500);
await page.screenshot({ path: resolve(ROOT, "out/cover-src.png") });
const cover = await browser.newPage({ viewport: { width: 1080, height: 1440 } });
await cover.goto(pathToFileURL(resolve(ROOT, "video/cover.html")).href, { waitUntil: "load" });
await cover.waitForTimeout(1500);
await cover.screenshot({ path: resolve(ROOT, "out/cover.png") });
await browser.close();
console.log(resolve(ROOT, "out/cover.png"));
