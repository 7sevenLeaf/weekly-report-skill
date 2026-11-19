/* 每一天的「主角」系统（第五版）。试用者给的例子（化学摇试管、跑步、心情失落下雨）只是启发，这里把它推成一套通用规则：
   1. 读当天的事：每件事归到一个意象类型（实验、考试、读书、代码、跑步、游泳、力量、球、音乐、见面、放松、休息）；
   2. 读当天的心情：不只看分数，也看原话里的词（慌→焦虑、累/阈值→疲惫、难受→低落、！！→兴奋）；
   3. 选主角：强烈的情绪 > 当天的成就 > 高光事件 > 花时间最多的事；同一个主角在一周里重复会被降权，七天尽量不一样；
   4. 主角决定这一天的一切：色调、天空里的主题元素、进场的大块转场、心情特效、数据面板用哪种形式。
   都只用真实数据；没有对应意象的事退回到最接近的类型。 */
window.WR_LEAD = (function () {
  const cl01 = v => Math.max(0, Math.min(1, v));
  const rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const W = "rgba(255,255,255,.92)", LINE = "rgba(22,24,29,.18)";

  /* 意象类型：主色、浅色、进场转场的形状 */
  const TYPES = {
    lab: { name: "实验", da: "#12A08A", dt: "#CFF1E8", mask: "wave" },
    exam: { name: "考试", da: "#3D6BF2", dt: "#DAE5FD", mask: "diag" },
    book: { name: "读书", da: "#D29200", dt: "#FFEFC2", mask: "page" },
    code: { name: "写代码", da: "#4F5BD5", dt: "#E0E3FB", mask: "bars" },
    run: { name: "跑步", da: "#FF6B4A", dt: "#FFE0D6", mask: "lanes" },
    swim: { name: "游泳", da: "#1E9BD7", dt: "#D3EDFA", mask: "wave" },
    gym: { name: "力量", da: "#E5484D", dt: "#FFDFDE", mask: "lanes" },
    ball: { name: "球", da: "#F08C2E", dt: "#FFE8D1", mask: "circle" },
    music: { name: "音乐", da: "#8B5CF6", dt: "#EAE2FF", mask: "bars" },
    social: { name: "见面", da: "#E5609A", dt: "#FCE0EC", mask: "circle" },
    heart: { name: "放松", da: "#E5609A", dt: "#FCE0EC", mask: "circle" },
    sleep: { name: "休息", da: "#7C6CD8", dt: "#E5E0FA", mask: "page" },
    rain: { name: "低落", da: "#5B6F9E", dt: "#D9E0EE", mask: "drip" }
  };
  const typeOfText = (t, i = "", cat = "") => {
    if (i === "code" || /代码|编程|python|黑客松|code|测试|bug|函数/i.test(t)) return "code";   // 先认代码：「写测试」「生物信息黑客松」不是考试、不是实验
    if (/考|小测|测验|期中|期末|exam|订正|试卷/i.test(t)) return "exam";
    if (i === "lab" || /实验|化学|有机|细胞|生化|生物|lab/i.test(t)) return "lab";
    if (i === "run" || /跑/.test(t)) return "run";
    if (i === "swim" || /游泳/.test(t)) return "swim";
    if (i === "gym" || /力量|健身|卧推|练腿|练背|练胸/.test(t)) return "gym";
    if (i === "ball" || /球/.test(t)) return "ball";
    if (i === "music" || i === "sing" || /排练|乐队|唱|琴|吉他|演出|音乐|专场|首演|原创|节拍|bpm|贝斯/i.test(t)) return "music";
    if (i === "meet" || /队友|朋友|聚|开会|开幕|路演|颁奖/.test(t)) return "social";
    if (i === "heart" || /电影|视频|家|奶奶|室友/.test(t)) return "heart";
    if (i === "book" || /读|英语|单词|文献|笔记|总结|章/.test(t)) return "book";
    if (i === "pen") return "exam";
    if (!cat) return null;   // 只有文字、认不出来（比如成就的标题）：不猜
    return cat === "sport" ? "run" : cat === "study" ? "book" : cat === "sleep" ? "sleep" : "heart";
  };
  const typeOf = e => typeOfText(e.text || "", e.icon || "", e.cat);

  /* 心情：分数 + 原话里的词 */
  function feelOf(md) {
    if (!md) return "calm";
    const q = (md.quote || "") + " " + (md.reading || ""), lv = md.level;
    if (lv != null && lv <= 2) return /慌|紧张|担心|怕|急/.test(md.quote || "") ? "anxious" : /累|困|阈值|吃不下|好紧/.test(md.quote || "") ? "tired" : "sad";
    if (lv >= 5 || /！！|!!/.test(md.quote || "")) return "excited";
    if (lv === 4) return "happy";
    if (/累|困|阈值/.test(q)) return "tired";
    return "calm";
  }
  const FEEL = { anxious: "焦虑", tired: "疲惫", sad: "低落", excited: "兴奋", happy: "开心", calm: "平静" };

  /* 一周一起分析：每天的主角、心情、数据面板 */
  function analyzeWeek(c, D, dayOf) {
    const A = c.data.achievements || [], used = {}, panelsUsed = new Set();
    return D.map(x => {
      const w = {}, add = (k, v) => w[k] = (w[k] || 0) + v;
      x.acts.forEach(e => add(typeOf(e), (c.mins(e.end) - c.mins(e.start)) * (e.cat === "star" ? 8 : e.cat === "sport" ? 2 : 1)));
      A.filter(a => dayOf(a.when) === x.i).forEach(a => { const k = typeOfText(`${a.what} ${a.big}`); if (k) add(k, 2000); });
      const feel = feelOf(x.mood);
      if (x.mood?.level != null && x.mood.level <= 2) add("rain", 3000);   // 只有分数真的低才下雨；3 分的「累」只让天色变暗
      Object.keys(w).forEach(k => { if (k !== "rain") w[k] *= Math.pow(.45, used[k] || 0); });
      const sig = Object.keys(w).sort((a, b) => w[b] - w[a])[0] || "heart";
      used[sig] = (used[sig] || 0) + 1;
      const types = [...new Set(x.acts.map(typeOf))];
      const subjects = [...new Set(x.acts.filter(e => e.cat === "study").map(e => String(e.text).split(/[ ·]/)[0]))];
      const hasExam = x.acts.some(e => e.cat === "star" && typeOf(e) === "exam") || A.some(a => dayOf(a.when) === x.i && typeOfText(a.what) === "exam");
      const pref = [hasExam && "gauge", (feel === "anxious" || feel === "sad") && "dots", x.acts.some(e => e.cat === "sport") && "compare", subjects.length >= 2 && "subjects",
        "clock", "ribbon", "ring", "dots", "subjects", "compare", "gauge"].filter(Boolean);
      const panel = pref.find(p => !panelsUsed.has(p)) || "ring"; panelsUsed.add(panel);
      return { ...TYPES[sig], sig, feel, feelName: FEEL[feel], types, subjects, panel };
    });
  }

  /* ---------- 天空里的活动小场景（地面 y=0，往上画） ---------- */
  const V = {
    lab: da => `<rect x="-78" y="-12" width="86" height="7" rx="3.5" fill="${W}"/>`
      + ["#7FD8C6", "#F5B9A6", "#EFD46A"].map((col, k) => `<g class="vt" data-x="${-62 + k * 22}" transform="translate(${-62 + k * 22} -6)"><rect x="-7.5" y="-60" width="15" height="58" rx="7.5" fill="${W}" stroke="${LINE}"/><rect class="vl" x="-5.5" y="-30" width="11" height="27" rx="5.5" fill="${col}"/></g>`).join("")
      + `<g class="vf" transform="translate(44 0)"><path d="M-10 -86 h20 v28 l27 44 a9 9 0 0 1 -8 14 h-58 a9 9 0 0 1 -8 -14 l27 -44z" fill="${W}" stroke="${LINE}"/><path class="vfl" d="M-29 -16 l11 -19 h36 l11 19 a7 7 0 0 1 -6 11 h-46 a7 7 0 0 1 -6 -11z" fill="${da}" opacity=".85"/></g>`
      + [...Array(7)].map((_, k) => `<circle class="vb" cx="${36 + (k % 3) * 8}" cy="-30" r="${2.5 + (k % 3)}" fill="#fff" stroke="${da}" stroke-width="1.2"/>`).join(""),
    exam: da => `<g transform="rotate(-6)"><rect x="-58" y="-104" width="96" height="100" rx="8" fill="${W}" stroke="${LINE}"/>`
      + [0, 1, 2, 3].map(k => `<path class="vw" d="M-46 ${-84 + k * 18} q7 -7 14 0 t14 0 t14 0 t14 0 t14 0" fill="none" stroke="${da}" stroke-width="2.4" stroke-linecap="round"/>`).join("")
      + `<path class="vchk" d="M8 -40 l12 12 l26 -32" fill="none" stroke="#E5484D" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></g>`
      + `<g class="vpen"><rect x="-4" y="-46" width="8" height="40" rx="2" fill="${da}"/><path d="M-4 -6 l4 9 l4 -9z" fill="#3A3A3A"/><rect x="-4" y="-50" width="8" height="6" rx="2" fill="#F5B9A6"/></g>`,
    book: da => `<g transform="translate(-10 -10)"><path d="M0 -6 C -22 -14 -44 -14 -64 -6 V -76 C -44 -84 -22 -84 0 -76z" fill="${W}" stroke="${LINE}"/><path d="M0 -6 C 22 -14 44 -14 64 -6 V -76 C 44 -84 22 -84 0 -76z" fill="${W}" stroke="${LINE}"/>`
      + [0, 1, 2].map(k => `<path d="M-54 ${-62 + k * 14} h40 M14 ${-62 + k * 14} h40" stroke="${da}" stroke-opacity=".5" stroke-width="2.5" stroke-linecap="round"/>`).join("")
      + `<path class="vpg" d="M0 -6 C 22 -14 44 -14 64 -6 V -76 C 44 -84 22 -84 0 -76z" fill="${da}" fill-opacity=".22" stroke="${da}"/></g>`,
    code: da => `<rect x="-60" y="-92" width="120" height="76" rx="8" fill="#232634"/><rect x="-72" y="-16" width="144" height="10" rx="5" fill="${W}" stroke="${LINE}"/>`
      + [...Array(5)].map((_, k) => `<rect class="vcl" x="${-50 + (k % 2) * 10}" y="${-82 + k * 12}" width="${44 + (k * 23) % 50}" height="6" rx="3" fill="${["#7FD8C6", "#C9BCEF", da, "#EFD46A", "#F5B9A6"][k]}"/>`).join("")
      + `<rect class="vcur" x="10" y="-34" width="7" height="10" fill="#fff"/>`,
    run: da => { const L = (x1, y1, x2, y2, w) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${da}" stroke-width="${w}" stroke-linecap="round"/>`;
      const limb = (cls, x, y, len1, len2, w) => `<g class="${cls}">${L(x, y, x, y + len1, w)}<g class="${cls}b">${L(x, y + len1, x, y + len1 + len2, w - .5)}</g></g>`;
      return `<path d="M-90 2 H 110" stroke="${da}" stroke-opacity=".3" stroke-width="5" stroke-dasharray="14 10" class="vtrack"/>`
        + `<g class="vrun"><g class="vbob">${limb("rl2", 0, -36, 17, 17, 6.5)}${limb("ra2", 4, -60, 11, 11, 5)}`
        + `<g transform="rotate(14 0 -36)">${L(0, -36, 0, -62, 7.5)}<circle cx="0" cy="-73" r="8" fill="${da}"/></g>`
        + `${limb("rl1", 0, -36, 17, 17, 6.5)}${limb("ra1", 4, -60, 11, 11, 5)}</g>`
        + [0, 1, 2].map(k => `<line class="vsp" x1="${-24 - k * 6}" y1="${-60 + k * 12}" x2="${-44 - k * 6}" y2="${-60 + k * 12}" stroke="${da}" stroke-opacity=".4" stroke-width="3" stroke-linecap="round"/>`).join("") + `</g>`; },
    swim: da => { const L = (x1, y1, x2, y2, w, cls = "") => `<line class="${cls}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${da}" stroke-width="${w}" stroke-linecap="round"/>`;
      const arm = k => `<g class="vsa${k}">${L(18, -31, 35, -31, 5.5)}<g class="vsa${k}b">${L(35, -31, 50, -31, 5)}<circle cx="51" cy="-31" r="3.6" fill="${da}"/></g></g>`;
      const wave = (y, a) => `M-170 ${y}` + [...Array(19)].map((_, j) => ` q10 ${j % 2 ? a : -a} 20 0`).join("");
      /* 水分两层：身后一层蓝，身前一层半透明白，水下的手脚就会变淡，看得出是在水里 */
      return `<path class="vwave" d="${wave(-44, 3)}" fill="none" stroke="${da}" stroke-opacity=".35" stroke-width="3" stroke-linecap="round"/>`
        + `<path class="vwater" d="${wave(-27, 3)}  V 12 H -170 Z" fill="${da}" fill-opacity=".32"/>`
        + `<g class="vbody">${arm(2)}<g class="vk1">${L(-28, -29, -62, -29, 6.5)}</g><g class="vk2">${L(-28, -29, -62, -29, 6.5)}</g>`
        + `${L(-30, -29, 20, -31, 10)}<circle cx="31" cy="-33" r="8.5" fill="${da}"/><rect x="31" y="-37" width="7" height="3.5" rx="1.7" fill="#fff"/>${arm(1)}</g>`
        + `<path class="vwater" d="${wave(-27, 3)}  V 12 H -170 Z" fill="#fff" fill-opacity=".55"/>`
        + `<path class="vwater" d="${wave(-27, 3)}" fill="none" stroke="${da}" stroke-opacity=".7" stroke-width="2.5"/>`
        + [0, 1, 2].map(k => `<circle class="vspl" cx="${54 + k * 6}" cy="-30" r="${2 + k}" fill="none" stroke="${da}" stroke-width="1.6"/>`).join("")
        + [0, 1].map(k => `<circle class="vkb" cx="${-64 - k * 8}" cy="-30" r="${2.5 + k}" fill="#fff" stroke="${da}" stroke-width="1.2"/>`).join(""); },
    gym: da => `<g class="vbar"><rect x="-70" y="-62" width="140" height="7" rx="3.5" fill="#6B7080"/>`
      + [[-66, 30], [-54, 24], [54, 24], [66, 30]].map(([x, h]) => `<rect x="${x - 5}" y="${-58.5 - h / 2}" width="10" height="${h}" rx="3" fill="${da}"/>`).join("") + `</g>`
      + `<circle cx="0" cy="-30" r="9" fill="${da}" opacity=".85"/><path d="M-12 -2 l12 -18 l12 18" stroke="${da}" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity=".85"/>`,
    ball: da => `<ellipse class="vsh" cx="0" cy="-2" rx="22" ry="5" fill="rgba(22,24,29,.12)"/><g class="vball"><circle r="18" cy="-60" fill="#fff" stroke="${da}" stroke-width="3"/><path d="M0 -70 l9 7 -3 10 h-12 l-3 -10z" fill="${da}"/></g>`,
    music: da => `<rect x="-70" y="-74" width="40" height="70" rx="10" fill="${W}" stroke="${LINE}"/><circle class="vspk" cx="-50" cy="-30" r="13" fill="${da}" opacity=".85"/><circle cx="-50" cy="-60" r="6" fill="${da}" opacity=".5"/>`
      + [0, 1, 2, 3].map(k => `<g class="vn" data-k="${k}"><path d="M${-6 + k * 26} -40 v-34 l16 -5 v32" fill="none" stroke="${da}" stroke-width="3.5"/><ellipse cx="${-11 + k * 26}" cy="-40" rx="7" ry="5" fill="${da}"/><ellipse cx="${5 + k * 26}" cy="-45" rx="7" ry="5" fill="${da}"/></g>`).join(""),
    social: da => `<g class="vbub1"><rect x="-70" y="-90" width="74" height="42" rx="18" fill="${W}" stroke="${LINE}"/><circle cx="-48" cy="-69" r="4" fill="${da}"/><circle cx="-33" cy="-69" r="4" fill="${da}"/><circle cx="-18" cy="-69" r="4" fill="${da}"/></g>`
      + `<g class="vbub2"><rect x="-6" y="-52" width="74" height="42" rx="18" fill="${da}" opacity=".85"/><circle cx="16" cy="-31" r="4" fill="#fff"/><circle cx="31" cy="-31" r="4" fill="#fff"/><circle cx="46" cy="-31" r="4" fill="#fff"/></g>`,
    heart: da => [...Array(6)].map((_, k) => `<path class="vh" d="M0 -6 C -14 -16 -14 -30 -4 -30 C 0 -30 0 -26 0 -24 C 0 -26 0 -30 4 -30 C 14 -30 14 -16 0 -6Z" transform="translate(${-60 + k * 24} 0) scale(${1 + (k % 3) * .3})" fill="${k % 2 ? da : "#F5B9A6"}"/>`).join(""),
    sleep: da => ["Z", "Z", "z"].map((z, k) => `<text class="vz" x="${-20 + k * 22}" y="${-30 - k * 22}" font-size="${30 - k * 6}" font-weight="900" fill="${da}">${z}</text>`).join(""),
    rain: da => `<g class="vumb"><path d="M-46 -60 a46 34 0 0 1 92 0 q-11.5 -8 -23 0 q-11.5 -8 -23 0 q-11.5 -8 -23 0 q-11.5 -8 -23 0z" fill="${da}"/><path d="M0 -60 v52 q0 9 -9 9 q-7 0 -8 -7" fill="none" stroke="#4A4E5A" stroke-width="4" stroke-linecap="round"/></g>`
      + [0, 1, 2].map(k => `<ellipse class="vpud" cx="${-50 + k * 50}" cy="0" rx="18" ry="4" fill="none" stroke="${da}" stroke-width="2"/>`).join("")
  };

  /* 活动小场景的循环动画（GSAP，暂停着建，主角那天的场景固定住时才播） */
  function animate(g, type, gsap) {
    const q = s => [...g.querySelectorAll(s)], tl = gsap.timeline({ repeat: -1, paused: true });
    if (type === "lab") {
      q(".vt").forEach((t, k) => tl.to(t, { rotation: k % 2 ? 14 : -14, svgOrigin: `${t.dataset.x} -6`, duration: .18, repeat: 5, yoyo: true, ease: "sine.inOut" }, k * .12));
      tl.to(q(".vl"), { attr: { y: -36, height: 33 }, duration: .3, repeat: 3, yoyo: true, ease: "sine.inOut", stagger: .08 }, 0);
      q(".vb").forEach((b, k) => tl.fromTo(b, { attr: { cy: -30 }, opacity: 1 }, { attr: { cy: -118 - (k % 3) * 12 }, x: (k % 2 ? 8 : -8), opacity: 0, duration: 1.4, ease: "power1.out" }, k * .2));
      tl.to(q(".vf"), { rotation: 6, svgOrigin: "44 0", duration: .5, yoyo: true, repeat: 1, ease: "sine.inOut" }, .3).to({}, { duration: .2 });
    } else if (type === "exam") {
      const ws = q(".vw"), pen = q(".vpen")[0], chk = q(".vchk")[0];
      gsap.set(ws, { strokeDasharray: 90, strokeDashoffset: 90 }); gsap.set(chk, { strokeDasharray: 80, strokeDashoffset: 80 });
      ws.forEach((w, k) => tl.fromTo(pen, { x: -44, y: -78 + k * 18 }, { x: 26, y: -78 + k * 18, duration: .55, ease: "none" }, k * .6).to(w, { strokeDashoffset: 0, duration: .55, ease: "none" }, k * .6));
      tl.to(pen, { x: 40, y: -36, duration: .3 }).to(chk, { strokeDashoffset: 0, duration: .35, ease: "power2.out" }).to({}, { duration: .8 })
        .to([...ws, chk], { opacity: 0, duration: .3 }).set(ws, { strokeDashoffset: 90, opacity: 1 }).set(chk, { strokeDashoffset: 80, opacity: 1 });
    } else if (type === "book") {
      tl.fromTo(q(".vpg"), { scaleX: 1, svgOrigin: "-10 -10" }, { scaleX: -1, svgOrigin: "-10 -10", duration: .9, ease: "power2.inOut" }).to({}, { duration: .5 });
    } else if (type === "code") {
      tl.from(q(".vcl"), { scaleX: 0, transformOrigin: "0% 50%", duration: .35, stagger: .25, ease: "power1.out" }).to(q(".vcur"), { opacity: 0, duration: .25, repeat: 3, yoyo: true }).to(q(".vcl"), { opacity: 0, duration: .3 }).set(q(".vcl"), { opacity: 1 });
    } else if (type === "run") {
      /* 跑步周期：对侧手脚同相；腿往后摆时膝盖弯得最多；手臂肘部弯着前后摆 */
      const run = q(".vrun")[0], ph = { v: 0 }, R = (sel, a, cx, cy) => q(sel).forEach(n => n.setAttribute("transform", `rotate(${a.toFixed(1)} ${cx} ${cy})`));
      const pose = () => { const t = ph.v * Math.PI * 2;
        [[1, 0], [2, Math.PI]].forEach(([k, o]) => { const s1 = Math.sin(t + o), c1 = Math.cos(t + o);
          R(`.rl${k}`, -34 * s1, 0, -36); R(`.rl${k}b`, 14 + 62 * Math.max(0, c1) * (s1 < .3 ? 1 : .5), 0, -19);
          R(`.ra${k}`, 30 * s1 + 4, 4, -60); R(`.ra${k}b`, -78, 4, -49); });
        q(".vbob").forEach(n => n.setAttribute("transform", `translate(0 ${(-3 * Math.abs(Math.cos(t))).toFixed(1)})`)); };
      pose();
      tl.fromTo(run, { x: -70 }, { x: 110, duration: 2.4, ease: "none" }, 0)
        .to(ph, { v: 4, duration: 2.4, ease: "none", onUpdate: pose }, 0)
        .to(q(".vtrack"), { strokeDashoffset: -48, duration: 2.4, ease: "none" }, 0);
    } else if (type === "swim") {
      /* 自由泳：身体平躺在水线上，两臂差半圈轮流划（水下拉、出水时肘弯着移臂），腿小幅快速打水 */
      const ph = { v: 0 }, T = (sel, s) => q(sel).forEach(n => n.setAttribute("transform", s));
      const pose = () => { const t = ph.v * 360;
        [[1, 0], [2, 180]].forEach(([k, o]) => { const a = (t + o) % 360, r = a * Math.PI / 180;
          const bend = a < 180 ? 30 * Math.sin(r) : 85 * Math.sin(r - Math.PI);
          T(`.vsa${k}`, `rotate(${a.toFixed(1)} 18 -31)`); T(`.vsa${k}b`, `rotate(${bend.toFixed(1)} 35 -31)`); });
        const kick = 11 * Math.sin(ph.v * Math.PI * 6);
        T(".vk1", `rotate(${kick.toFixed(1)} -28 -29)`); T(".vk2", `rotate(${(-kick).toFixed(1)} -28 -29)`);
        T(".vbody", `translate(0 ${(4 + 1.5 * Math.sin(ph.v * Math.PI * 4)).toFixed(2)})`); };
      pose();
      tl.to(ph, { v: 2, duration: 2.4, ease: "none", onUpdate: pose }, 0)
        .fromTo(q(".vwater,.vwave"), { x: 0 }, { x: -40, duration: 2.4, ease: "none" }, 0);
      [0, 1].forEach(h => tl.fromTo(q(".vspl"), { scale: .2, opacity: 1, svgOrigin: "58 -30" }, { scale: 1.6, opacity: 0, duration: .5, stagger: .06, ease: "power1.out" }, h * 1.2 + .05));
      tl.fromTo(q(".vkb"), { x: 0, opacity: 1 }, { x: -26, y: -8, opacity: 0, duration: .8, stagger: .2, repeat: 2, ease: "sine.out" }, 0);
    } else if (type === "gym") {
      tl.to(q(".vbar"), { y: 26, duration: .5, ease: "power2.in" }).to(q(".vbar"), { y: 0, duration: .45, ease: "power3.out" }).to({}, { duration: .25 });
    } else if (type === "ball") {
      tl.fromTo(q(".vball"), { y: -40 }, { y: 0, duration: .4, ease: "power2.in" }).to(q(".vball"), { scaleY: .8, transformOrigin: "50% 100%", duration: .08, yoyo: true, repeat: 1 }).to(q(".vball"), { y: -40, duration: .4, ease: "power2.out" });
    } else if (type === "music") {
      q(".vn").forEach((n, k) => tl.fromTo(n, { y: 10, opacity: 0, rotation: 0 }, { y: -50, opacity: 1, rotation: k % 2 ? 10 : -10, svgOrigin: `${k * 26} -40`, duration: 1, ease: "sine.out" }, k * .25).to(n, { opacity: 0, duration: .3 }, k * .25 + .9));
      tl.to(q(".vspk"), { scale: 1.25, svgOrigin: "-50 -30", duration: .15, repeat: 9, yoyo: true }, 0);
    } else if (type === "social") {
      tl.from(q(".vbub1"), { scale: 0, svgOrigin: "-33 -50", duration: .4, ease: "back.out(2)" }).from(q(".vbub2"), { scale: 0, svgOrigin: "31 -12", duration: .4, ease: "back.out(2)" }, "+=.3").to({}, { duration: .8 }).to(q(".vbub1,.vbub2"), { opacity: 0, duration: .3 }).set(q(".vbub1,.vbub2"), { opacity: 1 });
    } else if (type === "heart") {
      q(".vh").forEach((h, k) => tl.fromTo(h, { opacity: 0, y: 0 }, { opacity: 1, y: -70 - (k % 3) * 18, duration: 1.4, ease: "sine.out" }, k * .18).to(h, { opacity: 0, duration: .4 }, k * .18 + 1.1));
    } else if (type === "sleep") {
      tl.fromTo(q(".vz"), { y: 10, opacity: 0 }, { y: -20, opacity: 1, duration: 1, stagger: .3, ease: "sine.out" }).to(q(".vz"), { opacity: 0, duration: .4 });
    } else if (type === "rain") {
      tl.to(q(".vumb"), { rotation: -6, svgOrigin: "0 -8", duration: .6, yoyo: true, repeat: 1, ease: "sine.inOut" }, 0)
        .fromTo(q(".vpud"), { scale: .3, opacity: .9, svgOrigin: "0 0" }, { scale: 1.6, opacity: 0, duration: 1.2, stagger: .25, ease: "power1.out" }, 0);
    }
    return tl;
  }

  /* 心情特效层（天空里） */
  function fxLayer(info, R) {
    const sp = n => [...Array(n)].map(() => `<path class="fx-sp" d="M0 -7 L1.8 -1.8 L7 0 L1.8 1.8 L0 7 L-1.8 1.8 L-7 0 L-1.8 -1.8Z" transform="translate(${(40 + R() * 320).toFixed(0)} ${(30 + R() * 170).toFixed(0)})" fill="#fff"/>`).join("");
    if (info.feel === "excited") return `<g class="fx-rainbow" opacity=".75">${["#F5B9A6", "#EFD46A", "#8DD9BF", "#8FB2F2", "#C9BCEF"].map((col, k) => `<path d="M30 250 A ${170 - k * 12} ${150 - k * 12} 0 0 1 ${370 - k * 0} 250" fill="none" stroke="${col}" stroke-width="10" pathLength="1"/>`).join("")}</g>${sp(14)}`;
    if (info.feel === "happy") return sp(9);
    if (info.feel === "anxious") return [0, 1].map(k => `<path class="fx-bolt" d="M${120 + k * 150} 60 l-16 46 h18 l-12 44 l34 -58 h-18 l14 -32z" fill="#FFE27A" stroke="#F0C33C" opacity="0"/>`).join("");
    if (info.feel === "tired") return `<rect class="fx-dim" x="0" y="0" width="400" height="330" fill="#4B5068" opacity=".12"/>`;
    if (info.feel === "calm") return [0, 1, 2].map(k => `<path class="fx-wind" d="M${20 + k * 30} ${110 + k * 34} q40 -16 80 0 t80 0" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".7"/>`).join("");
    return "";
  }
  function fxAnimate(svg, info, gsap) {
    const tl = gsap.timeline({ repeat: -1, paused: true }), q = s => [...svg.querySelectorAll(s)];
    if (q(".fx-sp").length) tl.fromTo(q(".fx-sp"), { scale: 0, rotation: 0, transformOrigin: "50% 50%" }, { scale: 1.3, rotation: 90, duration: .7, yoyo: true, repeat: 1, stagger: { each: .12, from: "random" }, ease: "sine.inOut" });
    if (q(".fx-bolt").length) q(".fx-bolt").forEach((b, k) => tl.to(b, { opacity: 1, duration: .05, repeat: 3, yoyo: true }, .6 + k * 1.1).to({}, { duration: .6 }));
    if (q(".fx-wind").length) tl.fromTo(q(".fx-wind"), { x: -120, opacity: 0 }, { x: 140, opacity: .8, duration: 2.6, stagger: .5, ease: "sine.inOut" });
    if (q(".fx-dim").length) tl.to(q(".fx-dim"), { opacity: .2, duration: 2, yoyo: true, repeat: 1, ease: "sine.inOut" });
    if (!tl.getChildren().length) tl.to({}, { duration: 1 });
    return tl;
  }
  function quoteAnim(chars, feel, gsap) {
    const tl = gsap.timeline({ repeat: -1, paused: true });
    if (!chars.length) return tl.to({}, { duration: 1 });
    if (feel === "anxious") tl.to(chars, { x: () => (Math.random() - .5) * 3, y: () => (Math.random() - .5) * 3, duration: .06, repeat: 11, yoyo: true, ease: "none", stagger: { each: .01, from: "random" } }).to(chars, { x: 0, y: 0, duration: .1 }).to({}, { duration: .8 });
    else if (feel === "sad" || feel === "tired") tl.to(chars, { y: 4, rotation: k => (k % 2 ? 6 : -4), opacity: .55, duration: 1.2, stagger: .06, ease: "sine.inOut", yoyo: true, repeat: 1 });
    else if (feel === "excited") tl.to(chars, { y: -7, duration: .22, stagger: .04, ease: "power2.out", yoyo: true, repeat: 1 }).to({}, { duration: .6 });
    else if (feel === "happy") tl.to(chars, { y: -3, duration: .4, stagger: .05, ease: "sine.inOut", yoyo: true, repeat: 1 }).to({}, { duration: 1 });
    else tl.to(chars, { opacity: .75, duration: 1.6, stagger: .04, yoyo: true, repeat: 1, ease: "sine.inOut" });
    return tl;
  }

  /* ---------- 大块转场：主角的形状 + 主角的大元素 ---------- */
  const BIG = {
    lab: da => `<path d="M40 8 h20 v28 l26 42 a9 9 0 0 1 -8 14 h-56 a9 9 0 0 1 -8 -14 l26 -42z" fill="#fff"/><path d="M22 70 l10 -16 h36 l10 16 a7 7 0 0 1 -6 10 h-44 a7 7 0 0 1 -6 -10z" fill="${da}"/><circle cx="46" cy="62" r="4" fill="#fff"/><circle cx="56" cy="54" r="3" fill="#fff"/>`,
    exam: da => `<g transform="rotate(35 50 50)"><rect x="40" y="2" width="20" height="74" rx="4" fill="${da}"/><rect x="40" y="2" width="20" height="12" rx="4" fill="#F5B9A6"/><path d="M40 76 l10 22 l10 -22z" fill="#F7E3C6"/><path d="M47 90 l3 8 l3 -8z" fill="#333"/></g>`,
    book: da => `<path d="M50 24 C 36 16 18 16 6 22 V 84 C 18 78 36 78 50 86z" fill="#fff"/><path d="M50 24 C 64 16 82 16 94 22 V 84 C 82 78 64 78 50 86z" fill="${da}"/>`,
    code: da => `<rect x="10" y="18" width="80" height="54" rx="6" fill="#232634"/><path d="M34 36 l-10 9 l10 9 M66 36 l10 9 l-10 9 M54 32 l-8 26" stroke="${da}" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/><rect x="2" y="74" width="96" height="8" rx="4" fill="#fff"/>`,
    run: da => `<circle cx="60" cy="14" r="9" fill="${da}"/><path d="M55 28 L46 56 M52 34 L64 46 L74 40 M52 34 L40 42 L32 34 M46 56 L60 70 L56 92 M46 56 L36 72 L20 78" stroke="${da}" stroke-width="9" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
    swim: da => `<path d="M50 6 C 70 34 82 50 82 66 a32 32 0 0 1 -64 0 C 18 50 30 34 50 6z" fill="${da}"/><path d="M34 66 a16 16 0 0 0 16 16" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round"/>`,
    gym: da => `<rect x="8" y="46" width="84" height="8" rx="4" fill="#6B7080"/><rect x="14" y="30" width="12" height="40" rx="3" fill="${da}"/><rect x="74" y="30" width="12" height="40" rx="3" fill="${da}"/>`,
    ball: da => `<circle cx="50" cy="50" r="40" fill="#fff"/><path d="M50 30 l16 12 -6 18 h-20 l-6 -18z" fill="${da}"/>`,
    music: da => `<path d="M40 74 V 16 l40 -8 v52" fill="none" stroke="${da}" stroke-width="7"/><ellipse cx="30" cy="74" rx="13" ry="10" fill="${da}"/><ellipse cx="70" cy="64" rx="13" ry="10" fill="${da}"/>`,
    social: da => `<rect x="6" y="14" width="60" height="38" rx="16" fill="#fff"/><rect x="34" y="46" width="60" height="38" rx="16" fill="${da}"/>`,
    heart: da => `<path d="M50 88 C 10 62 6 36 22 24 C 34 15 46 22 50 32 C 54 22 66 15 78 24 C 94 36 90 62 50 88Z" fill="${da}"/>`,
    sleep: da => `<path d="M70 70 A 34 34 0 1 1 40 16 A 26 26 0 0 0 70 70z" fill="${da}"/>`,
    rain: da => `<path d="M50 4 C 72 36 84 52 84 68 a34 34 0 0 1 -68 0 C 16 52 28 36 50 4z" fill="${da}"/><path d="M34 70 a16 16 0 0 0 16 16" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round"/>`
  };
  /* 所有边缘都是平滑曲线：两层（色带 + 新的一天）错开时才是一条干净的色带，不会叠成格子 */
  const R0 = rng(42), DROPS = [...Array(7)].map(() => ({ x: 6 + R0() * 88, d: 8 + R0() * 16, w: 3 + R0() * 4 }));
  function mask(kind, p) {
    const f = v => v.toFixed(2) + "%", c = v => Math.max(0, Math.min(100, v)), pts = [];
    if (kind === "circle") return { clip: `circle(${(p * 150).toFixed(1)}% at 78% 22%)`, el: [78, 22, p] };
    if (kind === "wave" || kind === "bars") {        // 液面 / 声波：从下往上涨，声波的起伏更大更快
      const A = kind === "bars" ? 7 : 5, F = kind === "bars" ? .1 : .09, y0 = 100 - p * (100 + A * 3);
      const y = x => y0 + A * Math.sin(x * F + p * 10) + (kind === "bars" ? A * .35 * Math.sin(x * F * 1.7 - p * 6) : 0);
      for (let x = 0; x <= 100; x += 2) pts.push(`${x}% ${f(c(y(x)))}`);
      return { clip: `polygon(${pts.join(",")},100% 100%,0% 100%)`, el: [kind === "bars" ? 50 : 62, y(kind === "bars" ? 50 : 62), 1] };
    }
    if (kind === "drip") {                           // 雨帘：从上往下落，边缘挂着几颗圆润的水滴
      const base = p * 125, y = x => base - 6 + 3 * Math.sin(x * .12 + p * 6) + DROPS.reduce((a, d) => a + d.d * Math.exp(-Math.pow((x - d.x) / d.w, 2)), 0);
      pts.push("0% 0%", "100% 0%"); for (let x = 100; x >= 0; x -= 2) pts.push(`${x}% ${f(c(y(x)))}`);
      return { clip: `polygon(${pts.join(",")})`, el: [DROPS[2].x, y(DROPS[2].x), 1] };
    }
    if (kind === "lanes") {                          // 跑道：从左往右扫过，边缘是一道弯
      const base = p * 130, x = yy => base - 14 + 10 * Math.sin(yy * .05 + p * 4) - 8 * Math.abs(yy - 50) / 50;
      pts.push("0% 0%"); for (let yy = 0; yy <= 100; yy += 2) pts.push(`${f(c(x(yy)))} ${yy}%`); pts.push("0% 100%");
      return { clip: `polygon(${pts.join(",")})`, el: [x(55), 55, 1] };
    }
    if (kind === "page") { const xt = 100 - p * 125, xb = xt + 18; return { clip: `polygon(${f(c(xt))} 0%,100% 0%,100% 100%,${f(c(xb))} 100%)`, el: [xt + 6, 34, 1] }; }
    const a = 100 - p * 100, b = 140 - p * 140;   // diag：铅笔划过的斜线
    return { clip: `polygon(0% ${f(c(a))},100% ${f(c(b))},100% 100%,0% 100%)`, el: [60, a + (b - a) * .6, 1] };
  }

  /* ---------- 每天的数据面板：七种形式，一周不重复 ---------- */
  const CAT = { study: "var(--c-study)", sport: "var(--c-sport)", life: "var(--c-life)", star: "var(--c-star)", sleep: "var(--c-sleep)", none: "rgba(22,24,29,.07)" };
  const CN = { study: "学习", sport: "运动", life: "个人", star: "高光", sleep: "睡眠", none: "没记录" };
  function dayMinutes(c, i) {
    const m = { study: 0, sport: 0, life: 0, star: 0, sleep: 0 };
    (c.data.timeline || []).filter(e => e.day === i).forEach(e => m[e.cat] += c.mins(e.end) - c.mins(e.start));
    m.none = Math.max(0, 1440 - Object.values(m).reduce((a, b) => a + b, 0)); return m;
  }
  function panel(c, x, info, D) {
    const st = c.data.core.find(k => k.key === "study"), sl = c.data.core.find(k => k.key === "sleep"), sp = c.data.core.find(k => k.key === "sport");
    const M = dayMinutes(c, x.i), TL = (c.data.timeline || []).filter(e => e.day === x.i), hm = c.hm;
    const avg = arr => { const v = (arr || []).filter(n => n != null); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
    const p = info.panel;
    if (p === "ring") {
      let a0 = 0; const R = 40, C = 2 * Math.PI * R;
      const segs = Object.entries(M).filter(([, v]) => v > 0).map(([k, v]) => { const len = v / 1440 * C, s = `<circle class="pr" data-k="${k}" data-v="${v}" r="${R}" cx="50" cy="50" fill="none" stroke="${CAT[k]}" stroke-width="16" stroke-dasharray="${len.toFixed(1)} ${C.toFixed(1)}" stroke-dashoffset="${(-a0).toFixed(1)}" transform="rotate(-90 50 50)"/>`; a0 += len; return s; }).join("");
      return `<svg viewBox="0 0 100 100" width="104" height="104">${segs}<text class="rc1" x="50" y="47" text-anchor="middle" font-size="9" fill="var(--ink2)">学习</text><text class="rc2" x="50" y="62" text-anchor="middle" font-size="15" font-weight="800" fill="var(--da)">${hm(M.study / 60)}</text></svg>
        <div><h4>这一天的 24 小时</h4><ul class="cl-leg">${Object.entries(M).filter(([, v]) => v > 0).map(([k, v]) => `<li data-k="${k}"><i style="background:${CAT[k]}"></i>${CN[k]}<b>${hm(v / 60)}</b></li>`).join("")}</ul></div><div class="cl-pop">点圆环或图例，看这一类</div>`;
    }
    if (p === "subjects") {
      const by = {}; TL.filter(e => e.cat === "study").forEach(e => { const s = String(e.text).split(/[ ·]/)[0]; by[s] = (by[s] || 0) + (c.mins(e.end) - c.mins(e.start)) / 60; });
      const mx = Math.max(...Object.values(by), st?.daily_goal || 0, .1), tot = Object.values(by).reduce((a, b) => a + b, 0);
      return `<div style="grid-column:1/-1"><h4>今天学了 <b>${hm(tot)}</b>${st?.daily_goal ? ` · 目标 ${hm(st.daily_goal)} ${tot >= st.daily_goal ? "✓" : `差 ${hm(st.daily_goal - tot)}`}` : ""}</h4><div class="cl-bars">${Object.entries(by).sort((a, b) => b[1] - a[1]).map(([s, v]) => `<div class="cl-bar" data-s="${c.esc(s)}"><span>${c.esc(s)}</span><s><i class="pb" style="width:${(v / mx * 100).toFixed(1)}%"></i></s><b>${hm(v)}</b></div>`).join("")}
        <div class="cl-bar"><span>合计</span><s><i class="pb" style="width:${(tot / mx * 100).toFixed(1)}%;background:var(--ink)"></i>${st?.daily_goal ? `<u style="left:${(st.daily_goal / mx * 100).toFixed(1)}%"></u>` : ""}</s><b>${hm(tot)}</b></div></div><div class="cl-pop">点一门，看是哪几段</div></div>`;
    }
    if (p === "ribbon") {
      const blocks = TL.map(e => `<rect x="${(c.mins(e.start) / 1440 * 300).toFixed(1)}" y="8" width="${Math.max(1.5, (c.mins(e.end) - c.mins(e.start)) / 1440 * 300).toFixed(1)}" height="26" rx="3" fill="${CAT[e.cat]}"/>`).join("");
      return `<div style="grid-column:1/-1"><h4>24 小时色带 · 现在 <b class="pnow">—</b></h4><svg class="rib" viewBox="0 0 300 50" width="100%" height="58" style="touch-action:pan-y"><rect x="0" y="8" width="300" height="26" rx="5" fill="rgba(22,24,29,.06)"/>${blocks}
        <line class="pmark" x1="0" x2="0" y1="2" y2="40" stroke="var(--da)" stroke-width="2.5"/>${[0, 6, 12, 18, 24].map(h => `<text x="${h * 12.5}" y="48" font-size="8" fill="var(--mute)" text-anchor="${h === 0 ? "start" : h === 24 ? "end" : "middle"}">${h}</text>`).join("")}</svg><div class="cl-pop">按住色带左右拖，天空跟着走</div></div>`;
    }
    if (p === "gauge") {
      const v = x.study || 0, g = st?.daily_goal || 5, mx = Math.max(g * 1.6, v * 1.1), ang = cl01(v / mx) * 180, sleep = x.sleep;
      const arc = (a1, a2, col, w) => { const P = a => [50 - 40 * Math.cos(a * Math.PI / 180), 54 - 40 * Math.sin(a * Math.PI / 180)]; const [x1, y1] = P(a1), [x2, y2] = P(a2);
        return `<path d="M${x1.toFixed(1)} ${y1.toFixed(1)} A40 40 0 ${a2 - a1 > 180 ? 1 : 0} 1 ${x2.toFixed(1)} ${y2.toFixed(1)}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round"/>`; };
      return `<svg class="gsv" data-study="${v}" data-goal="${g}" data-sleep="${sleep ?? ""}" viewBox="0 0 100 62" width="128" height="80">${arc(0, 180, "rgba(22,24,29,.08)", 10)}<g class="garc">${arc(0, Math.max(1, ang), "var(--da)", 10)}</g><g class="gmark">${arc(g / mx * 180 - 1, g / mx * 180 + 1, "var(--ink)", 14)}</g>
        <g class="pneedle" transform="rotate(${ang} 50 54)"><line x1="50" y1="54" x2="16" y2="54" stroke="var(--ink)" stroke-width="2.5" stroke-linecap="round"/></g><circle cx="50" cy="54" r="4" fill="var(--ink)"/></svg>
        <div><div class="cl-big gbig">${hm(v)}</div><div class="cl-sub gsub">学习 · 目标 ${hm(g)} ${v >= g ? "达成 ✓" : ""}</div><div class="cl-sub" style="color:var(--da)">点表盘：学习 ⇄ 睡眠</div>
        ${sleep != null ? `<div class="cl-sub" style="display:flex;align-items:center;gap:6px;margin-top:8px">昨晚睡 <svg width="44" height="18" viewBox="0 0 44 18"><rect x="1" y="1" width="38" height="16" rx="4" fill="none" stroke="var(--ink2)"/><rect x="40" y="6" width="3" height="6" rx="1" fill="var(--ink2)"/><rect class="pbat" x="3" y="3" width="${(34 * cl01(sleep / 8)).toFixed(1)}" height="12" rx="2" fill="${sleep >= 7 ? "var(--c-sport)" : "#F5B9A6"}"/></svg><b>${hm(sleep)}</b></div>` : ""}</div>`;
    }
    if (p === "dots") {
      const dots = [...Array(48)].map((_, k) => { const m0 = k * 30, e = TL.find(q => c.mins(q.start) <= m0 + 15 && c.mins(q.end) > m0 + 15);
        return `<circle class="pd" data-m="${m0}" cx="${8 + (k % 12) * 15}" cy="${8 + Math.floor(k / 12) * 15}" r="5.6" fill="${e ? CAT[e.cat] : CAT.none}"/>`; }).join("");
      return `<svg viewBox="0 0 182 60" width="182" height="60">${dots}</svg><div><h4>半小时一格 · 已过 <b class="pnow">0</b> 格</h4><div class="cl-sub">点一格，跳到那半小时。</div></div><div class="cl-pop"></div>`;
    }
    if (p === "clock") {
      const arcs = TL.filter(e => e.cat !== "sleep").map(e => { const a1 = c.mins(e.start) / 1440 * 360, a2 = c.mins(e.end) / 1440 * 360, P = a => [50 + 38 * Math.sin(a * Math.PI / 180), 50 - 38 * Math.cos(a * Math.PI / 180)];
        const [x1, y1] = P(a1), [x2, y2] = P(Math.max(a1 + 2, a2)); return `<path d="M${x1.toFixed(1)} ${y1.toFixed(1)} A38 38 0 ${a2 - a1 > 180 ? 1 : 0} 1 ${x2.toFixed(1)} ${y2.toFixed(1)}" fill="none" stroke="${CAT[e.cat]}" stroke-width="10"/>`; }).join("");
      return `<svg class="dial" viewBox="0 0 100 100" width="104" height="104" style="touch-action:none"><circle cx="50" cy="50" r="38" fill="none" stroke="rgba(22,24,29,.07)" stroke-width="10"/>${arcs}
        ${[0, 6, 12, 18].map((h, k) => `<text x="${50 + 26 * Math.sin(k * Math.PI / 2)}" y="${53 - 26 * Math.cos(k * Math.PI / 2)}" text-anchor="middle" font-size="7" fill="var(--mute)">${h}</text>`).join("")}
        <g class="phand"><line x1="50" y1="50" x2="50" y2="18" stroke="var(--da)" stroke-width="3" stroke-linecap="round"/></g><circle cx="50" cy="50" r="3.5" fill="var(--da)"/></svg>
        <div><h4>24 小时表盘 · 拖指针</h4><div class="cl-big pnow">—</div><div class="cl-sub pwhat">—</div></div>`;
    }
    /* compare：今天和这周平均 */
    const rows = [["学习", x.study, avg(st?.daily), hm, st?.daily], ["睡眠", x.sleep, avg(sl?.daily), hm, sl?.daily], ["运动", (sp?.daily || [])[x.i], avg(sp?.daily), v => `${Math.round(v * 10) / 10} 次`, sp?.daily]].filter(r => r[1] != null && r[2] != null);
    const mx = Math.max(...rows.flatMap(r => [r[1], r[2]]), .1);
    return `<div style="grid-column:1/-1"><h4>今天 vs 这周平均</h4><div class="cl-bars">${rows.map(([n, v, a, fm, wk]) => `<div class="cl-bar" data-w='${JSON.stringify(wk || [])}' data-n="${n}"><span>${n}</span><s><i class="pb" style="width:${(v / mx * 100).toFixed(1)}%"></i><i class="avg" style="width:${(a / mx * 100).toFixed(1)}%"></i></s><b>${fm(v)}</b></div>`).join("")}</div>
      <div class="cl-sub">粗条是今天，细灰条是这周平均。点一行，看七天走势。</div><div class="cl-pop spark"></div></div>`;
  }
  /* 面板跟着时钟走的部分 */
  function panelLive(el, info, c, x, t) {
    if (!el) return;
    if (info.panel === "ribbon") { const m = el.querySelector(".pmark"); m.setAttribute("x1", t / 1440 * 300); m.setAttribute("x2", t / 1440 * 300); el.querySelector(".pnow").textContent = c.clock(Math.min(1435, Math.round(t / 5) * 5)); }
    if (info.panel === "dots") { let n = 0; el.querySelectorAll(".pd").forEach(d => { const on = +d.dataset.m < t; d.style.opacity = on ? 1 : .22; if (on) n++; }); el.querySelector(".pnow").textContent = n; }
    if (info.panel === "clock") { el.querySelector(".phand").setAttribute("transform", `rotate(${t / 1440 * 360} 50 50)`); el.querySelector(".pnow").textContent = c.clock(Math.min(1435, Math.round(t / 5) * 5));
      const e = (c.data.timeline || []).find(q => q.day === x.i && c.mins(q.start) <= t && c.mins(q.end) > t); el.querySelector(".pwhat").textContent = e ? (e.cat === "sleep" ? "在睡觉" : e.text) : "这段没有记录"; }
  }

  /* ---------- 面板交互：每种都能直接操作 ---------- */
  function wirePanel(el, info, c, x, api, gsap) {
    if (!el) return;
    const pop = el.querySelector(".cl-pop"), TL = (c.data.timeline || []).filter(e => e.day === x.i), CNk = { study: "学习", sport: "运动", life: "个人", star: "高光", sleep: "睡眠", none: "没记录" };
    const at = t => { const e = TL.find(q => c.mins(q.start) <= t && c.mins(q.end) > t); return e ? (e.cat === "sleep" ? "在睡觉" : c.esc(e.text)) : "这段没有记录"; };
    const p = info.panel;
    if (p === "ring") {
      const pick = k => { el.querySelectorAll(".pr").forEach(s => s.classList.toggle("dim", s.dataset.k !== k)); const s = el.querySelector(`.pr[data-k="${k}"]`); if (!s) return;
        const v = +s.dataset.v; el.querySelector(".rc1").textContent = CNk[k]; el.querySelector(".rc2").textContent = c.hm(v / 60);
        if (pop) pop.innerHTML = `<b>${CNk[k]}</b> 占这一天的 ${Math.round(v / 14.4)}%`; if (gsap) gsap.fromTo(s, { attr: { "stroke-width": 16 } }, { attr: { "stroke-width": 21 }, duration: .25, yoyo: true, repeat: 1 }); };
      el.querySelectorAll("[data-k]").forEach(n => n.addEventListener("click", () => pick(n.dataset.k)));
    }
    if (p === "subjects") el.querySelectorAll(".cl-bar[data-s]").forEach(b => b.addEventListener("click", () => {
      el.querySelectorAll(".cl-bar").forEach(q => q.classList.toggle("on", q === b));
      const ss = TL.filter(e => e.cat === "study" && String(e.text).startsWith(b.dataset.s));
      if (pop) pop.innerHTML = ss.map(e => `<b>${e.start}</b> ${c.esc(e.text)}`).join(" · ");
      if (ss[0]) api.scrub(c.mins(ss[0].start) + 1); }));
    if (p === "ribbon") { const svg = el.querySelector(".rib"); let on = false;
      const go = e => { const r = svg.getBoundingClientRect(), t = Math.round(Math.max(0, Math.min(1439, (e.clientX - r.left) / r.width * 1440))); api.scrub(t); if (pop) pop.innerHTML = `<b>${c.clock(t)}</b> · ${at(t)}`; };
      svg.addEventListener("pointerdown", e => { on = true; go(e); }); svg.addEventListener("pointermove", e => { if (on || e.pointerType === "mouse" && e.buttons) go(e); }); addEventListener("pointerup", () => on = false); }
    if (p === "dots") el.querySelectorAll(".pd").forEach(d => d.addEventListener("click", () => { const t = +d.dataset.m + 15; api.scrub(t);
      el.querySelectorAll(".pd").forEach(q => q.classList.toggle("hit", q === d)); if (pop) pop.innerHTML = `<b>${c.clock(+d.dataset.m)}–${c.clock(+d.dataset.m + 30)}</b> · ${at(t)}`; }));
    if (p === "clock") { const svg = el.querySelector(".dial"); let on = false;
      const go = e => { const r = svg.getBoundingClientRect(), a = Math.atan2(e.clientX - (r.left + r.width / 2), -(e.clientY - (r.top + r.height / 2))), t = Math.round(((a / (2 * Math.PI) + 1) % 1) * 1440); api.scrub(Math.min(1439, t)); };
      svg.addEventListener("pointerdown", e => { on = true; svg.setPointerCapture?.(e.pointerId); go(e); }); svg.addEventListener("pointermove", e => { if (on) go(e); }); svg.addEventListener("pointerup", () => on = false); }
    if (p === "gauge") { const svg = el.querySelector(".gsv"); let mode = 0;
      svg.addEventListener("click", () => { const sl = svg.dataset.sleep; if (sl === "") return; mode = 1 - mode;
        const v = mode ? +sl : +svg.dataset.study, g = mode ? 8 : +svg.dataset.goal, mx = Math.max(g * 1.6, v * 1.1), ang = Math.max(1, Math.min(180, v / mx * 180));
        const P = a => [50 - 40 * Math.cos(a * Math.PI / 180), 54 - 40 * Math.sin(a * Math.PI / 180)], [x2, y2] = P(ang), [m1x, m1y] = P(g / mx * 180 - 1), [m2x, m2y] = P(g / mx * 180 + 1);
        el.querySelector(".garc path").setAttribute("d", `M10 54 A40 40 0 0 1 ${x2.toFixed(1)} ${y2.toFixed(1)}`);
        el.querySelector(".gmark path").setAttribute("d", `M${m1x.toFixed(1)} ${m1y.toFixed(1)} A40 40 0 0 1 ${m2x.toFixed(1)} ${m2y.toFixed(1)}`);
        const nd = el.querySelector(".pneedle"); if (gsap) gsap.to(nd, { rotation: ang, svgOrigin: "50 54", duration: 1, ease: "elastic.out(1,.55)" }); else nd.setAttribute("transform", `rotate(${ang} 50 54)`);
        el.querySelector(".gbig").textContent = c.hm(v); el.querySelector(".gsub").textContent = `${mode ? "睡眠 · 建议 8h" : `学习 · 目标 ${c.hm(g)}`} ${v >= g ? "达成 ✓" : `差 ${c.hm(g - v)}`}`; }); }
    if (p === "compare") el.querySelectorAll(".cl-bar[data-w]").forEach(b => b.addEventListener("click", () => {
      const w = JSON.parse(b.dataset.w || "[]"), mx = Math.max(...w.filter(v => v != null), .1);
      const pts = w.map((v, k) => v == null ? null : [10 + k * 40, 38 - v / mx * 30]);
      const line = pts.filter(Boolean).map((q, k) => `${k ? "L" : "M"}${q[0]} ${q[1].toFixed(1)}`).join(" ");
      if (pop) pop.innerHTML = `<svg viewBox="0 0 270 50" width="100%" height="52"><path d="${line}" fill="none" stroke="var(--da)" stroke-width="2.5" stroke-linejoin="round"/>`
        + pts.map((q, k) => q ? `<circle cx="${q[0]}" cy="${q[1].toFixed(1)}" r="${k === x.i ? 5 : 3}" fill="${k === x.i ? "var(--da)" : "#fff"}" stroke="var(--da)" stroke-width="2"/>` : "").join("")
        + c.DAYS.map((d, k) => `<text x="${10 + k * 40}" y="49" text-anchor="middle" font-size="9" fill="${k === x.i ? "var(--da)" : "var(--mute)"}">${d}</text>`).join("") + `</svg>`;
      el.querySelectorAll(".cl-bar").forEach(q => q.classList.toggle("on", q === b));
      if (gsap) gsap.from(pop.querySelector("path"), { strokeDasharray: 400, strokeDashoffset: 400, duration: .8, ease: "power2.out" }); }));
  }

  return { wirePanel, TYPES, typeOf, analyzeWeek, vignettes: V, animate, fxLayer, fxAnimate, quoteAnim, BIG, mask, panel, panelLive, FEEL };
})();
