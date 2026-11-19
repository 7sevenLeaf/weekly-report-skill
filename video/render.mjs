// 录宣传视频：node video/render.mjs [输出.mp4] [--preview]
// 起一个本地静态服务，装上假时钟，把 promo.html 逐帧 seek 截图，再用 ffmpeg 编码成 1080×1920、30fps 的 H.264。
// 假时钟让页面里的 setTimeout / requestAnimationFrame / performance.now 都按片子的时间走，动效逐帧确定。
// --preview 只截几张关键帧，用来检查画面。
import { spawn, spawnSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(resolve(dirname(fileURLToPath(import.meta.url)), "../tools/package.json"));
const { chromium } = require("playwright-core");
const ffmpeg = require("ffmpeg-static");

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const args = process.argv.slice(2);
const preview = args.includes("--preview");
const out = resolve(ROOT, args.find(a => !a.startsWith("--")) || "out/promo.mp4");
const FPS = 30, PORT = 8765, frames = resolve(ROOT, "out/frames");

const server = spawn("python", ["-m", "http.server", String(PORT), "--bind", "127.0.0.1", "--directory", ROOT], { stdio: "ignore" });
await new Promise(r => setTimeout(r, 1200));
try {
  const browser = await chromium.launch({ executablePath: process.env.BROWSER || EDGE });
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  await ctx.clock.install({ time: new Date("2027-01-01T00:00:00Z") });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", e => errors.push(String(e)));
  await page.goto(`http://127.0.0.1:${PORT}/video/promo.html`, { waitUntil: "load" });
  for (let k = 0; k < 600 && !(await page.evaluate(() => window.isReady && window.isReady())); k++) {
    await ctx.clock.runFor(100); await page.waitForTimeout(30);
  }
  if (!(await page.evaluate(() => window.isReady()))) throw new Error("页面没有准备好");
  const dur = await page.evaluate(() => window.duration());
  rmSync(frames, { recursive: true, force: true });
  mkdirSync(frames, { recursive: true });

  const all = [...Array(Math.round(dur * FPS)).keys()].map(i => i / FPS);
  const keep = preview ? new Set([...Array(Math.ceil(dur / 2)).keys()].map(k => Math.round((k * 2 + 1.5) * FPS))) : null;   // 预览：每 2 秒一张
  let n = 0;
  for (let f = 0; f < all.length; f++) {
    const t = all[f];
    if (f) await ctx.clock.runFor(1000 / FPS);
    await page.evaluate(v => window.seek(v), t);
    if (keep && !keep.has(f)) continue;
    await page.screenshot({ path: `${frames}/${String(n++).padStart(5, "0")}.jpg`, type: "jpeg", quality: 92 });
    if (!preview && n % 150 === 0) console.log(`  ${n} / ${all.length} 帧`);
  }
  await browser.close();
  console.log(JSON.stringify({ duration: dur, frames: n, errors }));
  if (preview) { console.log("预览帧在 " + frames); process.exit(0); }

  mkdirSync(dirname(out), { recursive: true });
  const r = spawnSync(ffmpeg, ["-y", "-loglevel", "error", "-framerate", String(FPS), "-i", `${frames}/%05d.jpg`,
    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", "-preset", "slow", "-movflags", "+faststart", out], { stdio: "inherit" });
  if (r.status !== 0) throw new Error("ffmpeg 编码失败");
  console.log("已生成 " + out);
} finally {
  server.kill();
}
