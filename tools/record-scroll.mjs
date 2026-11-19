// 把一份周报从头滑到尾录成手机竖屏视频：node record-scroll.mjs <页面.html> <输出.mp4> [秒数=50] [--preview]
// 用假时钟：每帧先把页面滚到该到的位置，再推进 1/30 秒，动画（GSAP、过渡）都按片子的时间走，逐帧确定。
import { chromium } from "playwright-core";
import ffmpeg from "ffmpeg-static";
import { spawnSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const args = process.argv.slice(2), preview = args.includes("--preview");
const [file, out, secs = "50"] = args.filter(a => !a.startsWith("--"));
const FPS = 30, HOLD = 2.6, TAIL = 1.5, frames = resolve(dirname(resolve(out)), "rec-frames");
const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";

const browser = await chromium.launch({ executablePath: process.env.BROWSER || EDGE });
const ctx = await browser.newContext({ viewport: { width: 400, height: 860 }, deviceScaleFactor: 2 });
await ctx.clock.install({ time: new Date("2027-01-01T00:00:00Z") });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", e => errors.push(String(e)));
await page.goto(pathToFileURL(resolve(file)).href, { waitUntil: "load" });
for (let k = 0; k < 50; k++) { await ctx.clock.runFor(100); await page.waitForTimeout(40); }   // 字体、刷新、开场动画准备好
const H = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
const T = +secs, N = Math.round(T * FPS);
const ease = p => p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
rmSync(frames, { recursive: true, force: true }); mkdirSync(frames, { recursive: true });
let n = 0;
for (let f = 0; f < N; f++) {
  const t = f / FPS, run = T - HOLD - TAIL;
  const p = Math.min(1, Math.max(0, (t - HOLD) / run));
  // 先慢后匀速再慢：开头留给开场动画，结尾停一下
  const y = Math.round(H * (p < .04 ? ease(p / .04) * .04 : p > .96 ? .96 + ease((p - .96) / .04) * .04 : p));
  await page.evaluate(v => scrollTo(0, v), y);
  await ctx.clock.runFor(1000 / FPS);
  if (preview && f % (FPS * 3)) continue;
  await page.screenshot({ path: `${frames}/${String(n++).padStart(5, "0")}.jpg`, type: "jpeg", quality: 90 });
  if (!preview && n % 300 === 0) console.log(`  ${n} / ${N}`);
}
await browser.close();
console.log(JSON.stringify({ height: H, seconds: T, frames: n, errors }));
if (preview) process.exit(0);
const r = spawnSync(ffmpeg, ["-y", "-loglevel", "error", "-framerate", String(FPS), "-i", `${frames}/%05d.jpg`, "-vf", "scale=720:-2",
  "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "20", "-preset", "slow", "-movflags", "+faststart", resolve(out)], { stdio: "inherit" });
if (r.status !== 0) process.exit(1);
console.log("已生成 " + resolve(out));
