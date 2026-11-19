// 截图检查：node shoot.mjs <页面.html> <输出目录> [宽度=400]
// 逐屏下滑截图（触发进场动效），并报告横向滚动和控制台报错。
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const [page_, out, w = "400"] = process.argv.slice(2);
if (!page_ || !out) { console.error("用法：node shoot.mjs <页面.html> <输出目录> [宽度]"); process.exit(2); }
const width = Number(w), height = width < 600 ? 860 : 900;
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ executablePath: process.env.BROWSER || EDGE });
// REDUCE=1 时模拟系统「减少动效」，检查页面静止时也完整可读
const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2, reducedMotion: process.env.REDUCE ? "reduce" : "no-preference" });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", e => errors.push(String(e)));
page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
await page.goto(pathToFileURL(resolve(page_)).href, { waitUntil: "load" });
await page.waitForTimeout(1500);

const total = await page.evaluate(() => document.documentElement.scrollHeight);
let i = 0;
for (let y = 0; y < total; y += height - 80) {
  await page.evaluate(v => scrollTo(0, v), y);
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${out}/${String(i++).padStart(2, "0")}.png` });
}
const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
console.log(JSON.stringify({ page: page_, width, screens: i, pageHeight: total, horizontalOverflowPx: overflow, errors }));
await browser.close();
