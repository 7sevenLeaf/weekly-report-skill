window.WR_THEME = {
  splitStyle: "custom",   // 168 小时用推子台
  labels: {
    core: { title: "试听", hint: "点一圈或一个键 · 再点一根柱子" },
    split: { title: "调音台", hint: "168 小时的混音 · 推一推推子" },
    achievements: { title: "本周主打", hint: "top tracks · 点图重放" },
    timeline: { title: "曲目", hint: "▶ 播一天 · 或按住拖" },
    goals: { title: "制作进度", hint: "周初定的目标" },
    mood: { title: "情绪旋律", hint: "点一个音符" },
    quotes: { title: "歌词本", hint: "左右滑，下一句" },
    review: { title: "乐评", hint: "liner notes" },
    letter: { title: "内页附言", hint: "" }
  },
  status: { done: "已发行", partial: "混音中", moved: "改期", missed: "未录" },
  review: { good: "A 面", improve: "B 面", next: "BONUS" },
  cover(c) {
    const m = c.data.meta, core = c.data.core.slice(0, 3);
    const R = [85, 68, 51], COL = ["var(--c-study)", "var(--c-sport)", "var(--c-sleep)"];
    const pct = x => x.goal ? Math.min(1, (x.value || 0) / x.goal) : 1;
    const arcs = core.map((x, i) => { const C = 2 * Math.PI * R[i], off = C * (1 - pct(x) * .985);
      return `<circle cx="100" cy="100" r="${R[i]}" fill="none" stroke="rgba(255,255,255,.1)" stroke-width="11"/><circle class="vn-arc" data-i="${i}" cx="100" cy="100" r="${R[i]}" stroke="${COL[i]}" stroke-dasharray="${C}" stroke-dashoffset="${c.reduce ? off : C}" data-o="${off}"/><circle class="vn-ring" data-i="${i}" cx="100" cy="100" r="${R[i]}"/>`; }).join("");
    const minutes = Math.round((c.data.core.find(x => x.kind === "hours")?.value || 0) * 60);
    return `<header class="vn-cover"><div class="vn-top"><span>${c.esc(m.title)} · 第 ${m.week} 周</span><span>${m.start.replaceAll("-", ".")}—${m.end.slice(5).replace("-", ".")}</span></div>
      <div class="vn-sw"><div class="vn-sleeve"><div class="vn-dots"></div><div class="vn-vol">VOL.${m.week}</div><h1>${c.esc(m.title).replace(/(..)(..)/, "$1<br>$2")}</h1>
        <div class="vn-cr"><span>${c.esc(m.name || "SIDE A / B")}</span><span>7 TRACKS · ${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}</span></div></div>
        <div class="vn-disc"><svg viewBox="0 0 200 200" role="img" aria-label="唱片上的三圈：${core.map(x => x.label + Math.round(pct(x) * 100) + "%").join("，")}">
          <circle cx="100" cy="100" r="98" fill="var(--disc)"/><g transform="rotate(-90 100 100)">${arcs}</g>
          <circle cx="100" cy="100" r="31" fill="var(--yellow)"/><text x="100" y="98" text-anchor="middle" font-family="Anton,Impact,sans-serif" font-size="26" fill="var(--ink)">${m.week}</text>
          <text x="100" y="112" text-anchor="middle" font-family="DM Mono,monospace" font-size="6" letter-spacing="1" fill="var(--ink)">33⅓ RPM</text><circle cx="100" cy="100" r="2.6" fill="var(--bg)"/></svg></div></div>
      <div class="vn-legend">${core.map((x, i) => `<button data-i="${i}" style="--c:${COL[i]}"><b class="wr-cu" data-v="${x.value ?? ""}" data-k="${x.kind}">${c.fmt(x.value, x.kind)}</b><span>${c.esc(x.label)}</span></button>`).join("")}</div></header>`;
  },
  replay(c) {
    if (c.reduce) return;
    c.$$(".vn-arc").forEach(a => { const C = a.getAttribute("stroke-dasharray"); a.animate([{ strokeDashoffset: C }, { strokeDashoffset: a.dataset.o }], { duration: 1600, easing: "cubic-bezier(.2,.8,.2,1)" }); });
    c.$(".vn-sleeve").animate([{ transform: "translateY(-40px) rotate(-9deg)", opacity: 0 }, { transform: "rotate(-2deg)", opacity: 1 }], { duration: 900, easing: "cubic-bezier(.2,.8,.2,1)" });
  },
  after(c) {
    /* 唱片三圈画出来；点圈或下面的键，跳到「试听」并切到那一项 */
    requestAnimationFrame(() => requestAnimationFrame(() => c.$$(".vn-arc").forEach(a => a.setAttribute("stroke-dashoffset", a.dataset.o))));
    const pick = i => { c.$$(".vn-arc").forEach(a => a.style.strokeWidth = +a.dataset.i === i ? 15 : 11);
      c.$$(".vn-legend button").forEach(b => b.classList.toggle("on", +b.dataset.i === i)); c.showCore && c.showCore(i); };
    c.$$(".vn-ring,.vn-legend button").forEach(b => b.addEventListener("click", () => { pick(+b.dataset.i);
      c.$("#wr-core").scrollIntoView({ behavior: c.reduce ? "auto" : "smooth", block: "start" }); }));
    c.$$("#wr-core .wr-tab").forEach(t => t.addEventListener("click", () => pick(+t.dataset.i)));

    /* 均衡器：柱子进场时先跳几下再落到真实高度 */
    c.onEnter(c.$("#wr-core"), () => { if (c.reduce) return;
      c.$$("#wr-core .wr-bar i").forEach((b, k) => b.animate([{ transform: "scaleY(.1)" }, { transform: "scaleY(1.25)" }, { transform: "scaleY(.7)" }, { transform: "scaleY(1.08)" }, { transform: "none" }],
        { duration: 1100, delay: 250 + k * 70, easing: "ease-out" })); });

    /* 调音台：每一类时间一根推子 */
    const split = c.$("#wr-split");
    if (split) {
      const rows = c.$$(".wr-li", split).map(li => ({ k: li.dataset.k, n: li.children[1].textContent, h: li.children[2].textContent, p: parseInt(li.children[3].textContent) }));
      const mx = Math.max(...rows.map(r => r.p));
      split.querySelector(".wr-h").insertAdjacentHTML("afterend", `<div class="vn-mixer">${rows.map(r => `<button class="vn-ch" data-k="${r.k}" style="--c:var(--c-${r.k === "none" ? "rule" : r.k},var(--rule))" aria-label="${r.n} ${r.h}">
        <span class="vn-slot"><i class="vn-fill" style="height:${r.p / mx * 100}%"></i><i class="vn-knob" style="bottom:${r.p / mx * 100}%"></i></span><b>${r.h}</b><span>${r.n}</span></button>`).join("")}</div>`);
      c.$$(".vn-ch", split).forEach(ch => ch.addEventListener("click", () => { c.$(`.wr-li[data-k="${ch.dataset.k}"]`, split).click();
        c.$$(".vn-ch", split).forEach(x => x.classList.toggle("off", x !== ch)); }));
      c.$$(".vn-ch", split)[0].classList.add("x"); c.$$(".vn-ch", split).forEach((x, i) => x.classList.toggle("off", i !== 0));
      c.onEnter(split, () => { if (c.reduce) return; c.$$(".vn-ch", split).forEach((ch, i) => {
        const b = ch.querySelector(".vn-knob").style.bottom;
        ch.querySelector(".vn-knob").animate([{ bottom: "0%" }, { bottom: b }], { duration: 900, delay: 200 + i * 110, easing: "cubic-bezier(.2,.8,.2,1)", fill: "backwards" });
        ch.querySelector(".vn-fill").animate([{ transform: "scaleY(0)" }, { transform: "none" }], { duration: 900, delay: 200 + i * 110, easing: "cubic-bezier(.2,.8,.2,1)", fill: "backwards" }); }); });
      c.$$(".vn-fill", split).forEach(f => f.style.transformOrigin = "50% 100%");
    }

    /* 唱针：▶ 把选中的那一天从 0 点播到 24 点 */
    const tl = c.$("#wr-timeline");
    if (tl && c.setTime) {
      const now = c.$(".wr-now", tl);
      now.insertAdjacentHTML("afterbegin", `<button class="vn-play" aria-label="播放这一天"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4l13 8-13 8z"/></svg></button>`);
      let raf = 0;
      c.$(".vn-play", tl).addEventListener("click", () => { cancelAnimationFrame(raf);
        const day = c.$$(".wr-row", tl).findIndex(r => r.classList.contains("on")), t0 = performance.now(), dur = c.reduce ? 1 : 6000;
        (function step(t) { const p = c.clamp((t - t0) / dur); c.setTime(day, p * 1430); if (p < 1) raf = requestAnimationFrame(step); })(t0); });
    }

    /* 下滑时唱片转 */
    if (c.reduce) return;
    const disc = c.$(".vn-disc"), sw = c.$(".vn-sw"); let spin = 0, last = scrollY;
    (function frame() { spin += .25 + Math.abs(scrollY - last) * .4; last = scrollY; const k = c.clamp(scrollY / 300);
      disc.style.transform = `translateY(${k * sw.offsetWidth * .2}px) rotate(${spin}deg)`; requestAnimationFrame(frame); })();
  }
};
