// 单独看一个活动小场景的动画帧：node vignette.mjs <类型> <输出.png> [帧数=6]
// 用假时钟一帧一帧推进，拼成一排，方便检查姿势。
import { chromium } from "playwright-core";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const here = dirname(fileURLToPath(import.meta.url));
const [type = "swim", out = "vignette.png", n = "6"] = process.argv.slice(2);
const js = f => readFileSync(resolve(here, f), "utf8");
const browser = await chromium.launch({ executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" });
const page = await browser.newPage({ viewport: { width: 220 * +n, height: 200 }, deviceScaleFactor: 2 });
await page.setContent(`<body style="margin:0;display:flex;background:#F3F7FB"></body>`);
await page.addScriptTag({ content: js("node_modules/gsap/dist/gsap.min.js") });
await page.addScriptTag({ content: js("../weekly-report/themes/cloud/lead.js") });
await page.evaluate(([type, n]) => {
  const L = window.WR_LEAD, info = Object.values(L.TYPES).find(t => t.name) && L.TYPES[type];
  for (let k = 0; k < n; k++) {
    document.body.insertAdjacentHTML("beforeend", `<svg viewBox="-110 -120 220 140" width="220" height="200"><g>${L.vignettes[type](info.da)}</g></svg>`);
    const g = document.body.lastElementChild.querySelector("g"), tl = L.animate(g, type, gsap);
    if (tl) { tl.pause(); tl.progress(k / n); }
  }
}, [type, +n]);
await page.screenshot({ path: out });
await browser.close();
console.log(out);
