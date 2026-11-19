window.WR_THEME = {
  labels: {
    core: { title: "一、填空题", hint: "点一个选项，再点一根柱子" },
    split: { title: "二、统计题", hint: "这周的 168 小时 · 点一类" },
    achievements: { title: "三、解答题", hint: "本周做成的事 · 点图重画" },
    timeline: { title: "四、作图题", hint: "按住左右拖，看任何一刻" },
    goals: { title: "五、判断题", hint: "周初定的目标 · 点开看批注" },
    mood: { title: "六、阅读理解", hint: "这一周是怎么过来的 · 点一天" },
    quotes: { title: "草稿纸", hint: "值得记住的话 · 左右滑" },
    review: { title: "错题本", hint: "" },
    letter: { title: "阅卷人的话", hint: "" }
  },
  status: { done: "✓", partial: "半对", moved: "换了做法", missed: "留空" },
  review: { good: "做对的", improve: "订正", next: "附加题" },
  cover(c) {
    const m = c.data.meta, core = c.data.core.slice(0, 3);
    const mark = x => x.goal == null || x.value == null ? "" : x.value >= x.goal ? "达标" : `差 ${c.fmt(x.goal - x.value, x.kind)}`;
    return `<header class="ex-head">
      <div class="ex-term">${m.start.slice(0, 4)} 年 · 第 ${m.week} 周 · 周测卷</div>
      <h1>${c.esc(m.title)}</h1>
      <div class="ex-meta"><span>姓名 <b>${c.esc(m.name || "—")}</b></span><span>考试时间 <b>${m.start.slice(5).replace("-", ".")} — ${m.end.slice(5).replace("-", ".")}</b></span><span>满分 <b>168 小时</b></span></div>
      <div class="ex-stamp" aria-label="已阅"><div><b>已阅</b><small>${c.esc(m.reader || "助手")}</small></div></div>
      <div class="ex-score">${core.map(x => `<div><span>${c.esc(x.label)}</span><b class="wr-cu" data-v="${x.value ?? ""}" data-k="${x.kind}">${c.fmt(x.value, x.kind)}</b><small>${mark(x)}</small></div>`).join("")}</div>
    </header>`;
  },
  replay(c) {
    if (c.reduce) return;
    c.$(".ex-stamp").animate([{ transform: "rotate(-6deg) scale(1.8)", opacity: 0 }, { transform: "rotate(12deg)", opacity: 1 }], { duration: 450, delay: 900, easing: "cubic-bezier(.2,.8,.2,1)", fill: "backwards" });
  },
  after(c) {
    c.root.insertAdjacentHTML("afterbegin", `<i class="ex-margin" aria-hidden="true"></i>`);
    document.body.insertAdjacentHTML("afterbegin", `<i class="ex-red" aria-hidden="true"></i>`);
    c.$$(".wr-a").forEach(a => a.insertAdjacentHTML("beforeend", `<svg class="ex-tick" viewBox="0 0 48 42" aria-hidden="true"><path d="M4 23 L17 36 L44 4"/></svg>`));
    const red = c.$(".ex-red");
    const on = () => { const max = document.documentElement.scrollHeight - innerHeight; red.style.transform = `scaleY(${max > 0 ? c.clamp(scrollY / max) : 0})`; };
    addEventListener("scroll", () => requestAnimationFrame(on), { passive: true }); on();
  }
};
