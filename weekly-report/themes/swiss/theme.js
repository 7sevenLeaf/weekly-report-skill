window.WR_THEME = {
  extras: ["heat"],
  labels: {
    core: { title: "这周的数", hint: "切换一项，点一根柱子看那天" },
    split: { title: "168 小时去了哪里", hint: "点一类，看它在七天里的分布" },
    achievements: { title: "做成的事", hint: "点图重画" },
    timeline: { title: "逐日", hint: "按住左右拖，看任何一刻" },
    heat: { title: "专注时段", hint: "7 天 × 24 小时，点一格" },
    goals: { title: "对账", hint: "先看做成的，再看差在哪" },
    mood: { title: "起伏", hint: "点一天" },
    quotes: { title: "原话", hint: "左右滑，下一句" },
    review: { title: "复盘", hint: "" },
    letter: { title: "编后记", hint: "" }
  },
  status: { done: "达成", partial: "部分", moved: "调整", missed: "未完成" },
  cover(c) {
    const m = c.data.meta, core = c.data.core.slice(0, 3);
    const sub = x => x.goal == null ? "" : `目标 ${c.fmt(x.goal, x.kind)}`;
    return `<header class="sw-cover">
      <div class="sw-top"><span><b>${c.esc(m.title)}</b>${m.name ? " · " + c.esc(m.name) : ""}</span><span>${m.start.replaceAll("-", ".")} — ${m.end.slice(5).replace("-", ".")}</span></div>
      <div><div class="sw-num" aria-label="第 ${m.week} 周">${String(m.week).padStart(2, "0")}<span>.</span></div>
        <div class="sw-title"><h1>第 ${m.week} 周</h1><p>${c.data.achievements.length} 件做成的事<br>${(c.data.timeline || []).filter(e => e.cat !== "sleep").length} 条记录</p></div></div>
      <div class="sw-stats">${core.map(x => `<div><b class="wr-cu" data-v="${x.value ?? ""}" data-k="${x.kind}">${c.fmt(x.value, x.kind)}</b><span>${c.esc(x.label)}</span><em>${sub(x)}</em></div>`).join("")}</div>
    </header>`;
  },
  after(c) {
    c.$$(".wr-sec .wr-h").forEach((h, i) => h.dataset.n = String(i + 1).padStart(2, "0"));
    this.replay(c);
  },
  replay(c) {
    if (c.reduce) return;
    c.$(".sw-num").animate([{ opacity: 0, transform: "translateY(30px)" }, { opacity: 1, transform: "none" }], { duration: 700, easing: "cubic-bezier(.2,.8,.2,1)" });
  }
};
