/* 云白（第四版）：沉浸版 + 意象可视化。每个画面都由真实数据画出来：
   · 开场：一周 168 个小时变成 168 个方块（按那一小时在做什么上色），拼成周数，再一滑排成 7×24 的一周，手指拖着看任何一小时；
   · 每天：一片天空。太阳按时钟沿弧线走，日落后月亮出来——月亮圆缺 = 今晚睡够没有，星星数 = 今晚睡了几小时；
     云和雨 = 当天的情绪；学习每满一小时，地上的书堆掉下一本书；运动的时段心跳线跳起来。拖太阳就能调时间，点书、点云、点事件都有回应；
   · 成就：3D 卡片翻上来、数字滚轮转到结果、彩纸；手指拖着卡片倾斜；
   · 收拢：七天缩成七格天气，点一格翻面，按住三个数和上周比。
   需要 GSAP + ScrollTrigger；减少动效或没加载到时，退回成摊开的静止版（意象画成静态）。 */
window.WR_THEME = (function () {
  const SKY = [[0, "#DCDDF2"], [300, "#E4E7F6"], [420, "#DCEBFA"], [720, "#F6F1DD"], [960, "#FBF0E2"], [1110, "#FBE1D8"], [1260, "#E8E1F7"], [1440, "#DCDDF2"]];
  const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const skyAt = m => { m = Math.max(0, Math.min(1440, m)); let i = 1; while (SKY[i][0] < m) i++;
    const [a, ca] = SKY[i - 1], [b, cb] = SKY[i], k = (m - a) / (b - a || 1), A = rgb(ca), B = rgb(cb);
    return `rgb(${A.map((v, j) => Math.round(v + (B[j] - v) * k)).join(",")})`; };
  const DN = "一二三四五六日";
  const dayOf = s => { const all = [...String(s || "").matchAll(/周([一二三四五六日])/g)]; return all.length ? DN.indexOf(all.at(-1)[1]) : -1; };
  const TINTS = ["study", "star", "sport", "life", "sleep"];
  const WX = { 5: "晴", 4: "晴间多云", 3: "多云", 2: "小雨", 1: "雷雨" };
  const BOOK = ["#8FB2F2", "#C9BCEF", "#8DD9BF", "#F5B9A6", "#EFD46A", "#9AD0E6"];
  const CLOUD = "M-30 10 a12 12 0 0 1 4-22 a17 17 0 0 1 31-6 a13 13 0 0 1 22 14 a10 10 0 0 1 -3 14 z";
  const rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const cl01 = v => Math.max(0, Math.min(1, v));

  /* 一个小天气图标（收拢页、情绪气泡用） */
  function weatherSvg(level) {
    const sun = (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r}" fill="var(--sun)"/>` + [...Array(8)].map((_, k) => { const a = k * Math.PI / 4;
      return `<line x1="${x + Math.cos(a) * (r + 3)}" y1="${y + Math.sin(a) * (r + 3)}" x2="${x + Math.cos(a) * (r + 6)}" y2="${y + Math.sin(a) * (r + 6)}" stroke="var(--sun)" stroke-width="2" stroke-linecap="round"/>`; }).join("");
    const cloud = (fill, st) => `<path d="M11 30a6 6 0 0 1 1-12 9 9 0 0 1 16-3 7 7 0 0 1 2 15z" fill="${fill}" stroke="${st}" stroke-width="1.5"/>`;
    const rain = n => [...Array(n)].map((_, k) => `<line x1="${14 + k * 6}" y1="33" x2="${12 + k * 6}" y2="38" stroke="#8FA8E0" stroke-width="2" stroke-linecap="round"/>`).join("");
    const inner = level === 5 ? sun(20, 20, 8) : level === 4 ? sun(14, 14, 6) + cloud("#fff", "#C9CCD8") : level === 3 ? cloud("#fff", "#B9BECB")
      : level === 2 ? cloud("#E4E6EE", "#B0B6C6") + rain(3) : level === 1 ? cloud("#C9CEDB", "#9CA3B5") + rain(3) + `<path d="M22 24l-4 7h4l-2 6 6-9h-4l2-4z" fill="var(--c-star)"/>`
      : cloud("#fff", "#C9CCD8") + `<text x="20" y="27" text-anchor="middle" font-size="9" fill="#8E93A0">?</text>`;
    return `<svg viewBox="0 0 40 40" aria-hidden="true">${inner}</svg>`;
  }

  function days(c) {
    const TL = c.data.timeline || [], st = c.data.core.find(x => x.key === "study"), sl = c.data.core.find(x => x.key === "sleep");
    return c.DAYS.map((d, i) => {
      const ev = TL.filter(e => e.day === i);
      const wakeP = ev.filter(e => e.cat === "sleep" && c.mins(e.end) <= 720 && c.mins(e.end) > 0 && e.end !== "24:00");
      const wake = wakeP.length ? Math.max(...wakeP.map(e => c.mins(e.end))) : null;
      const bed = ev.filter(e => e.cat === "sleep" && c.mins(e.start) >= 1200).map(e => c.mins(e.start))[0] ?? null;
      const acts = ev.filter(e => e.cat !== "sleep").sort((a, b) => c.mins(a.start) - c.mins(b.start));
      const t0 = wake ?? (acts.length ? c.mins(acts[0].start) - 30 : 480);
      const t1 = Math.min(1439, Math.max(bed ?? 0, acts.length ? c.mins(acts.at(-1).end) + 60 : t0 + 600, 1290));
      return { i, d, acts, wake, bed, t0, t1, study: st?.daily?.[i] ?? null, sleep: sl?.daily?.[i] ?? null,
        tonight: sl?.daily?.[i + 1] ?? null, mood: c.data.mood?.days?.[i] };
    });
  }

  /* 学习的书：按时间顺序把学习事件切成一小时一本 */
  function books(c) {
    const TL = (c.data.timeline || []).filter(e => e.cat === "study").sort((a, b) => a.day - b.day || c.mins(a.start) - c.mins(b.start));
    const subj = [], list = []; let cum = 0;
    TL.forEach(e => { const h = (c.mins(e.end) - c.mins(e.start)) / 60, s = String(e.text).split(/[ ·]/)[0];
      if (!subj.includes(s)) subj.push(s);
      const from = Math.floor(cum + 1e-6); cum += h; const to = Math.floor(cum + 1e-6);
      for (let k = from; k < to; k++) list.push({ e, col: BOOK[subj.indexOf(s) % BOOK.length] }); });
    return list;
  }

  /* 每个小时在做什么：按重叠分钟最多的类别 */
  function hours(c) {
    const TL = c.data.timeline || [];
    return c.DAYS.map((_, d) => [...Array(24)].map((_, h) => {
      let best = null, bm = 0;
      TL.filter(e => e.day === d).forEach(e => { const ov = Math.max(0, Math.min(c.mins(e.end), h * 60 + 60) - Math.max(c.mins(e.start), h * 60)); if (ov > bm) { bm = ov; best = e; } });
      return best && bm >= 20 ? best : null;
    }));
  }

  function stage(c, x, bk, info) {
    const L = window.WR_LEAD;
    const R = rng(x.i * 97 + 13), lv = x.mood?.level ?? null;
    const nStars = x.tonight != null ? Math.round(x.tonight) : 0;
    const stars = [...Array(nStars)].map(() => `<circle class="sky-star" cx="${(30 + R() * 340).toFixed(1)}" cy="${(16 + R() * 120).toFixed(1)}" r="${(1.2 + R() * 1.6).toFixed(1)}" style="animation-delay:${(R() * 2).toFixed(2)}s"/>`).join("");
    const nCloud = lv == null ? 1 : { 5: 0, 4: 1, 3: 2, 2: 3, 1: 4 }[lv];
    const cfill = lv === 2 ? "#E4E6EE" : lv === 1 ? "#CBCFDB" : "#fff";
    const clouds = [...Array(nCloud)].map((_, k) => `<path class="sky-cloud" data-b="${(60 + k * 115 + R() * 40).toFixed(0)}" data-y="${(70 + R() * 60).toFixed(0)}" data-s="${(1.3 + R() * .7).toFixed(2)}" d="${CLOUD}" style="fill:${cfill}"/>`).join("");
    const rays = [...Array(12)].map((_, k) => { const a = k * Math.PI / 6; return `<line x1="${Math.cos(a) * 62}" y1="${Math.sin(a) * 62}" x2="${Math.cos(a) * 76}" y2="${Math.sin(a) * 76}"/>`; }).join("");
    const bks = bk.map((b, k) => { const step = Math.min(10, 236 / Math.max(bk.length, 1)), bx = 306 + (rng(k * 7 + 3)() - .5) * 12, by = 266 - (k + 1) * step, bw = 64 + (rng(k * 5 + 1)() - .5) * 10;
      return `<g class="sky-book" data-k="${k}" opacity="0"><rect x="${bx.toFixed(1)}" y="${by.toFixed(1)}" width="${bw.toFixed(1)}" height="${(step - 1).toFixed(1)}" rx="2" fill="${b.col}"/>`
        + `<rect x="${(bx + 4).toFixed(1)}" y="${(by + 2).toFixed(1)}" width="${(bw * .3).toFixed(1)}" height="${(step * .4).toFixed(1)}" rx="1" fill="#fff" opacity=".6"/><rect x="${(bx + bw - 7).toFixed(1)}" y="${by.toFixed(1)}" width="2.5" height="${(step - 1).toFixed(1)}" fill="rgba(22,24,29,.14)"/></g>`; }).join("");
    return `<div class="cl-stage" data-lv="${lv ?? ""}"><svg viewBox="0 0 400 330" preserveAspectRatio="xMidYMid meet" role="img" aria-label="周${x.d}的天空">
        <g class="sky-stars">${stars}</g>
        <g class="sky-moon"><circle r="44" fill="var(--moon)" opacity=".25"/><circle r="26" fill="var(--moon)"/><circle class="sky-shadow" r="26"/><text y="46" text-anchor="middle" font-size="10" fill="var(--ink2)">${x.tonight != null ? `今晚睡 ${c.hm(x.tonight)}` : "今晚的觉下周记"}</text></g>
        <g class="sky-sun"><circle r="56" fill="var(--sun)" opacity=".18"/><circle r="42" fill="var(--sun)" opacity=".28"/><g class="sky-rays" style="display:${lv >= 4 ? "inline" : "none"}">${rays}</g><circle r="31" fill="var(--sun)"/></g>
        <g class="sky-clouds">${clouds}</g><g class="fx">${L.fxLayer(info, R)}</g>
        <path d="M0 236 C 60 206, 130 214, 190 230 S 320 196, 400 222 L400 330 L0 330Z" fill="var(--hill1)"/>
        <path d="M0 268 C 70 248, 150 262, 230 256 S 350 250, 400 262 L400 330 L0 330Z" fill="var(--hill2)"/>
        <g class="v-acts" transform="translate(150 262)">${[...new Set([...info.types, info.sig])].filter(t => L.vignettes[t]).map(t => `<g class="v-act" data-type="${t}">${L.vignettes[t](info.da)}</g>`).join("")}</g>
        <g class="sky-books">${bks}</g><text class="sky-btext" x="338" y="250" text-anchor="middle" font-size="12" font-weight="800" fill="var(--accent)"></text>
        <path class="sky-ecg" d=""/><text class="sky-etext" x="16" y="296" font-size="10" fill="var(--ink2)"></text>
      </svg>${lv != null && lv <= 2 ? `<canvas class="sky-rain"></canvas>` : ""}
      <div class="cl-dhead"><span class="cl-dn">周${x.d}</span><span class="cl-dd">${(() => { const t = new Date(c.data.meta.start + "T00:00:00"); t.setDate(t.getDate() + x.i); return `${t.getMonth() + 1} 月 ${t.getDate()} 日`; })()}</span><span class="cl-lead-tag" style="color:${info.da}">今天的主角：${info.name} · 心情${info.feelName}</span></div>
      ${x.i === 0 ? `<span class="cl-hint">拖动太阳 · 点书 · 点云</span>` : ""}<div class="cl-tip" aria-live="polite"></div></div>`;
  }

  /* ---------- 总结区：大环图、进度环、可滑的原话卡、可翻的复盘卡、逐句亮起的信、极光底 ---------- */
  function summary(c, live, gsap, ST, INFO) {
    const $ = c.$, $$ = c.$$, cols = [...new Set(INFO.map(i => i.da))];
    /* 极光：用这一周几个主角的颜色 */
    document.body.insertAdjacentHTML("beforeend", `<div class="cl-aurora" aria-hidden="true">${cols.slice(0, 4).map((col, k) => `<i style="width:${280 + k * 40}px;height:${280 + k * 40}px;background:${col};left:${[-10, 55, 10, 60][k]}%;top:${[5, 25, 55, 70][k]}%"></i>`).join("")}</div>`);
    const aur = $(".cl-aurora"), first = $(".wr-sec");
    if (live && first) { ST.create({ trigger: first, start: "top 85%", onEnter: () => aur.classList.add("on"), onLeaveBack: () => aur.classList.remove("on") });
      $$(".cl-aurora i").forEach((b, k) => gsap.to(b, { x: k % 2 ? 60 : -60, y: k % 2 ? -40 : 50, scale: 1.15, duration: 7 + k * 2, yoyo: true, repeat: -1, ease: "sine.inOut" })); }
    else if (first) aur.classList.add("on");

    /* 168 小时：大环图，点一段 = 点图例 */
    const sp = $("#wr-split");
    if (sp) { const rows = $$(".wr-li", sp).map(li => ({ li, k: li.dataset.k, n: li.children[1].textContent, h: li.children[2].textContent, p: parseFloat(li.children[3].textContent) }));
      const R = 72, C = 2 * Math.PI * R; let off = 0;
      const segs = rows.map(r => { const len = r.p / 100 * C, g = `<circle class="seg" data-k="${r.k}" r="${R}" cx="100" cy="100" fill="none" stroke="var(--c-${r.k === "none" ? "none" : r.k})" stroke-width="30" stroke-dasharray="${Math.max(0, len - 2).toFixed(1)} ${C.toFixed(1)}" stroke-dashoffset="${(-off).toFixed(1)}" transform="rotate(-90 100 100)"/>`; off += len; return g; }).join("");
      $(".wr-stack", sp).insertAdjacentHTML("beforebegin", `<div class="cl-donut"><svg viewBox="0 0 200 200">${segs}<g class="ctr"><text x="100" y="94" text-anchor="middle" font-size="13" fill="var(--ink2)">一周</text><text x="100" y="120" text-anchor="middle" font-size="26" font-weight="800" fill="var(--ink)">168h</text></g></svg><div class="cl-dleg"></div></div>`);
      $(".wr-stack", sp).style.display = "none"; $(".cl-dleg", sp).appendChild($(".wr-legend", sp));
      const ctr = $$(".ctr text", sp), pick = k => { $$(".seg", sp).forEach(q => q.classList.toggle("dim", q.dataset.k !== k)); const r = rows.find(q => q.k === k); if (!r) return; ctr[0].textContent = r.n; ctr[1].textContent = r.h; };
      $$(".seg", sp).forEach(g => g.addEventListener("click", () => { const r = rows.find(q => q.k === g.dataset.k); r.li.click(); pick(g.dataset.k); }));
      rows.forEach(r => r.li.addEventListener("click", () => pick(r.k)));
      if (live) gsap.from($$(".seg", sp), { strokeDasharray: `0 ${C}`, duration: 1.2, stagger: .12, ease: "power3.out", scrollTrigger: { trigger: sp, start: "top 70%" } }); }

    /* 目标：进度环卡片 */
    $$(".wr-s-goals .wr-g").forEach(g => { const bar = $(".wr-g-bar i", g), pr = bar ? parseFloat(bar.style.getPropertyValue("--p")) : (g.dataset.s === "done" ? 1 : 0);
      const col = g.dataset.s === "done" ? "var(--accent)" : g.dataset.s === "missed" ? "#C9CEDB" : "var(--c-study)";
      $(".wr-g-top", g).insertAdjacentHTML("afterbegin", `<span class="cl-gwrap"><i class="cl-gring" style="--p:${pr};--gc:${col}"></i><b>${Math.round(pr * 100)}%</b></span>`);
      if (live) { const num = $(".cl-gwrap b", g), o = { p: 0 };
        /* 环和数字用同一个补间画：直接补间 CSS 变量时 GSAP 读不到终点，环会一直停在 0 */
        const ring = $(".cl-gring", g); ring.style.setProperty("--p", 0); num.textContent = "0%";
        gsap.to(o, { p: pr, duration: 1.4, ease: "power3.out", onUpdate: () => { ring.style.setProperty("--p", o.p.toFixed(4)); num.textContent = Math.round(o.p * 100) + "%"; }, scrollTrigger: { trigger: g, start: "top 85%" } }); } });

    /* 原话：左右滑的彩色卡 */
    const qs = $("#wr-quotes"), Q = c.data.quotes || [];
    if (qs && Q.length) { const dts = INFO.map(i => i.dt);
      $$(".wr-qcard", qs).forEach((cd, k) => { cd.style.setProperty("--qmark", cols[k % cols.length]); cd.style.setProperty("--q2", dts[(k * 2 + 1) % dts.length]); }); }

    /* 复盘：一叠卡，点最上面那张它就飞到最后 */
    const rv = $("#wr-review");
    if (rv) { $(".wr-tabs", rv).insertAdjacentHTML("afterend", `<div class="cl-stack"></div>`);
      const stack = $(".cl-stack", rv);
      const layout = anim => $$(".cl-scard", stack).forEach((cd, i, all) => { const v = { y: i * 12, scale: 1 - i * .05, zIndex: all.length - i, opacity: i > 2 ? 0 : 1 - i * .18 };
        if (anim && live) gsap.to(cd, { ...v, duration: .5, ease: "power3.out" }); else Object.assign(cd.style, { transform: `translateY(${v.y}px) scale(${v.scale})`, zIndex: v.zIndex, opacity: v.opacity }); });
      const build = () => { const items = $$(".wr-rlist li", rv).map(li => li.textContent), k = $(".wr-rlist", rv).dataset.k;
        stack.innerHTML = items.map((t, i) => `<div class="cl-scard"><em>${String(i + 1).padStart(2, "0")}</em>${c.esc(t)}<small>${i + 1}/${items.length} · 点一下翻到下一张</small></div>`).join("");
        stack.style.height = 150 + Math.min(items.length, 3) * 12 + 30 + "px"; layout(false);
        if (live) gsap.from($$(".cl-scard", stack), { y: 60, opacity: 0, duration: .6, stagger: .08, ease: "expo.out" }); };
      stack.addEventListener("click", () => { const top = stack.firstElementChild; if (!top || stack.children.length < 2) return;
        if (live) gsap.to(top, { y: -90, rotation: -8, opacity: 0, duration: .35, ease: "power2.in", onComplete: () => { stack.appendChild(top); gsap.set(top, { rotation: 0 }); layout(true); } });
        else { stack.appendChild(top); layout(false); } });
      $$(".wr-tab", rv).forEach(t => t.addEventListener("click", () => setTimeout(build, 0))); build(); }

    /* 信：往下滑，一句一句亮起来，最后画一笔签名 */
    const lt = $(".wr-letter");
    if (lt) { lt.insertAdjacentHTML("beforeend", `<svg class="cl-sign" viewBox="0 0 120 44"><path d="M6 30 C 20 6, 30 40, 44 22 S 64 10, 70 28 S 92 36, 114 14" fill="none" stroke="var(--accent)" stroke-width="3" stroke-linecap="round"/></svg>`);
      if (live) { $$("p", lt).forEach(pp => gsap.fromTo(pp, { opacity: .15 }, { opacity: 1, ease: "none", scrollTrigger: { trigger: pp, start: "top 85%", end: "top 55%", scrub: true } }));
        const path = $(".cl-sign path", lt); gsap.fromTo(path, { strokeDasharray: 200, strokeDashoffset: 200 }, { strokeDashoffset: 0, duration: 1.4, ease: "power2.inOut", scrollTrigger: { trigger: lt, start: "bottom 90%" } }); } }
  }

  /* 彩纸 */
  let confetti = null;
  function burst(x, y, n = 110) {
    if (!confetti) { const cv = document.createElement("canvas"); cv.className = "cl-confetti"; document.body.appendChild(cv); confetti = { cv, ctx: cv.getContext("2d"), ps: [], run: false }; }
    const C = confetti, dpr = Math.min(2, devicePixelRatio || 1); C.cv.width = innerWidth * dpr; C.cv.height = innerHeight * dpr; C.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const cols = ["#8FB2F2", "#C9BCEF", "#8DD9BF", "#F5B9A6", "#EFD46A", "#3D6BF2"];
    for (let k = 0; k < n; k++) { const a = -Math.PI / 2 + (Math.random() - .5) * 2.2, v = 6 + Math.random() * 8;
      C.ps.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: Math.random() * 6, vr: (Math.random() - .5) * .4, w: 5 + Math.random() * 5, h: 8 + Math.random() * 6, c: cols[k % cols.length], life: 0 }); }
    if (C.run) return; C.run = true;
    (function step() {
      const g = C.ctx; g.clearRect(0, 0, innerWidth, innerHeight);
      C.ps = C.ps.filter(p => p.life < 150 && p.y < innerHeight + 40);
      C.ps.forEach(p => { p.life++; p.vy += .28; p.vx *= .985; p.vy *= .985; p.x += p.vx; p.y += p.vy; p.r += p.vr;
        g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.globalAlpha = cl01(1.6 - p.life / 95); g.fillStyle = p.c; g.fillRect(-p.w / 2, -p.h / 2, p.w, Math.abs(Math.cos(p.r * 2)) * p.h + 1); g.restore(); });
      if (C.ps.length) requestAnimationFrame(step); else { C.run = false; g.clearRect(0, 0, innerWidth, innerHeight); }
    })();
  }

  return {
    modules: ["split", "goals", "quotes", "review", "letter"],
    splitStyle: "custom", letterScrub: true,   // 大环图和信的滚动亮起，这个主题自己做   // 三个核心数在收拢场景，7×24 在开场，不再重复
    labels: {
      split: { title: "168 小时去了哪里", hint: "点一类，看它在七天里的分布" },
      goals: { title: "目标对账", hint: "先看做成的，再看差在哪" },
      quotes: { title: "值得记住的话", hint: "左右滑，下一句" },
      review: { title: "复盘", hint: "" },
      letter: { title: "写给这一周", hint: "" }
    },

    cover(c) {
      const m = c.data.meta, HR = hours(c);
      const cells = HR.flatMap((row, d) => row.map((e, h) => `<i class="cl-cell" data-d="${d}" data-h="${h}" style="--c:var(--c-${e ? e.cat : "none"})"></i>`)).join("");
      const key = [["study", "学习"], ["sport", "运动"], ["life", "个人"], ["star", "高光"], ["sleep", "睡眠"], ["none", "没记录"]].map(([k, n]) => `<span><i style="background:var(--c-${k})"></i>${n}</span>`).join("");
      return `<header class="cl-intro"><div class="cl-ipin">
        <div class="cl-kick"><b>第 ${m.week} 周</b> · ${c.esc(m.name || m.title)} · ${m.start.slice(5).replace("-", ".")} — ${m.end.slice(5).replace("-", ".")}</div>
        <div class="cl-cells" role="img" aria-label="这一周的 168 个小时">${cells}
          <div class="cl-gdays" aria-hidden="true">${c.DAYS.map(d => `<span>${d}</span>`).join("")}</div>
          <div class="cl-gaxis" aria-hidden="true"><span>0</span><span>6</span><span>12</span><span>18</span><span>24</span></div></div>
        <div class="cl-leads"><p class="cl-lead l1">一周有 <b>168</b> 个小时。往下滑，把它们再过一遍。</p>
          <p class="cl-lead l2" style="opacity:0">这是你这一周的 168 个小时<span class="cl-read" style="display:block">手指在格子上拖，看任何一小时</span></p></div>
        <div class="cl-key">${key}</div><i class="cl-down" aria-hidden="true"></i></div></header>`;
    },

    story(c) {
      const D = days(c), reader = c.data.meta.reader || "助手", A = c.data.achievements || [], BK = books(c), L = window.WR_LEAD, INFO = L.analyzeWeek(c, D, dayOf);
      const st = c.data.core.find(x => x.key === "study");
      const placed = A.map(a => dayOf(a.when));
      const achHtml = (a, k) => {
        const big = [...String(a.big)].map(ch => /\d/.test(ch) ? `<span class="cl-slot" data-n="${ch}"><span class="cl-reel">${[..."0123456789012345678"].map(d => `<span>${d}</span>`).join("")}<span>${ch}</span></span></span>`
          : `<span class="cl-ch">${ch === " " ? "&nbsp;" : c.esc(ch)}</span>`).join("");
        return `<section class="cl-ach" data-tint="${TINTS[k % TINTS.length]}"><div class="cl-acard" style="--tint:var(--t-${TINTS[k % TINTS.length]})"><i class="cl-glare" aria-hidden="true"></i>
          <span class="cl-atag">${c.esc(a.when || "")} · 本周成就 ${k + 1}/${A.length}</span><span class="cl-tiltme" aria-hidden="true">拖动卡片 ↻</span>
          <div class="cl-abig" aria-label="${c.esc(a.big)}">${big}</div><div class="cl-awhat">${c.esc(a.what)}</div>
          ${a.figure ? `<figure class="cl-afig">${a.figure}</figure>` : ""}
          ${a.detail ? `<p class="cl-adetail">${c.esc(a.detail)}</p>` : ""}${a.say ? `<p class="cl-asay">${c.esc(a.say)}</p>` : ""}</div></section>`;
      };
      let html = "";
      D.forEach(x => {
        const info = INFO[x.i], rows = [];
        if (x.wake != null) rows.push(`<li class="cl-ev" data-c="sleep" data-s="${x.wake}" data-e="${x.wake + 20}"><time>${c.clock(x.wake)}</time><i>${c.icon("sleep")}</i><span>醒来${x.sleep != null ? ` · 睡了 ${c.hm(x.sleep)}` : ""}</span><b></b></li>`);
        x.acts.forEach(e => { const s = c.mins(e.start), en = c.mins(e.end);
          rows.push(`<li class="cl-ev" data-c="${e.cat}" data-s="${s}" data-e="${en}"><time>${e.start}</time><i>${c.icon(e.icon || e.cat)}</i><span>${c.esc(e.text)}</span><b>${c.hm((en - s) / 60)}</b></li>`); });
        if (x.bed != null) rows.push(`<li class="cl-ev" data-c="sleep" data-s="${x.bed}" data-e="${x.bed + 20}"><time>${c.clock(x.bed)}</time><i>${c.icon("sleep")}</i><span>睡觉</span><b></b></li>`);
        const md = x.mood, lv = md?.level ?? null;
        const say = md && (md.quote || md.reading) ? `<div class="cl-say">${weatherSvg(lv).replace("<svg", '<svg class="cl-wx"')}${md.quote ? `<span class="q">「${[...md.quote].map(ch => `<span>${c.esc(ch)}</span>`).join("")}」</span>` : `<span style="font-weight:500">${c.esc(md.reading)}</span>`}
          <small>心情${info.feelName}${lv != null ? `（${lv}/5）` : ""} · ${md.quote ? `你说${md.reading ? `，${c.esc(reader)}读到：${c.esc(md.reading)}` : ""}` : `这天没留下话，是${c.esc(reader)}从做的事里读的`}</small></div>` : "";
        const nSport = x.acts.filter(e => e.cat === "sport").length;
        const sum = [x.study != null && st ? `学习 <b>${c.fmt(x.study, st.kind)}</b>` : "", nSport ? `运动 <b>${nSport}</b> 次` : "", x.sleep != null ? `昨晚睡 <b>${c.hm(x.sleep)}</b>` : ""].filter(Boolean).join(" · ");
        html += `<section class="cl-day" data-d="${x.i}" data-t0="${x.t0}" data-t1="${x.t1}" data-sig="${info.sig}" style="--da:${info.da};--dt:${info.dt}" aria-label="周${x.d}，主角是${info.name}"><div class="cl-wash" style="background:linear-gradient(135deg,${info.da},${info.dt})"></div><div class="cl-din" style="--sky:${skyAt(1290)}">
          <i class="cl-blob" style="width:240px;height:240px;left:-80px;bottom:8%;background:${info.da};opacity:.28"></i><i class="cl-blob" style="width:200px;height:200px;right:-70px;bottom:32%;background:${info.dt}"></i>
          ${stage(c, x, BK, info)}<div class="cl-dbody">${say}<div class="cl-panel" data-p="${info.panel}">${L.panel(c, x, info, D)}</div><ol class="cl-evs">${rows.join("") || `<li class="cl-ev on"><span>这天没有记录</span></li>`}</ol>${sum ? `<div class="cl-dsum">${sum}</div>` : ""}</div></div><div class="cl-trans" aria-hidden="true">${[...Array(12)].map((_, k) => `<i class="pt" style="width:${8 + (k % 4) * 6}px;height:${8 + (k % 4) * 6}px;background:${[info.da, "#fff", info.dt][k % 3]}"></i>`).join("")}<svg class="big" viewBox="0 0 100 100">${L.BIG[info.sig](info.da)}</svg></div></section>`;
        A.forEach((a, k) => { if (placed[k] === x.i) html += achHtml(a, k); });
      });
      A.forEach((a, k) => { if (placed[k] < 0) html += achHtml(a, k); });
      const nums = c.data.core.slice(0, 3).map(x => `<div data-v="${x.value ?? ""}" data-p="${x.prev ?? ""}" data-k="${x.kind}"><b>${c.fmt(x.value, x.kind)}</b><span>${c.esc(x.label)}</span><em>${x.goal != null ? `目标 ${c.fmt(x.goal, x.kind)}` : ""}</em></div>`).join("");
      const tiles = D.map(x => `<button class="cl-tile" style="--da:${INFO[x.i].da};--dt:${INFO[x.i].dt}" aria-label="周${x.d}，心情${WX[x.mood?.level] || "看不清"}，点一下翻面"><span>${weatherSvg(x.mood?.level ?? null)}<b>${x.d}</b>${WX[x.mood?.level] || "—"}</span>
        <span class="bk"><b>周${x.d}</b>学 ${st ? c.fmt(x.study, st.kind) : "—"}<br>睡 ${x.sleep != null ? c.hm(x.sleep) : "没记"}</span></button>`).join("");
      html += `<section class="cl-sum"><div class="cl-sin"><h2>这一周</h2><p>七天的天气，和三个数</p><div class="cl-tiles">${tiles}</div>
        <div class="cl-snums">${nums}</div><div class="cl-shint">点天气翻面 · 按住数字，和上周比</div></div></section>`;
      return html;
    },

    after(c) {
      const T = this, D = days(c), BK = books(c), HR = hours(c), H = document.documentElement, TL = c.data.timeline || [], L = window.WR_LEAD, INFO = L.analyzeWeek(c, D, dayOf);
      const st = c.data.core.find(x => x.key === "study");
      document.body.insertAdjacentHTML("beforeend", `<div class="cl-clock" aria-hidden="true"><b></b><span></span></div>`);
      const clockEl = c.$(".cl-clock");
      const live = !c.reduce && window.gsap && window.ScrollTrigger;
      const gsap = window.gsap, ST = window.ScrollTrigger;
      if (live) gsap.registerPlugin(ST); else H.classList.add("cl-static");

      /* ---------- 开场：168 个小时 ---------- */
      const box = c.$(".cl-cells"), cells = c.$$(".cl-cell", box), OY = 72;
      const grid = el => ({ x: +el.dataset.h * 15, y: +el.dataset.d * 15 + OY });
      c.$(".cl-gdays").style.top = OY + "px"; c.$(".cl-gaxis").style.top = OY + 108 + "px";
      const place = (el, p) => el.style.transform = `translate(${p.x}px,${p.y}px) rotate(${p.r || 0}deg) scale(${p.s ?? 1})`;
      let gridMode = !live;
      const label = (d, h) => { const e = HR[d][h]; return `周${c.DAYS[d]} <b>${String(h).padStart(2, "0")}:00</b> · ${e ? (e.cat === "sleep" ? "在睡觉" : c.esc(e.text)) : "这一小时没有记录"}`; };
      const read = c.$(".cl-read");
      const pick = ev => { if (!gridMode) return; const r = box.getBoundingClientRect(), h = Math.floor((ev.clientX - r.left) / 15), d = Math.floor((ev.clientY - r.top - OY) / 15);
        if (h < 0 || h > 23 || d < 0 || d > 6) return; cells.forEach(el => el.classList.toggle("hit", +el.dataset.d === d && +el.dataset.h === h)); read.innerHTML = label(d, h); };
      box.addEventListener("pointerdown", pick); box.addEventListener("pointermove", e => { if (e.buttons || e.pointerType === "mouse") pick(e); });
      if (!live) { cells.forEach(el => place(el, grid(el))); c.$(".l1").style.opacity = 0; c.$(".l2").style.opacity = 1; }

      /* 用周数的字形算出方块的位置 */
      const digitTargets = () => {
        const cv = document.createElement("canvas"); cv.width = 240; cv.height = 140; const g = cv.getContext("2d");
        g.fillStyle = "#000"; g.textAlign = "center"; g.textBaseline = "middle"; g.font = `800 ${String(c.data.meta.week).length > 1 ? 150 : 170}px Inter, "Noto Sans SC", sans-serif`;
        g.fillText(String(c.data.meta.week), 120, 76);
        const d = g.getImageData(0, 0, 240, 140).data, pts = [];
        for (let r = 0; r < 14; r++) for (let q = 0; q < 24; q++) if (d[((r * 10 + 5) * 240 + q * 10 + 5) * 4 + 3] > 110) pts.push({ x: q * 15, y: r * 15 + 20 });
        return pts;
      };

      /* ---------- 每一天：天空 ---------- */
      const studyBefore = i => (st?.daily || []).slice(0, i).reduce((a, b) => a + (b || 0), 0);
      const setClock = (x, t) => { clockEl.querySelector("b").textContent = "周" + x.d; clockEl.querySelector("span").textContent = c.clock(Math.min(1435, Math.round(t / 5) * 5)); };
      const rains = [];
      const ecg = (amp, ph) => { let p = ""; for (let X = 0; X <= 400; X += 4) { const u = ((X + ph) % 64) / 64;
        const b = u < .06 ? u / .06 * .3 : u < .1 ? .3 - (u - .06) / .04 * .8 : u < .15 ? -.5 + (u - .1) / .05 * 1.6 : u < .2 ? 1.1 - (u - .15) / .05 * 1.7 : u < .25 ? -.6 + (u - .2) / .05 * .6 : 0;
        p += (X ? "L" : "M") + X + " " + (312 - b * amp).toFixed(1); } return p; };
      const dayCtl = c.$$(".cl-day").map(sec => {
        const x = D[+sec.dataset.d], info = INFO[x.i], din = c.$(".cl-din", sec), stg = c.$(".cl-stage", sec), svg = c.$("svg", stg), evs = c.$$(".cl-ev", sec), tip = c.$(".cl-tip", stg);
        const acts = c.$$(".v-act", svg), panelEl = c.$(".cl-panel", sec), qchars = c.$$(".cl-say .q span", sec);
        if (live) { acts.forEach(a => a._tl = L.animate(a, a.dataset.type, gsap)); }
        let curAct = null, dayOn = false;
        const setAct = type => { const a = acts.find(q => q.dataset.type === type) || acts.find(q => q.dataset.type === info.sig) || acts[0];
          if (a === curAct) return; acts.forEach(q => { q.classList.toggle("on", q === a); if (q._tl) q._tl.pause(); });
          curAct = a; if (a && a._tl && dayOn) a._tl.play(); };
        const sun = c.$(".sky-sun", svg), moon = c.$(".sky-moon", svg), shadow = c.$(".sky-shadow", svg), stars = c.$(".sky-stars", svg), clouds = c.$$(".sky-cloud", svg);
        const bks = c.$$(".sky-book", svg), btext = c.$(".sky-btext", svg), ecgP = c.$(".sky-ecg", svg), etext = c.$(".sky-etext", svg);
        const studyEv = TL.filter(e => e.day === x.i && e.cat === "study"), sportEv = TL.filter(e => e.day === x.i && e.cat === "sport");
        const fullness = x.tonight != null ? cl01(x.tonight / 8) : .5;
        let shown = -1;
        if (live) sec.classList.add("cl-live");
        const say = (html, ms = 2600) => { tip.innerHTML = html; tip.classList.add("on"); clearTimeout(tip._t); tip._t = setTimeout(() => tip.classList.remove("on"), ms); };
        const render = (t, anim) => {
          setClock(x, t); clockEl.querySelector("span").style.color = info.da;
          const cur = TL.find(q => q.day === x.i && q.cat !== "sleep" && c.mins(q.start) <= t && c.mins(q.end) > t);
          setAct(cur ? L.typeOf(cur) : info.sig); L.panelLive(panelEl, info, c, x, t);
          evs.forEach(li => { const s = +li.dataset.s, e = +li.dataset.e; li.classList.toggle("on", t >= s); li.classList.toggle("now", t >= s && t < e); });
          const sky = skyAt(t); din.style.setProperty("--sky", sky);
          const u = (t - 360) / 750, v = t >= 1110 ? (t - 1110) / 690 : t < 360 ? (t + 330) / 690 : -1;
          if (u >= 0 && u <= 1) { sun.setAttribute("transform", `translate(${40 + u * 320} ${248 - Math.sin(Math.PI * u) * 178})`); sun.style.opacity = cl01(Math.sin(Math.PI * u) * 5); } else sun.style.opacity = 0;
          if (v >= 0 && v <= 1) { moon.setAttribute("transform", `translate(${40 + v * 320} ${236 - Math.sin(Math.PI * v) * 150})`); moon.style.opacity = cl01(Math.sin(Math.PI * v) * 5); } else moon.style.opacity = 0;
          shadow.setAttribute("cx", 6 + fullness * 52); shadow.setAttribute("cy", -4); shadow.setAttribute("fill", sky);
          stars.style.opacity = t >= 1080 ? cl01((t - 1080) / 60) : t < 390 ? cl01((390 - t) / 60) : 0;
          clouds.forEach(cl => { const X = ((+cl.dataset.b + t * .06) % 470) - 35; cl.setAttribute("transform", `translate(${X.toFixed(1)} ${cl.dataset.y}) scale(${cl.dataset.s})`); });
          const today = studyEv.reduce((a, e) => a + Math.max(0, Math.min(t, c.mins(e.end)) - c.mins(e.start)) / 60, 0);
          const sofar = studyBefore(x.i) + Math.max(0, today), n = Math.min(bks.length, Math.floor(sofar + 1e-6));
          if (n !== shown) {
            bks.forEach((b, k) => { const vis = k < n; if (vis && k >= shown && shown >= 0 && anim && live) { b.style.opacity = 1; gsap.fromTo(b, { y: -170, rotation: (k % 2 ? 8 : -8) }, { y: 0, rotation: 0, duration: .9, ease: "bounce.out", svgOrigin: "338 262" }); } else b.style.opacity = vis ? 1 : 0; });
            shown = n; }
          btext.setAttribute("y", Math.min(250, 256 - n * Math.min(10, 236 / Math.max(bks.length, 1)))); btext.textContent = `累计 ${c.hm(sofar)}`;
          const sp = sportEv.find(e => c.mins(e.start) <= t && c.mins(e.end) > t);
          ecgP.setAttribute("d", ecg(sp ? 26 : 3, t * 9)); ecgP.style.stroke = sp ? "var(--c-sport)" : "rgba(22,24,29,.15)";
          etext.textContent = sp ? `运动中 · ${sp.text}` : "";
        };
        /* 交互：拖太阳调时间、点书、点云、点事件 */
        let drag = null, moved = false;
        const tAtX = (px, t) => { const r = svg.getBoundingClientRect(), X = cl01((px - r.left) / r.width * 400 / 400) * 400, k = cl01((X - 40) / 320);
          return t >= 1110 || t < 360 ? (1110 + k * 690) % 1440 : 360 + k * 750; };
        stg.addEventListener("pointerdown", e => { drag = { x: e.clientX, t: ctl.t }; moved = false; });
        stg.addEventListener("pointermove", e => { if (!drag || !(e.buttons || e.pointerType === "touch")) return; if (Math.abs(e.clientX - drag.x) > 6) moved = true; if (!moved) return;
          const t = Math.round(tAtX(e.clientX, drag.t)); ctl.t = t; render(t, true);
          const ev = TL.find(q => q.day === x.i && c.mins(q.start) <= t && c.mins(q.end) > t); say(`${c.clock(t)} · ${ev ? (ev.cat === "sleep" ? "在睡觉" : c.esc(ev.text)) : "这段没有记录"}`); });
        addEventListener("pointerup", () => { drag = null; });
        stg.addEventListener("click", e => { if (moved) return; const b = e.target.closest(".sky-book"), cl = e.target.closest(".sky-cloud,.sky-sun,.sky-moon");
          if (b && +getComputedStyle(b).opacity > 0) { bks.forEach(q => q.classList.toggle("on", q === b)); const it = BK[+b.dataset.k];
            say(`第 ${+b.dataset.k + 1} 本书 · 周${c.DAYS[it.e.day]} ${it.e.start} ${c.esc(it.e.text)}`); return; }
          if (cl && cl.classList.contains("sky-moon")) { say(x.tonight != null ? `今晚睡了 ${c.hm(x.tonight)}：月亮${x.tonight >= 8 ? "是满的" : `缺了 ${Math.round((1 - fullness) * 100)}%`} · 星星 ${Math.round(x.tonight)} 颗` : "今晚的觉下周再记"); return; }
          if (cl) { const md = x.mood; say(md?.level != null ? `心情 ${md.level}/5 · ${WX[md.level]}${md.quote ? ` ·「${c.esc(md.quote)}」` : ""}` : "这天的心情看不清"); } });
        evs.forEach(li => li.addEventListener("click", () => { const t = +li.dataset.s + 1; ctl.t = t; render(t, true); say(`${c.clock(t - 1)} · ${c.esc(li.querySelector("span").textContent)}`); }));
        const ctl = { x, sec, din, stg, render, t: x.t0, lv: x.mood?.level ?? null, info, feel: info.feel,
          fxTl: live ? L.fxAnimate(svg, info, gsap) : null, qTl: live ? L.quoteAnim(qchars, info.feel, gsap) : null,
          setOn: on => { dayOn = on; [curAct && curAct._tl, ctl.fxTl, ctl.qTl].forEach(tl => tl && (on ? tl.play() : tl.pause()));
            /* 面板第一次亮起：横条从 0 长到实际值，环一段一段画出来，数字跟着数 */
            if (on && live && !ctl.grown && panelEl) { ctl.grown = true;
              gsap.from(c.$$(".pb,.avg", panelEl), { width: 0, duration: 1.1, stagger: .09, ease: "power3.out" });
              gsap.from(c.$$(".pr", panelEl), { strokeDasharray: "0 400", duration: 1.1, stagger: .1, ease: "power3.out" });
              gsap.from(c.$$(".pd", panelEl), { scale: 0, transformOrigin: "50% 50%", duration: .4, stagger: .012, ease: "back.out(2)" });
              c.$$(".cl-bar b", panelEl).forEach(b => { const m = b.textContent.match(/^(\d+)h(\d+)?$/); if (!m) return; const tot = +m[1] * 60 + +(m[2] || 0), o = { v: 0 }, fin = b.textContent;
                gsap.to(o, { v: tot, duration: 1.1, ease: "power3.out", onUpdate: () => { b.textContent = c.hm(o.v / 60); }, onComplete: () => { b.textContent = fin; } }); }); } } };
        L.wirePanel(panelEl, info, c, x, { scrub: t => { ctl.t = t; render(t, true); } }, live ? gsap : null);
        const cv = c.$("canvas", stg); if (cv) rains.push({ cv, ctl, drops: [], on: false });
        return ctl;
      });

      /* 雨：只在那一天的场景停着的时候下 */
      const rainLoop = () => {
        rains.forEach(r => { if (!r.on) return; const cv = r.cv, dpr = Math.min(2, devicePixelRatio || 1), w = cv.clientWidth, h = cv.clientHeight;
          if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
          const g = cv.getContext("2d"); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
          const heavy = r.ctl.feel === "sad" || r.ctl.lv === 1, want = heavy ? 230 : r.ctl.feel === "anxious" ? 140 : 70;
          while (r.drops.length < want) r.drops.push({ x: Math.random() * w, y: Math.random() * h * .8, v: (heavy ? 6 : 4) + Math.random() * 4 });
          r.spl = r.spl || [];
          g.strokeStyle = heavy ? "rgba(96,122,190,.7)" : "rgba(110,138,204,.62)"; g.lineWidth = heavy ? 2 : 1.6; g.beginPath();
          r.drops.forEach(d => { d.y += d.v; d.x -= d.v * .2; if (d.y > h * .8) { if (r.spl.length < 60) r.spl.push({ x: d.x, y: h * (.8 + Math.random() * .08), a: 0 }); d.y = h * .15 * Math.random(); d.x = Math.random() * w + 30; }
            g.moveTo(d.x, d.y); g.lineTo(d.x + 2.4, d.y - (heavy ? 14 : 11)); });
          g.stroke();
          g.strokeStyle = "rgba(96,122,190,.55)"; g.lineWidth = 1.2; r.spl = r.spl.filter(q => q.a < 1);
          r.spl.forEach(q => { q.a += .08; g.globalAlpha = 1 - q.a; g.beginPath(); g.ellipse(q.x, q.y, 3 + q.a * 9, 1 + q.a * 2.5, 0, Math.PI, 2 * Math.PI); g.stroke(); }); g.globalAlpha = 1;
          if (r.ctl.lv === 1 && Math.random() < .006) { g.fillStyle = "rgba(255,255,255,.55)"; g.fillRect(0, 0, w, h); } });
        requestAnimationFrame(rainLoop);
      };

      summary(c, live, gsap, ST, INFO);
      if (!live) { dayCtl.forEach(d => { d.t = d.x.t1; d.render(d.x.t1, false); }); return; }

      /* ---------- 动起来 ---------- */
      const dig = digitTargets(), R = rng(7);
      const pick168 = cells.map((el, k) => { const n = cells.length, m = dig.length; return m >= n ? dig[Math.floor(k * m / n)] : (k < m ? dig[k] : null); });
      cells.forEach((el, k) => { const a = pick168[k]; el._a = a ? { x: a.x, y: a.y, s: 1, r: 0, o: 1 } : { x: R() * 360, y: R() * 250, s: .35, r: R() * 90, o: .25 }; });
      cells.forEach(el => gsap.set(el, { x: R() * 900 - 270, y: R() * 900 - 330, rotation: R() * 360 - 180, scale: 0, opacity: 0 }));
      const intro = gsap.timeline({ delay: .1 });
      intro.to(cells, { x: (k, el) => el._a.x, y: (k, el) => el._a.y, rotation: (k, el) => el._a.r, scale: (k, el) => el._a.s, opacity: (k, el) => el._a.o,
        duration: 1.3, ease: "expo.out", stagger: { amount: .9, from: "random" } })
        .from(".cl-kick,.l1", { opacity: 0, y: 14, duration: .7, ease: "power3.out", stagger: .12 }, .5);
      T._intro = intro;
      /* 滚动时间线要等开场动画结束再建：否则它会记下方块还散着的起点，刷新时把它们打回去 */
      const pinIntro = ST.create({ trigger: ".cl-intro", start: "top top", end: "+=160%", pin: true, refreshPriority: 10 });
      intro.eventCallback("onComplete", () => { pinIntro.kill(); buildIntroScroll(); ST.sort(); ST.refresh(); });
      const buildIntroScroll = () => gsap.timeline({ scrollTrigger: { trigger: ".cl-intro", start: "top top", end: "+=160%", pin: true, scrub: 1, refreshPriority: 10,
        onUpdate: s => { gridMode = s.progress > .42 && s.progress < .9; } } })
        .to(cells, { x: (k, el) => grid(el).x, y: (k, el) => grid(el).y, rotation: 0, scale: 1, opacity: 1, duration: .4, ease: "power2.inOut", stagger: { amount: .14, from: "center" } }, 0)
        .to(".l1", { opacity: 0, y: -10, duration: .12 }, .1).to(".l2", { opacity: 1, duration: .15 }, .3)
        .to(".cl-gdays,.cl-gaxis,.cl-key", { opacity: 1, duration: .15 }, .35)
        .to(".cl-down", { opacity: 0, duration: .1 }, 0)
        .to(".cl-ipin", { y: -90, opacity: 0, duration: .15, ease: "power1.in" }, .85);

      /* 每一天：斜切换场 + 固定场景，时钟、太阳、月亮、书、心跳都跟着滑动走 */
      dayCtl.forEach(d => {
        const { sec, din, render, x } = d, p = { t: x.t0 };
        const big = c.$(".cl-trans svg.big", sec), info = d.info, wash = c.$(".cl-wash", sec), pts = c.$$(".cl-trans .pt", sec);
        wash.style.clipPath = L.mask(info.mask, 0).clip;
        din.style.clipPath = L.mask(info.mask, 0).clip;
        render(x.t0, false);
        const w = { p: 0 };
        gsap.to(w, { p: 1, ease: "none", onUpdate: () => { const m = L.mask(info.mask, w.p), W = sec.clientWidth, Hh = innerHeight;
            const lag = Math.max(0, (w.p - .1) / .9), lead = Math.min(1, w.p * 1.15);
            din.style.clipPath = lag >= 1 ? "none" : L.mask(info.mask, lag).clip;
            wash.style.clipPath = lead >= 1 ? "none" : L.mask(info.mask, lead).clip;
            const [ex, ey] = L.mask(info.mask, lead).el, B = Math.min(W * .72, 430), sw = Math.sin(Math.PI * w.p);
            big.style.opacity = w.p > .02 && w.p < .96 ? 1 : 0;
            big.style.transform = `translate(${(ex / 100 * W - B / 2).toFixed(1)}px,${(ey / 100 * Hh - B / 2).toFixed(1)}px) scale(${(.55 + sw * .65).toFixed(2)}) rotate(${(-28 + w.p * 56).toFixed(1)}deg)`;
            pts.forEach((q, k) => { const a = k / pts.length * Math.PI * 2 + w.p * 3, rr = 40 + sw * (90 + (k % 3) * 50);
              q.style.opacity = sw > .05 ? (.85 * sw).toFixed(2) : 0;
              q.style.transform = `translate(${(ex / 100 * W + Math.cos(a) * rr).toFixed(1)}px,${(ey / 100 * Hh + Math.sin(a) * rr * .7).toFixed(1)}px) scale(${(.6 + sw).toFixed(2)})`; }); },
          scrollTrigger: { trigger: sec, start: "top bottom", end: "top top", scrub: true, onToggle: s => { if (s.isActive) render(d.t, false); } } });
        gsap.to(p, { t: x.t1, ease: "none", onUpdate: () => { d.t = p.t; render(p.t, true); },
          scrollTrigger: { trigger: sec, start: "top top", end: "+=110%", pin: true, scrub: .8,
            onToggle: s => { const r = rains.find(q => q.ctl === d); if (r) r.on = s.isActive; d.setOn(s.isActive); } } });
        gsap.from(c.$$(".cl-panel,.cl-evs", sec), { y: 30, opacity: 0, duration: .8, ease: "expo.out", stagger: .1, scrollTrigger: { trigger: sec, start: "top 20%", toggleActions: "play none none reverse" } });
        gsap.from(c.$$(".cl-panel .pb,.cl-panel .pr", sec), { scaleX: 0, transformOrigin: "0% 50%", duration: 1, ease: "power3.out", stagger: .08, scrollTrigger: { trigger: sec, start: "top 15%", toggleActions: "play none none none" } });
        const nd = c.$(".pneedle", sec); if (nd) gsap.from(nd, { rotation: 0, svgOrigin: "50 54", duration: 1.4, ease: "elastic.out(1,.6)", scrollTrigger: { trigger: sec, start: "top 15%" } });
        gsap.from(c.$(".cl-dhead", sec), { x: -40, opacity: 0, duration: .8, ease: "expo.out", scrollTrigger: { trigger: sec, start: "top 30%", toggleActions: "play none none reverse" } });
      });
      requestAnimationFrame(rainLoop);
      ST.create({ trigger: ".cl-day", endTrigger: ".cl-sum", start: "top 40%", end: "top 60%", onToggle: s => clockEl.classList.toggle("on", s.isActive) });

      /* ---------- 成就：3D 卡翻上来、数字滚轮、彩纸、拖着倾斜 ---------- */
      const tintBg = col => gsap.to(document.body, { backgroundColor: col, duration: 2, ease: "power1.out", overwrite: "auto" });
      c.$$(".cl-ach").forEach(a => {
        const card = c.$(".cl-acard", a), col = getComputedStyle(H).getPropertyValue("--t-" + a.dataset.tint).trim(), fig = c.$(".cl-afig", a);
        gsap.set(card, { rotationX: -62, y: 160, opacity: 0, transformOrigin: "50% 100%" });
        c.$$(".cl-reel", a).forEach(r => gsap.set(r, { yPercent: 0 }));
        ST.create({ trigger: a, start: "top 70%", once: true, onEnter: () => {
          const tl = gsap.timeline();
          tl.to(card, { rotationX: 0, y: 0, opacity: 1, duration: 1.3, ease: "expo.out" })
            .to(c.$$(".cl-reel", a), { yPercent: -100 * 19 / 20, duration: 1.6, ease: "power4.out", stagger: .12 }, .15)
            .from(c.$$(".cl-ch", a), { yPercent: 100, opacity: 0, duration: .7, ease: "back.out(2)", stagger: .06 }, .3)
            .from(c.$$(".cl-atag,.cl-awhat,.cl-adetail,.cl-asay,.cl-tiltme", a), { y: 18, opacity: 0, duration: .7, ease: "power3.out", stagger: .08 }, .35)
            .add(() => { const r = card.getBoundingClientRect(); burst(r.left + r.width / 2, r.top + 40); }, .9);
          if (fig) tl.fromTo(fig.firstElementChild, { clipPath: "polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%)" }, { clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)", ease: "power1.out", duration: 2 }, .5);
        } });
        ST.create({ trigger: a, start: "top 60%", end: "bottom 40%", onEnter: () => tintBg(col), onEnterBack: () => tintBg(col) });
        const rx = gsap.quickTo(card, "rotationX", { duration: .5, ease: "power3.out" }), ry = gsap.quickTo(card, "rotationY", { duration: .5, ease: "power3.out" });
        const tilt = e => { const r = card.getBoundingClientRect(), px = cl01((e.clientX - r.left) / r.width), py = cl01((e.clientY - r.top) / r.height);
          ry((px - .5) * 22); rx(-(py - .5) * 16); card.style.setProperty("--gx", px * 100 + "%"); card.style.setProperty("--gy", py * 100 + "%"); };
        card.addEventListener("pointermove", e => { if (e.pointerType === "mouse" || e.buttons) tilt(e); });
        card.addEventListener("pointerdown", tilt);
        card.addEventListener("pointerleave", () => { rx(0); ry(0); }); card.addEventListener("pointerup", () => { rx(0); ry(0); });
      });

      /* ---------- 收拢：一周天气 ---------- */
      const sum = c.$(".cl-sum"), nums = c.$$(".cl-snums div", sum), o = { p: 0 };
      ST.create({ trigger: sum, start: "top 60%", onEnter: () => tintBg(getComputedStyle(H).getPropertyValue("--bg").trim()) });
      gsap.timeline({ scrollTrigger: { trigger: sum, start: "top top", end: "+=90%", pin: true, scrub: .8 } })
        .from(c.$$("h2,.cl-sin>p", sum), { y: 30, opacity: 0, duration: .25 }, 0)
        .from(c.$$(".cl-tile", sum), { y: 46, scale: .9, opacity: 0, stagger: .05, duration: .4, ease: "power3.out" }, .05)
        .from(nums, { y: 40, opacity: 0, stagger: .08, duration: .3 }, .4)
        .to(o, { p: 1, duration: .4, onUpdate: () => nums.forEach(n => { if (n.dataset.v !== "") n.querySelector("b").textContent = c.fmt(+n.dataset.v * o.p, n.dataset.k); }) }, .45)
        .from(c.$(".cl-shint", sum), { opacity: 0, duration: .1 }, .85);
      c.$$(".cl-tile", sum).forEach(tile => { let up = false; tile.addEventListener("click", () => { up = !up;
        gsap.to(tile, { rotationY: up ? 180 : 0, z: 30, duration: .7, ease: "power3.inOut", onComplete: () => gsap.to(tile, { z: 0, duration: .2 }) }); }); });
      const box3 = c.$(".cl-snums", sum);
      const cmp = on => { box3.classList.toggle("cmp", on); nums.forEach(n => { if (n.dataset.v === "" || n.dataset.p === "") return; const v = +n.dataset.v, p = +n.dataset.p, k = n.dataset.k;
        n.querySelector("b").textContent = c.fmt(on ? p : v, k);
        n.querySelector("em").textContent = on ? `上周 · 这周${v >= p ? "多" : "少"} ${c.fmt(Math.abs(v - p), k)}` : (c.data.core.find(q => q.label === n.querySelector("span").textContent)?.goal != null ? `目标 ${c.fmt(c.data.core.find(q => q.label === n.querySelector("span").textContent).goal, k)}` : ""); }); };
      box3.addEventListener("pointerdown", () => cmp(true)); addEventListener("pointerup", () => cmp(false)); box3.addEventListener("pointerleave", () => cmp(false));

      document.fonts && document.fonts.ready.then(() => ST.refresh());
    },

    replay() { if (this._intro) this._intro.restart(true); }
  };
})();
