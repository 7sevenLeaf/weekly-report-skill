window.WR_THEME = {
  extras: ["heat"],
  labels: {
    core: { title: "这周的数", hint: "点一项 · 再点一天" },
    split: { title: "时间都去哪了", hint: "168h · 点一类" },
    achievements: { title: "合并进主线的", hint: "点图重新跑一遍" },
    timeline: { title: "一周日志", hint: "按住拖动" },
    heat: { title: "专注热力", hint: "7 × 24 · 点一格" },
    goals: { title: "目标检查", hint: "点开看日志" },
    mood: { title: "状态", hint: "点一天" },
    quotes: { title: "注释", hint: "左右滑" },
    review: { title: "改动", hint: "" },
    letter: { title: "写给下周", hint: "" }
  },
  cmds: { core: "$ weekly stats", split: "$ du -h ~/this-week", achievements: "$ git log --merged", timeline: "$ tail -f week.log",
    heat: "$ weekly heatmap", goals: "$ weekly check", mood: "$ uptime", quotes: "$ grep -r 想法", review: "$ git diff", letter: "$ cat README.md" },
  status: { done: "✓ 通过", partial: "◐ 部分", moved: "↷ 改期", missed: "✗ 未通过" },
  review: { good: "+ 做对的", improve: "− 要改的", next: "TODO" },
  cover(c) {
    const m = c.data.meta, core = c.data.core.slice(0, 3);
    const p = x => x.goal ? c.clamp((x.value || 0) / x.goal) : 1;
    const rows = core.map(x => `<span>${c.esc(x.label)}</span><span class="tm-meter"><i style="--p:${p(x)}"></i></span><b class="wr-cu" data-v="${x.value ?? ""}" data-k="${x.kind}">${c.fmt(x.value, x.kind)}</b>`).join("");
    const done = (c.data.goals || []).filter(g => g.status === "done").length, all = (c.data.goals || []).length;
    return `<header class="tm-cover"><div class="tm-kick"><span>week ${m.week}${m.name ? " · " + c.esc(m.name) : ""}</span><span>${m.start} → ${m.end.slice(5)}</span></div>
      <h1 class="tm-title">${c.esc(m.title.slice(0, 2))}<em>${c.esc(m.title.slice(2))}</em></h1>
      <div class="tm-win"><div class="tm-bar"><i></i><i></i><i></i><span>~/week-${m.week}</span></div>
        <div class="tm-body"><div class="tm-cmd"><span class="tm-typed" data-t="weekly-report --week ${m.week}"></span><i class="tm-caret"></i></div>
          <div class="tm-out">${rows}</div>
          ${all ? `<div class="tm-ok">${c.data.achievements.length} 件做成的事 · 目标通过 <b>${done}/${all}</b></div>` : ""}</div></div></header>`;
  },
  after(c) {
    const cmds = this.cmds;
    c.$$(".wr-sec").forEach(s => { const k = s.id.replace("wr-", ""), h = c.$("h2", s); if (h && cmds[k]) h.dataset.cmd = cmds[k]; });
    /* 成就的序号换成提交号 */
    const hash = s => { let h = 2166136261; for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return (h >>> 0).toString(16).padStart(8, "0").slice(0, 7); };
    c.$$(".wr-a").forEach((a, i) => { c.$(".wr-rank", a).textContent = hash(c.data.achievements[i].what); });
    /* 敲命令，然后输出一行行出来 */
    this.replay(c);
  },
  replay(c) {
    const typed = c.$(".tm-typed"), text = typed.dataset.t, out = c.$$(".tm-out > *, .tm-ok");
    if (c.reduce) { typed.textContent = text; return; }
    typed.textContent = "";
    out.forEach(o => o.style.opacity = 0);
    let i = 0; const tick = () => { typed.textContent = text.slice(0, ++i); if (i < text.length) setTimeout(tick, 38); else setTimeout(show, 260); };
    const show = () => { out.forEach((o, k) => o.animate([{ opacity: 0, transform: "translateY(4px)" }, { opacity: 1, transform: "none" }], { duration: 320, delay: k * 50, fill: "forwards", easing: "cubic-bezier(.2,.8,.2,1)" }));
      c.$$(".tm-meter i").forEach((m, k) => m.animate([{ transform: "scaleX(0)" }, { transform: "none" }], { duration: 900, delay: 200 + k * 120, easing: "cubic-bezier(.2,.8,.2,1)", fill: "backwards" }));
      c.$$(".tm-out .wr-cu").forEach(b => c.countUp(b, +b.dataset.v, b.dataset.k, 900)); };
    setTimeout(tick, 400);
  }
};
