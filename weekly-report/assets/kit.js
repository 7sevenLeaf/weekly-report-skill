/* 周报页面套件：读 <script id="week"> 里的数据，按模块画出页面。
   主题通过 window.WR_THEME 改标题、改封面、加额外模块、在画完后加装饰；样式交给主题的 CSS 变量。
   动效原则：每个动效都在讲数据（数字滚动、柱子长出、线条画出、格子亮起），减少动效时直接给终态。 */
(function () {
  "use strict";
  const data = JSON.parse(document.getElementById("week").textContent);
  const T = window.WR_THEME || {};
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const root = document.getElementById("wr");
  const DAYS = ["一", "二", "三", "四", "五", "六", "日"];
  const CATS = [["study", "学习"], ["sport", "运动"], ["life", "个人"], ["star", "高光"], ["sleep", "睡眠"]];
  const CATN = Object.fromEntries(CATS);
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const hm = h => { if (h == null) return "—"; const H = Math.floor(h + 1e-9), M = Math.round((h - H) * 60); return M === 60 ? `${H + 1}h` : H ? (M ? `${H}h${String(M).padStart(2, "0")}` : `${H}h`) : `${M}m`; };
  const fmt = (v, kind) => v == null ? "—" : kind === "count" ? String(Math.round(v)) : hm(v);
  const mins = t => { const [a, b] = t.split(":").map(Number); return a * 60 + b; };
  const clock = m => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
  const ease = t => 1 - Math.pow(1 - t, 3);
  document.documentElement.classList.add(reduce ? "wr-still" : "wr-move");

  /* 进场：一个元素第一次进入视野时触发 */
  const enterFns = new WeakMap();
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add("wr-in"); io.unobserve(e.target);
    (enterFns.get(e.target) || []).forEach(f => f());
  }), { threshold: .18 });
  const onEnter = (el, fn) => { if (!el) return; if (fn) enterFns.set(el, [...(enterFns.get(el) || []), fn]); io.observe(el); };

  /* 数字滚动 */
  function countUp(el, value, kind, dur = 900) {
    if (value == null) { el.textContent = "—"; return; }
    if (reduce) { el.textContent = fmt(value, kind); return; }
    const t0 = performance.now(), id = (el._cu = (el._cu || 0) + 1);
    (function step(t) { if (el._cu !== id) return; const p = clamp((t - t0) / dur);
      const v = value * ease(p); el.textContent = kind === "count" ? String(Math.round(v)) : hm(Math.round(v * 60) / 60);
      if (p < 1) requestAnimationFrame(step); else el.textContent = fmt(value, kind); })(t0);
  }

  /* 小画一笔一笔画出来：线条描边，块和点淡入；点一下重播 */
  function drawSvg(svg) {
    if (reduce || !svg) return;
    const parts = $$("path,line,polyline,polygon,circle,ellipse,rect,text", svg).filter(n => !n.closest("defs"));
    const n = parts.length, step = Math.min(40, 700 / Math.max(n, 1));
    parts.forEach((p, i) => {
      const cs = getComputedStyle(p), stroked = cs.stroke !== "none" && (cs.fill === "none" || p.getAttribute("fill") === "none");
      const delay = 120 + i * step;
      if (stroked && p.getTotalLength) {
        let L = 0; try { L = p.getTotalLength(); } catch (e) { }
        if (L > 0) { p.animate([{ strokeDasharray: L, strokeDashoffset: L }, { strokeDasharray: L, strokeDashoffset: 0 }], { duration: 700, delay, easing: "cubic-bezier(.2,.8,.2,1)", fill: "backwards" }); return; }
      }
      if (p.hasAttribute("transform")) { p.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 380, delay, fill: "backwards" }); return; }
      p.style.transformBox = "fill-box"; p.style.transformOrigin = p.tagName === "rect" ? "50% 100%" : "50% 50%";
      p.animate([{ opacity: 0, transform: p.tagName === "text" ? "translateY(4px)" : "scale(.6)" }, { opacity: 1, transform: "none" }], { duration: 420, delay, easing: "cubic-bezier(.2,.8,.2,1)", fill: "backwards" });
    });
  }

  /* 小图标 */
  const S = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const ICON = {
    study: S('<path d="M3 6c3-1.5 6-1.5 9 0v13c-3-1.5-6-1.5-9 0zM21 6c-3-1.5-6-1.5-9 0v13c3-1.5 6-1.5 9 0z"/>'),
    book: S('<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h11"/>'),
    math: S('<path d="M18 5H7l6 7-6 7h11"/>'),
    code: S('<path d="M8 7l-5 5 5 5M16 7l5 5-5 5M13.5 5l-3 14"/>'),
    lab: S('<path d="M9 3h6M10 3v6L4.5 19a1.5 1.5 0 0 0 1.3 2h12.4a1.5 1.5 0 0 0 1.3-2L14 9V3"/><path d="M7 15h10"/>'),
    pen: S('<path d="M4 20l1-5L16 4l4 4L9 19z"/><path d="M13.5 6.5l4 4"/>'),
    music: S('<path d="M9 18V5l10-2v13"/><ellipse cx="6.5" cy="18" rx="2.8" ry="2.1" fill="currentColor"/><ellipse cx="16.5" cy="16" rx="2.8" ry="2.1" fill="currentColor"/>'),
    sing: S('<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>'),
    run: S('<circle cx="14" cy="4.5" r="2"/><path d="M6 20l4-5 3 2 1-5 4 3M10 8l3-1 2 4"/>'),
    gym: S('<path d="M3 12h18"/><path d="M6 7v10M9 9v6M15 9v6M18 7v10" stroke-width="2.6"/>'),
    ball: S('<circle cx="12" cy="12" r="9"/><path d="M12 7.5l4 3-1.5 4.7h-5L8 10.5z" fill="currentColor" stroke="none"/>'),
    swim: S('<path d="M2 17c2 0 2-1.5 4-1.5S8 17 10 17s2-1.5 4-1.5 2 1.5 4 1.5 2-1.5 4-1.5"/><circle cx="16" cy="7" r="2"/><path d="M5 13l5-4 3 3"/>'),
    bike: S('<circle cx="6" cy="16" r="3.5"/><circle cx="18" cy="16" r="3.5"/><path d="M6 16l4-7h5l3 7M10 9l3 7"/>'),
    sleep: S('<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>'),
    heart: S('<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/>'),
    game: S('<rect x="3" y="8" width="18" height="10" rx="5"/><path d="M8 11v4M6 13h4"/>'),
    star: S('<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>'),
    trip: S('<path d="M12 21s-6-5.5-6-11a6 6 0 0 1 12 0c0 5.5-6 11-6 11z"/><circle cx="12" cy="10" r="2.2"/>'),
    meet: S('<circle cx="8" cy="9" r="3"/><circle cx="16" cy="9" r="3"/><path d="M3 19c.5-3 2.5-4.5 5-4.5s4.5 1.5 5 4.5M11 19c.5-3 2.5-4.5 5-4.5s4.5 1.5 5 4.5"/>')
  };
  const icon = k => k ? (ICON[k] || `<span class="wr-glyph">${esc(k)}</span>`) : "";

  const LABEL = Object.assign({
    core: { title: "这周的数", hint: "点一项，看每天" },
    split: { title: "时间花在哪", hint: "168 小时 · 点一类看每天" },
    achievements: { title: "本周成就", hint: "点小画重播" },
    timeline: { title: "一周时间线", hint: "按住左右拖，看任何一刻" },
    heat: { title: "专注时段", hint: "7 天 × 24 小时 · 点一格" },
    goals: { title: "目标对账", hint: "先看做成的，再看差在哪" },
    mood: { title: "这周的起伏", hint: "点一天" },
    quotes: { title: "值得记住的话", hint: "左右滑，看下一句" },
    review: { title: "复盘", hint: "" },
    letter: { title: "写给这一周", hint: "" }
  }, T.labels || {});
  const STATUS = Object.assign({ done: "达成", partial: "部分", moved: "调整", missed: "没做" }, T.status || {});
  const REVIEW = Object.assign({ good: "做得好", improve: "要改进", next: "下周三件事" }, T.review || {});
  const reader = data.meta.reader || "助手";
  const TL = data.timeline || [];

  const head = k => `<div class="wr-h"><h2>${esc(LABEL[k].title)}</h2>${LABEL[k].hint ? `<span class="wr-hint">${esc(LABEL[k].hint)}</span>` : ""}</div>`;
  const sec = (k, body) => `<section class="wr-sec wr-s-${k}" id="wr-${k}">${head(k)}${body}</section>`;
  const ctx = { data, root, $, $$, esc, icon, fmt, hm, DAYS, reduce, clamp, countUp, onEnter, drawSvg, mins, clock };

  /* 封面 */
  function cover() {
    if (T.cover) return T.cover(ctx);
    const m = data.meta;
    const nums = data.core.slice(0, 3).map(c => `<div><b class="wr-cu" data-v="${c.value ?? ""}" data-k="${c.kind}">${fmt(c.value, c.kind)}</b><span>${esc(c.label)}</span></div>`).join("");
    return `<header class="wr-cover"><div class="wr-kicker"><span>第 ${m.week} 周</span><span>${m.start.replaceAll("-", ".")} — ${m.end.slice(5).replace("-", ".")}</span></div>
      <h1 class="wr-title">${esc(m.title).replace(/(..)(..)/, "$1<br>$2")}</h1>${m.name ? `<div class="wr-name">${esc(m.name)}</div>` : ""}
      <div class="wr-cover-nums">${nums}</div></header>`;
  }

  /* 核心数据 */
  function core() {
    const tabs = data.core.map((c, i) => `<button class="wr-tab" data-i="${i}" aria-pressed="${i === 0}">${esc(c.label)}</button>`).join("");
    return sec("core", `<div class="wr-tabs" role="group" aria-label="切换数据">${tabs}</div>
      <div class="wr-big" aria-live="polite"></div><p class="wr-cmp"></p>
      <div class="wr-bars"><div class="wr-goal"><span></span></div>${DAYS.map(() => `<button class="wr-bar"><b></b><i></i></button>`).join("")}</div>
      <div class="wr-days">${DAYS.map(d => `<span>${d}</span>`).join("")}</div><p class="wr-note wr-daynote" aria-live="polite"></p>`);
  }
  function wireCore() {
    const el = $("#wr-core"); if (!el) return;
    const bars = $$(".wr-bar", el), H = 120; let cur = 0, entered = reduce;
    function show(i, fromTap) {
      cur = i; const c = data.core[i];
      $$(".wr-tab", el).forEach((b, k) => b.setAttribute("aria-pressed", k === i));
      if (entered) countUp($(".wr-big", el), c.value, c.kind); else $(".wr-big", el).textContent = fmt(c.value, c.kind);
      const parts = [];
      if (c.goal != null) parts.push(`目标 ${fmt(c.goal, c.kind)}${c.kind === "count" ? " 次" : ""}`);
      if (c.prev != null && c.value != null) { const d = c.value - c.prev; parts.push(`比上周 ${d >= 0 ? "+" : "−"}${fmt(Math.abs(d), c.kind)}`); }
      $(".wr-cmp", el).innerHTML = `<b>${esc(c.label)}</b>${parts.length ? " · " + esc(parts.join(" · ")) : ""}`;
      const vals = c.daily || [], max = Math.max(...vals.filter(v => v != null), c.kind === "avg_hours" ? (c.goal || 0) : 0, c.daily_goal || 0, 0.01) * 1.08;
      bars.forEach((b, k) => { const v = vals[k], bar = $("i", b); $("b", b).textContent = v == null ? "没记" : v ? fmt(v, c.kind) : "0";
        b.setAttribute("aria-label", `周${DAYS[k]} ${v == null ? "没记" : fmt(v, c.kind)}`); b.classList.remove("on");
        bar.classList.toggle("wr-zero", !v); bar.style.height = entered ? (v ? Math.max(4, v / max * H) : 3) + "px" : "0px"; bar.style.transitionDelay = k * 45 + "ms"; });
      const g = $(".wr-goal", el), daily = c.kind === "avg_hours" ? c.goal : c.daily_goal;
      g.hidden = daily == null || !entered; if (daily != null) { g.style.bottom = daily / max * H + "px"; $("span", g).textContent = `目标 ${fmt(daily, c.kind)}`; }
      $(".wr-daynote", el).textContent = c.note || "";
    }
    bars.forEach((b, k) => b.onclick = () => { const c = data.core[cur], v = (c.daily || [])[k];
      bars.forEach((x, j) => x.classList.toggle("on", j === k));
      const ev = TL.filter(e => e.day === k && e.cat === c.key).map(e => e.text).filter(Boolean);
      $(".wr-daynote", el).textContent = `周${DAYS[k]}：${v == null ? "没有记录" : fmt(v, c.kind) + (c.kind === "count" ? " 次" : "")}${ev.length ? " · " + ev.join("、") : ""}`; });
    $$(".wr-tab", el).forEach(b => b.onclick = () => show(+b.dataset.i, true));
    show(0); onEnter(el, () => { entered = true; show(cur); });
    ctx.showCore = show;
  }

  /* 时间花在哪：一周 168 小时按类别切开，横向堆叠条 */
  function split() {
    if (!TL.length) return "";
    return sec("split", `<div class="wr-stack" role="group" aria-label="各类时间占比"></div><div class="wr-legend"></div><div class="wr-mini" aria-live="polite"></div>`);
  }
  function wireSplit() {
    const el = $("#wr-split"); if (!el) return;
    const tot = {}, per = {}; CATS.forEach(([k]) => { tot[k] = 0; per[k] = [0, 0, 0, 0, 0, 0, 0]; });
    TL.forEach(e => { const h = (mins(e.end) - mins(e.start)) / 60; tot[e.cat] += h; per[e.cat][e.day] += h; });
    const known = Object.values(tot).reduce((a, b) => a + b, 0), rest = Math.max(0, 168 - known);
    const rows = CATS.filter(([k]) => tot[k] > 0).map(([k, n]) => [k, n, tot[k]]).concat(rest > .5 ? [["none", "没记录", rest]] : []);
    const stack = $(".wr-stack", el);
    stack.innerHTML = rows.map(([k, n, h]) => `<button class="wr-seg wr-c-${k}" data-k="${k}" style="flex-grow:${h}" aria-label="${n} ${hm(h)}"></button>`).join("");
    $(".wr-legend", el).innerHTML = rows.map(([k, n, h]) => `<button class="wr-li" data-k="${k}"><i class="wr-sw wr-c-${k}"></i><span>${n}</span><b>${hm(h)}</b><em>${Math.round(h / 1.68)}%</em></button>`).join("");
    const mini = $(".wr-mini", el);
    function pick(k) {
      $$("[data-k]", el).forEach(b => b.classList.toggle("off", b.dataset.k !== k));
      if (k === "none") { mini.innerHTML = `<p class="wr-note">日历里没有记录的时间，不猜它做了什么。</p>`; return; }
      const v = per[k], mx = Math.max(...v, .01);
      mini.innerHTML = `<div class="wr-mbars">${v.map((h, i) => `<div><i class="wr-c-${k}" style="height:${Math.max(h ? 3 : 0, h / mx * 56)}px"></i><b>${h ? hm(h) : "·"}</b><span>${DAYS[i]}</span></div>`).join("")}</div>`;
      if (!reduce) $$(".wr-mbars i", mini).forEach((b, i) => b.animate([{ transform: "scaleY(0)" }, { transform: "none" }], { duration: 500, delay: i * 40, easing: "cubic-bezier(.2,.8,.2,1)", fill: "backwards" }));
    }
    $$("[data-k]", el).forEach(b => b.onclick = () => pick(b.dataset.k));
    pick(rows[0][0]);
    if (T.splitStyle !== "stack" && T.splitStyle !== "custom") {
      const R0 = 72, C = 2 * Math.PI * R0; let off = 0;
      const segs = rows.map(([k, n, h]) => { const len = h / 168 * C, g = `<circle class="wr-dseg wr-dc-${k}" data-k="${k}" r="${R0}" cx="100" cy="100" fill="none" stroke-width="30" stroke-dasharray="${Math.max(0, len - 2).toFixed(1)} ${C.toFixed(1)}" stroke-dashoffset="${(-off).toFixed(1)}" transform="rotate(-90 100 100)"/>`; off += len; return g; }).join("");
      stack.insertAdjacentHTML("beforebegin", `<div class="wr-donut"><svg viewBox="0 0 200 200" role="img" aria-label="一周 168 小时的分配">${segs}<text class="wr-dc1" x="100" y="94" text-anchor="middle">一周</text><text class="wr-dc2" x="100" y="121" text-anchor="middle">168h</text></svg></div>`);
      stack.style.display = "none";
      const dpick = k => { $$(".wr-dseg", el).forEach(q => q.classList.toggle("off", q.dataset.k !== k)); const r = rows.find(q => q[0] === k); if (r) { $(".wr-dc1", el).textContent = r[1]; $(".wr-dc2", el).textContent = hm(r[2]); } };
      $$(".wr-dseg", el).forEach(g => g.addEventListener("click", () => { pick(g.dataset.k); dpick(g.dataset.k); }));
      $$(".wr-li", el).forEach(b => b.addEventListener("click", () => dpick(b.dataset.k)));
      onEnter(el, () => { if (!reduce) $$(".wr-dseg", el).forEach((g, i) => g.animate([{ strokeDasharray: `0 ${C}` }, { strokeDasharray: g.getAttribute("stroke-dasharray") }], { duration: 1100, delay: i * 110, easing: "cubic-bezier(.2,.8,.2,1)", fill: "backwards" })); });
    }
    onEnter(el, () => { if (!reduce) $$(".wr-seg", stack).forEach((s, i) => s.animate([{ transform: "scaleX(0)" }, { transform: "none" }], { duration: 600, delay: i * 90, easing: "cubic-bezier(.2,.8,.2,1)", fill: "backwards" })); });
  }

  /* 成就 */
  function achievements() {
    const li = data.achievements.map((a, i) => `<li class="wr-a" data-rv style="--n:${i}">
      <div class="wr-a-top"><span class="wr-rank">${String(i + 1).padStart(2, "0")}</span><div><div class="wr-a-big">${esc(a.big)}</div>
      <div class="wr-a-what">${esc(a.what)}${a.when ? `<span> · ${esc(a.when)}</span>` : ""}</div></div></div>
      ${a.figure ? `<figure class="wr-fig" title="点一下重播">${a.figure}</figure>` : ""}
      ${a.detail ? `<p class="wr-a-detail">${esc(a.detail)}</p>` : ""}${a.say ? `<p class="wr-say">${esc(a.say)}</p>` : ""}</li>`).join("");
    return sec("achievements", `<ol class="wr-alist">${li}</ol>`);
  }
  function wireAchievements() {
    $$(".wr-a").forEach(a => { const svg = $(".wr-fig svg", a); onEnter(a, () => drawSvg(svg)); if (svg) a.querySelector(".wr-fig").onclick = () => drawSvg(svg); });
  }

  /* 时间线：按住拖动，看任何一刻 */
  function timeline() {
    if (!TL.length) return "";
    const rows = DAYS.map((d, i) => `<div class="wr-row" data-i="${i}"><b>${d}</b><span class="wr-track">${
      TL.filter(e => e.day === i).map(e => `<i class="wr-blk wr-c-${e.cat}" style="left:${mins(e.start) / 14.4}%;width:${Math.max((mins(e.end) - mins(e.start)) / 14.4, .8)}%"></i>`).join("")}</span></div>`).join("");
    const key = CATS.filter(([k]) => TL.some(e => e.cat === k)).map(([k, n]) => `<span><i class="wr-sw wr-c-${k}"></i>${n}</span>`).join("");
    return sec("timeline", `<div class="wr-now" aria-live="polite"><b></b><span></span></div>
      <div class="wr-tl" tabindex="0" role="slider" aria-label="一周时间线，左右键移动时间，上下键换一天">${rows}<i class="wr-cursor" aria-hidden="true"></i></div>
      <div class="wr-axis"><span></span><div><span>0</span><span>6</span><span>12</span><span>18</span><span>24</span></div></div>
      <div class="wr-key">${key}</div><div class="wr-dayd" aria-live="polite"></div>`);
  }
  function wireTimeline() {
    const el = $("#wr-timeline"); if (!el) return;
    const tl = $(".wr-tl", el), rows = $$(".wr-row", el), cur = $(".wr-cursor", el);
    let day = -1, minute = 0;
    function setDay(i) { if (i === day) return; day = i; rows.forEach((r, k) => r.classList.toggle("on", k === i));
      const ev = TL.filter(e => e.day === i && e.cat !== "sleep");
      $(".wr-dayd", el).innerHTML = `<h3>周${DAYS[i]}</h3>${ev.length ? `<ul>${ev.map(e => `<li data-s="${mins(e.start)}"><em>${icon(e.icon)}</em><span>${e.start}–${e.end}</span><span>${esc(e.text)}</span></li>`).join("")}</ul>` : `<p class="wr-note">这天没有记录。</p>`}`; }
    function set(i, m) { m = clamp(Math.round(m / 10) * 10, 0, 1430); setDay(i); minute = m;
      const tb = $(".wr-track", rows[0]).getBoundingClientRect(), box = tl.getBoundingClientRect();
      cur.style.left = (tb.left - box.left + tb.width * m / 1440) + "px";
      const e = TL.find(x => x.day === i && mins(x.start) <= m && mins(x.end) > m);
      $(".wr-now b", el).textContent = `周${DAYS[i]} ${clock(m)}`;
      $(".wr-now span", el).textContent = e ? (e.cat === "sleep" ? "在睡觉" : e.text) : "这段没有记录";
      $$(".wr-dayd li", el).forEach(li => { const s = +li.dataset.s, ev = TL.find(x => x.day === i && mins(x.start) === s); li.classList.toggle("on", !!ev && mins(ev.start) <= m && mins(ev.end) > m); }); }
    function fromPointer(ev) { const tb = $(".wr-track", rows[0]).getBoundingClientRect();
      let i = rows.findIndex(r => { const b = r.getBoundingClientRect(); return ev.clientY >= b.top - 2 && ev.clientY <= b.bottom + 2; }); if (i < 0) i = day;
      set(i, (ev.clientX - tb.left) / tb.width * 1440); }
    let drag = false;
    tl.addEventListener("pointerdown", e => { drag = true; try { tl.setPointerCapture(e.pointerId); } catch (x) { } fromPointer(e); });
    tl.addEventListener("pointermove", e => { if (drag) fromPointer(e); });
    addEventListener("pointerup", () => drag = false); addEventListener("pointercancel", () => drag = false);
    tl.addEventListener("keydown", e => { if (!e.key.startsWith("Arrow")) return; e.preventDefault();
      set(clamp(day + (e.key === "ArrowDown") - (e.key === "ArrowUp"), 0, 6), minute + (e.key === "ArrowRight" ? 30 : e.key === "ArrowLeft" ? -30 : 0)); });
    const busy = DAYS.map((_, i) => TL.filter(e => e.day === i && e.cat !== "sleep").length), d0 = busy.indexOf(Math.max(...busy));
    const first = TL.find(e => e.day === d0 && e.cat !== "sleep");
    set(d0, first ? mins(first.start) + 30 : 600); addEventListener("resize", () => set(day, minute));
    ctx.setTime = set;
    onEnter(el, () => { if (!reduce) $$(".wr-blk", el).forEach((b, i) => b.animate([{ transform: "scaleX(0)" }, { transform: "none" }], { duration: 500, delay: (+b.closest(".wr-row").dataset.i) * 60 + 100, easing: "cubic-bezier(.2,.8,.2,1)", fill: "backwards" })); });
  }

  /* 专注时段：7×24，学习和高光按小时累计 */
  function heat() {
    if (!TL.length || !((T.extras || []).includes("heat") || (T.modules || []).includes("heat"))) return "";
    return sec("heat", `<div class="wr-heat" role="grid" aria-label="一周每小时的专注时长"></div><div class="wr-hax"><span></span><div><span>0</span><span>6</span><span>12</span><span>18</span><span>24</span></div></div><p class="wr-hread" aria-live="polite"></p>`);
  }
  function wireHeat() {
    const el = $("#wr-heat"); if (!el) return;
    const g = DAYS.map(() => Array(24).fill(0)), what = DAYS.map(() => Array(24).fill(""));
    TL.filter(e => e.cat === "study" || e.cat === "star").forEach(e => { for (let h = 0; h < 24; h++) {
      const ov = Math.max(0, Math.min(mins(e.end), h * 60 + 60) - Math.max(mins(e.start), h * 60)); if (ov) { g[e.day][h] += ov; what[e.day][h] = e.text; } } });
    const box = $(".wr-heat", el);
    box.innerHTML = DAYS.map((d, i) => `<b>${d}</b>` + g[i].map((m, h) => `<button class="wr-cell" data-d="${i}" data-h="${h}" style="--a:${m ? (.25 + .75 * Math.min(m, 60) / 60).toFixed(2) : 0}" aria-label="周${d} ${h} 点 ${m} 分钟"></button>`).join("")).join("");
    const total = g.flat().reduce((a, b) => a + b, 0), hours = g.flat().filter(m => m >= 45).length;
    const read = $(".wr-hread", el), base = `深色的格子是学进去的小时。整小时专注的有 ${hours} 格，累计 ${hm(total / 60)}。`;
    read.textContent = base;
    $$(".wr-cell", box).forEach(c => c.onclick = () => { const d = +c.dataset.d, h = +c.dataset.h, m = g[d][h];
      $$(".wr-cell", box).forEach(x => x.classList.toggle("on", x === c));
      read.textContent = `周${DAYS[d]} ${h}:00–${h + 1}:00 · ${m ? `${m} 分钟 · ${what[d][h]}` : "这一小时没有学习记录"}`; });
    onEnter(el, () => { if (!reduce) $$(".wr-cell", box).forEach(c => { if (+getComputedStyle(c).getPropertyValue("--a") > 0) c.animate([{ opacity: 0, transform: "scale(.3)" }, { opacity: 1, transform: "none" }], { duration: 380, delay: (+c.dataset.d * 3 + +c.dataset.h) * 14, easing: "cubic-bezier(.2,.8,.2,1)", fill: "backwards" }); }); });
  }

  /* 目标对账：结果写成「3 / 4」的自动画进度条 */
  const ratio = g => { const m = String(g.result || "").match(/([\d.]+)\s*\/\s*([\d.]+)/); return m ? clamp(+m[1] / +m[2]) : g.status === "done" ? 1 : null; };
  function goals() {
    if (!data.goals?.length) return "";
    return sec("goals", `<div class="wr-goals">${data.goals.map(g => { const r = ratio(g);
      return `<button class="wr-g" aria-expanded="false" data-s="${g.status}">
      <span class="wr-g-top"><span><span class="wr-g-n">${esc(g.name)}</span><span class="wr-g-r">${esc(g.result)}</span></span><span class="wr-stamp">${esc(STATUS[g.status] || g.status)}</span></span>
      ${r != null ? `<span class="wr-g-bar"><i style="--p:${r}"></i></span><em class="wr-g-pct" data-p="${r}">${Math.round(r * 100)}%</em>` : ""}
      <span class="wr-more"><span>${g.good ? `<span class="wr-g-p"><b>做成的：</b>${esc(g.good)}</span>` : ""}${g.gap ? `<span class="wr-g-p"><b>差在哪：</b>${esc(g.gap)}</span>` : ""}</span></span></button>`; }).join("")}</div>`);
  }

  /* 起伏 */
  function mood() {
    const m = data.mood; if (!m?.days?.length) return "";
    const note = m.source === "self" ? "曲线是本人每天打的分。" : `曲线高低是${esc(reader)}读当天的话和做的事画的，不是本人打的分。读不出来的那天留空。`;
    return sec("mood", `<div class="wr-curve"></div><div class="wr-days wr-mdays">${DAYS.map(d => `<span>${d}</span>`).join("")}</div>
      <div class="wr-read" aria-live="polite"></div><p class="wr-note">${note}</p>`);
  }
  function wireMood() {
    const el = $("#wr-mood"); if (!el) return;
    const D = data.mood.days, W = 700, H = 200, x = i => 40 + 620 * i / 6, y = v => 170 - (v - 1) * 35;
    let g = ""; for (let k = 0; k < 5; k++) g += `<line x1="0" x2="${W}" y1="${170 - k * 35}" y2="${170 - k * 35}" class="wr-grid"/>`;
    const pts = D.map((d, i) => d.level == null ? null : [x(i), y(d.level), i]).filter(Boolean);
    let p = ""; pts.forEach((q, k) => { if (!k) { p = `M${q[0]} ${q[1]}`; return; } const a = pts[k - 1], mx = (a[0] + q[0]) / 2; p += ` C${mx} ${a[1]} ${mx} ${q[1]} ${q[0]} ${q[1]}`; });
    g += `<path class="wr-area" d="${p} L${pts.at(-1)[0]} 175 L${pts[0][0]} 175 Z"/><path class="wr-line" d="${p}"/>`;
    pts.forEach(([cx, cy, i]) => g += `<circle class="wr-pt" data-n="${i}" cx="${cx}" cy="${cy}" r="9"/>`);
    D.forEach((d, i) => { if (d.level == null) g += `<text x="${x(i)}" y="${y(3) + 7}" class="wr-gap" text-anchor="middle">?</text>`; });
    const box = $(".wr-curve", el);
    box.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="七天的起伏曲线">${g}</svg>`;
    function pick(i) { const d = D[i]; $$(".wr-pt", box).forEach(c => c.classList.toggle("on", +c.dataset.n === i));
      $$(".wr-mdays span", el).forEach((s, k) => s.classList.toggle("on", k === i));
      const by = d.by || data.mood.source;
      $(".wr-read", el).innerHTML = `<div class="wr-who">周${DAYS[i]}${d.quote ? " · 原话" : ""}</div>${d.quote ? `<div class="wr-her">「${esc(d.quote)}」</div>` : `<div class="wr-note">这天没有留下话。</div>`}
        ${d.reading ? `<div class="wr-who">${by === "self" ? "本人" : esc(reader) + "读到的"}</div><div class="wr-mine">${esc(d.reading)}</div>` : ""}`;
      if (!reduce) $(".wr-read", el).animate([{ opacity: 0, transform: "translateY(6px)" }, { opacity: 1, transform: "none" }], { duration: 300, easing: "cubic-bezier(.2,.8,.2,1)" }); }
    D.forEach((d, i) => { const b = document.createElement("button"); b.className = "wr-hit"; b.setAttribute("aria-label", "周" + DAYS[i]);
      b.style.left = x(i) / W * 100 + "%"; b.style.top = (d.level == null ? y(3) : y(d.level)) / H * 100 + "%"; b.onclick = () => pick(i); box.appendChild(b); });
    const low = pts.reduce((a, q) => D[q[2]].level < D[a].level ? q[2] : a, pts[0]?.[2] ?? 0); pick(low);
    ctx.pickMood = pick;
    onEnter(el, () => drawSvg($("svg", box)));
  }

  /* 值得记住的话 */
  function quotes() {
    if (!data.quotes?.length) return "";
    return sec("quotes", `<div class="wr-qtrack">${data.quotes.map((q, k) => `<figure class="wr-qcard" style="--k:${k}"><svg class="wr-qdeco" viewBox="0 0 40 40" aria-hidden="true"><path d="M20 34 C 6 25 4 15 11 10 C 16 7 20 11 20 14 C 20 11 24 7 29 10 C 36 15 34 25 20 34Z"/></svg>
      <blockquote class="wr-q-t">${esc(q.text)}</blockquote><figcaption class="wr-q-m">${esc([q.when, q.after].filter(Boolean).join(" · "))}</figcaption>
      ${q.note ? `<p class="wr-q-note"><b>${esc(reader)}：</b>${esc(q.note)}</p>` : ""}</figure>`).join("")}</div>
      ${data.quotes.length > 1 ? `<div class="wr-qdots">${data.quotes.map((_, k) => `<i class="${k ? "" : "on"}"></i>`).join("")}</div>` : ""}`);
  }
  function wireQuotes() {
    const el = $("#wr-quotes"); if (!el) return; const tr = $(".wr-qtrack", el), dots = $$(".wr-qdots i", el), cards = $$(".wr-qcard", el);
    tr.addEventListener("scroll", () => { const k = Math.round(tr.scrollLeft / Math.max(1, cards[0].offsetWidth + 12)); dots.forEach((d, j) => d.classList.toggle("on", j === k)); }, { passive: true });
    dots.forEach((d, j) => d.addEventListener("click", () => tr.scrollTo({ left: j * (cards[0].offsetWidth + 12), behavior: reduce ? "auto" : "smooth" })));
    onEnter(el, () => { if (!reduce) cards.forEach((c, k) => c.animate([{ opacity: 0, transform: "translateX(60px) rotate(3deg)" }, { opacity: 1, transform: "none" }], { duration: 700, delay: k * 120, easing: "cubic-bezier(.2,.8,.2,1)", fill: "backwards" })); });
  }

  /* 复盘 */
  function review() {
    const r = data.review; if (!r) return "";
    const keys = ["good", "improve", "next"].filter(k => r[k]?.length);
    return sec("review", `<div class="wr-tabs" role="group">${keys.map((k, i) => `<button class="wr-tab" data-k="${k}" aria-pressed="${!i}">${esc(REVIEW[k])}</button>`).join("")}</div><ol class="wr-rlist" aria-live="polite"></ol>`);
  }
  function wireReview() {
    const el = $("#wr-review"); if (!el) return;
    const show = k => { $$(".wr-tab", el).forEach(b => b.setAttribute("aria-pressed", b.dataset.k === k));
      const ol = $(".wr-rlist", el); ol.dataset.k = k; ol.innerHTML = data.review[k].map(t => `<li>${esc(t)}</li>`).join("");
      if (!reduce) $$("li", ol).forEach((li, j) => li.animate([{ opacity: 0, transform: "translateX(14px)" }, { opacity: 1, transform: "none" }], { duration: 380, delay: j * 60, easing: "cubic-bezier(.2,.8,.2,1)", fill: "backwards" })); };
    $$(".wr-tab", el).forEach(b => b.onclick = () => show(b.dataset.k)); show($(".wr-tab", el).dataset.k);
  }

  /* 信 */
  function letter() {
    const l = data.letter; if (!l?.paragraphs?.length) return "";
    if (l.title) LABEL.letter.title = l.title;
    return sec("letter", `<div class="wr-letter">${l.paragraphs.map(p => typeof p === "string" ? `<p>${esc(p)}</p>` : `<p class="wr-lsec"><b class="wr-ltag">${esc(p.tag)}</b>${esc(p.text)}</p>`).join("")}<p class="wr-sign">${esc(l.sign || reader)}</p></div>`);
  }

  const m = data.meta;
  /* 主题可以用 story(ctx) 在封面后面插一段自己的叙事，用 modules 选后面跟哪些模块、按什么顺序 */
  const BUILD = { core, split, achievements, timeline, heat, goals, mood, quotes, review, letter };
  root.innerHTML = (m.fictional ? `<div class="wr-fict">示例数据 · 人物虚构</div>` : "") + `<i class="wr-progress" aria-hidden="true"></i>` +
    cover() + (T.story ? T.story(ctx) : "") + (T.modules || ["core", "split", "achievements", "timeline", "heat", "goals", "mood", "quotes", "review", "letter"]).map(k => BUILD[k]()).join("") +
    `<footer class="wr-foot">${m.fictional ? "<p>本页是示例：人物和数据都是虚构的。</p>" : ""}<p>${esc(m.source)}</p><p>标了「${esc(reader)}读到的」的地方是解读，不是记录。</p></footer>`;
  wireCore(); wireSplit(); wireAchievements(); wireTimeline(); wireHeat(); wireMood(); wireQuotes(); wireReview();
  /* 目标：进场时条和百分比一起从 0 长上去 */
  onEnter($("#wr-goals"), () => $$(".wr-g-pct").forEach((e, k) => { const p = +e.dataset.p; if (reduce) return;
    const t0 = performance.now() + k * 120; (function step(t) { const q = clamp((t - t0) / 1200); e.textContent = Math.round(p * 100 * ease(q)) + "%"; if (q < 1) requestAnimationFrame(step); })(t0); }));
  /* 信：一段一段亮起来（主题自己做了滚动版的就跳过） */
  if (!T.letterScrub) onEnter($("#wr-letter"), () => { if (!reduce) $$("#wr-letter .wr-letter p").forEach((p, k) => p.animate([{ opacity: 0, transform: "translateY(12px)" }, { opacity: 1, transform: "none" }], { duration: 600, delay: k * 160, easing: "cubic-bezier(.2,.8,.2,1)", fill: "backwards" })); });
  $$(".wr-g").forEach(b => b.onclick = () => b.setAttribute("aria-expanded", b.getAttribute("aria-expanded") !== "true"));

  /* 封面数字滚动 */
  $$(".wr-cu").forEach(b => { if (b.dataset.v !== "") countUp(b, +b.dataset.v, b.dataset.k, 1100); });
  /* 进场：每一节一次，内容默认可见 */
  $$(".wr-sec, [data-rv]").forEach(el => onEnter(el));
  /* 顶部阅读进度 */
  const prog = $(".wr-progress");
  const onScroll = () => { const max = document.documentElement.scrollHeight - innerHeight; prog.style.transform = `scaleX(${max > 0 ? clamp(scrollY / max) : 0})`; };
  addEventListener("scroll", () => requestAnimationFrame(onScroll), { passive: true }); onScroll();
  if (T.after) T.after(ctx);
  /* 重播封面（录视频时用）：数字重新滚，主题自己的开场再来一遍 */
  ctx.replayCover = () => { $$("header .wr-cu").forEach(b => { if (b.dataset.v !== "") countUp(b, +b.dataset.v, b.dataset.k, 1100); }); if (T.replay) T.replay(ctx); };
  window.WR = ctx;   // 给录视频和调试用
})();
