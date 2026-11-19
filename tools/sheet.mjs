// 拼图：node sheet.mjs <截图目录> <输出.png> [每行张数=5]
// 把一个目录里的逐屏截图拼成一张总览图，方便一次看完整页。
import { chromium } from "playwright-core";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const [dir, out, per = "5"] = process.argv.slice(2);
const files = readdirSync(dir).filter(f => /\.(png|jpg)$/.test(f)).sort();
const cols = Number(per), cell = 300;
const html = `<body style="margin:0;background:#222;display:grid;grid-template-columns:repeat(${cols},${cell}px);gap:6px;padding:6px">
${files.map(f => `<img src="data:image/${f.endsWith(".jpg") ? "jpeg" : "png"};base64,${readFileSync(resolve(dir, f)).toString("base64")}" style="width:${cell}px;display:block">`).join("")}</body>`;
const browser = await chromium.launch({ executablePath: process.env.BROWSER || EDGE });
const page = await browser.newPage({ viewport: { width: cols * (cell + 6) + 6, height: 400 } });
await page.setContent(html, { waitUntil: "load" });
await page.screenshot({ path: out, fullPage: true });
await browser.close();
console.log(out);
