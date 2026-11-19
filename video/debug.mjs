// 调试：看假时钟下宣传页卡在哪一步。node video/debug.mjs
import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
const require = createRequire(resolve(dirname(fileURLToPath(import.meta.url)), "../tools/package.json"));
const { chromium } = require("playwright-core");
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const server = spawn("python", ["-m", "http.server", "8766", "--bind", "127.0.0.1", "--directory", ROOT], { stdio: "ignore" });
await new Promise(r => setTimeout(r, 1200));
const browser = await chromium.launch({ executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" });
const ctx = await browser.newContext({ viewport: { width: 1080, height: 1920 } });
await ctx.clock.install({ time: new Date("2027-01-01T00:00:00Z") });
const page = await ctx.newPage();
page.on("pageerror", e => console.log("pageerror", String(e)));
page.on("console", m => console.log("console", m.type(), m.text()));
await page.goto("http://127.0.0.1:8766/video/promo.html", { waitUntil: "domcontentloaded", timeout: 20000 }).catch(e => console.log("goto", e.message));
for (let k = 0; k < 40; k++) {
  await ctx.clock.runFor(200); await page.waitForTimeout(100);
  const s = await page.evaluate(() => ({ ready: window.isReady?.(), rs: document.readyState, fonts: document.fonts.status, gsap: !!window.gsap,
    wr: [0, 1, 2, 3].map(i => !!document.getElementById("f" + i).contentWindow.WR), irs: [0, 1, 2, 3].map(i => document.getElementById("f" + i).contentDocument?.readyState) }));
  if (k % 5 === 0 || s.ready) console.log(k, JSON.stringify(s));
  if (s.ready) break;
}
await browser.close(); server.kill();
