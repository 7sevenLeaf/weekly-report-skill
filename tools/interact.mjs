// 交互冒烟测试：把每天面板、总结区的交互都点一遍、拖一遍，报告报错和每一步之后的读数。node interact.mjs <页面.html>
import { chromium } from "playwright-core";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
const [file] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" });
const page = await browser.newPage({ viewport: { width: 400, height: 860 } });
const errors = []; page.on("pageerror", e => errors.push(String(e)));
await page.goto(pathToFileURL(resolve(file)).href, { waitUntil: "load" });
await page.waitForTimeout(2500);
const log = [];
const panels = await page.$$eval(".cl-panel", ps => ps.map(p => p.dataset.p));
for (let i = 0; i < panels.length; i++) {
  const sel = `.cl-day:nth-of-type(${i + 1})`;
  const box = await page.evaluate(i => { const d = document.querySelectorAll(".cl-day")[i]; const sp = d.closest(".pin-spacer") || d; return sp.getBoundingClientRect().top + scrollY; }, i);
  await page.evaluate(y => scrollTo(0, y + 300), box); await page.waitForTimeout(700);
  const p = panels[i], q = s => page.evaluate(([i, s]) => { const el = document.querySelectorAll(".cl-panel")[i].querySelector(s); return el ? el.textContent.trim().slice(0, 60) : null; }, [i, s]);
  const clickIn = async s => { const h = await page.evaluateHandle(([i, s]) => document.querySelectorAll(".cl-panel")[i].querySelector(s), [i, s]); const el = h.asElement(); if (el) await el.click({ force: true }); };
  const dragIn = async s => { const r = await page.evaluate(([i, s]) => { const b = document.querySelectorAll(".cl-panel")[i].querySelector(s).getBoundingClientRect(); return [b.left, b.top, b.width, b.height]; }, [i, s]);
    await page.mouse.move(r[0] + r[2] * .2, r[1] + r[3] * .4); await page.mouse.down(); await page.mouse.move(r[0] + r[2] * .7, r[1] + r[3] * .4, { steps: 6 }); await page.mouse.up(); };
  if (p === "ring") { await clickIn(".cl-leg li[data-k=sleep]"); log.push([p, await q(".cl-pop")]); }
  if (p === "subjects") { await clickIn(".cl-bar[data-s]"); log.push([p, await q(".cl-pop")]); }
  if (p === "ribbon") { await dragIn(".rib"); log.push([p, await q(".cl-pop")]); }
  if (p === "dots") { await clickIn(".pd:nth-of-type(20)"); log.push([p, await q(".cl-pop")]); }
  if (p === "clock") { await dragIn(".dial"); log.push([p, await q(".pnow")]); }
  if (p === "gauge") { await clickIn(".gsv"); await page.waitForTimeout(300); log.push([p, await q(".gsub")]); }
  if (p === "compare") { await clickIn(".cl-bar[data-w]"); log.push([p, (await q(".cl-pop")) !== null ? "走势图已画" : null]); }
}
const clock = await page.$eval(".cl-clock span", e => e.textContent);
// 总结区
await page.evaluate(() => document.querySelector("#wr-split").scrollIntoView()); await page.waitForTimeout(800);
await page.evaluate(() => document.querySelector("#wr-split .seg[data-k=sleep]").dispatchEvent(new MouseEvent("click", { bubbles: true }))); log.push(["环图", await page.$eval("#wr-split .ctr", e => e.textContent)]);
await page.evaluate(() => document.querySelector("#wr-review").scrollIntoView()); await page.waitForTimeout(800);
const before = await page.$eval(".cl-stack .cl-scard", e => e.textContent.slice(0, 12)); await page.click(".cl-stack", { force: true }); await page.waitForTimeout(900);
const after = await page.$eval(".cl-stack .cl-scard", e => e.textContent.slice(0, 12)); log.push(["复盘卡", before !== after ? "翻到下一张" : "没翻"]);
await page.click("#wr-review .wr-tab[data-k=next]", { force: true }); await page.waitForTimeout(500); log.push(["复盘切栏", await page.$eval(".cl-stack .cl-scard", e => e.textContent.slice(0, 16))]);
console.log(JSON.stringify({ errors, lastClock: clock, log }, null, 1));
await browser.close();
