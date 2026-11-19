// 离线检查：挡掉所有网络请求（字体、CDN），看页面还能不能完整打开。node offline.mjs <页面.html>
import { chromium } from "playwright-core";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
const [file] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: process.env.BROWSER || "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" });
const page = await browser.newPage({ viewport: { width: 400, height: 860 } });
const errors = [], blocked = [];
page.on("pageerror", e => errors.push(String(e)));
await page.route(/^https?:/, r => { blocked.push(new URL(r.request().url()).host); r.abort(); });
await page.goto(pathToFileURL(resolve(file)).href, { waitUntil: "load" });
await page.waitForTimeout(2000);
const h = await page.evaluate(() => document.documentElement.scrollHeight);
await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
await page.waitForTimeout(1200);
const r = await page.evaluate(() => ({ sections: document.querySelectorAll(".wr-sec").length, text: document.body.innerText.length,
  hiddenSecs: [...document.querySelectorAll(".wr-sec")].filter(s => getComputedStyle(s).opacity === "0").length }));
console.log(JSON.stringify({ page: file, height: h, ...r, blocked: [...new Set(blocked)], errors }));
await browser.close();
