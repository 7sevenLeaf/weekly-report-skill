#!/usr/bin/env python3
"""把 week.json 和一个主题拼成单文件周报网页。

用法：
    python build.py week.json 主题文件夹 -o 周报.html
    python build.py week.json 主题文件夹 --check     # 只检查数据，不出页面

主题文件夹里放：theme.json（名字、字体链接）、theme.css、可选的 theme.js。
只用 Python 标准库。
"""
from __future__ import annotations

import argparse
import html
import json
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ASSETS = HERE.parent / "assets"

# 主题在 theme.json 里写 "scripts": ["gsap.min.js", "ScrollTrigger.min.js"] 就会带上 GSAP。
# GSAP 用的是 Webflow 的 Standard "No Charge" License（https://gsap.com/standard-license）：
# 可以原样嵌进生成的网页，文件开头的版权声明必须保留，本脚本不改动文件内容。
GSAP_VERSION = "3.15.0"
GSAP_CDN = f"https://cdn.jsdelivr.net/npm/gsap@{GSAP_VERSION}/dist/"
VENDOR_DIRS = [HERE.parent.parent / "tools" / "node_modules" / "gsap" / "dist"]


def vendor_tags(names: list[str], vendor: Path | None) -> str:
    """能找到本地文件就整段嵌进来（离线也能打开），找不到就引用固定版本的 CDN。"""
    dirs = ([vendor] if vendor else []) + VENDOR_DIRS
    tags = []
    for name in names:
        local = next((d / name for d in dirs if (d / name).exists()), None)
        if local:
            tags.append(f"<script>\n{local.read_text(encoding='utf-8')}\n</script>")
        else:
            tags.append(f'<script src="{GSAP_CDN}{html.escape(name)}"></script>')
    return "\n".join(tags)

CATS = {"study", "sport", "sleep", "life", "star"}
KINDS = {"hours", "count", "avg_hours"}
STATUS = {"done", "partial", "moved", "missed"}
TIME = re.compile(r"^([01]\d|2[0-4]):[0-5]\d$")
DATE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def validate(week: dict) -> list[str]:
    """返回问题清单；空清单表示数据能用。"""
    errs: list[str] = []

    def need(obj, key, where):
        if not isinstance(obj, dict) or obj.get(key) in (None, "", []):
            errs.append(f"{where} 缺少 {key}")
            return False
        return True

    meta = week.get("meta")
    if need(week, "meta", "顶层"):
        for k in ("title", "week", "start", "end", "source"):
            need(meta, k, "meta")
        for k in ("start", "end"):
            if meta.get(k) and not DATE.match(str(meta[k])):
                errs.append(f"meta.{k} 要写成 YYYY-MM-DD")

    if need(week, "core", "顶层"):
        core = week["core"]
        if not 1 <= len(core) <= 4:
            errs.append("core 放 1–4 项")
        for i, c in enumerate(core):
            w = f"core[{i}]"
            for k in ("key", "label", "kind"):
                need(c, k, w)
            if c.get("kind") not in KINDS:
                errs.append(f"{w}.kind 只能是 {sorted(KINDS)}")
            if "value" not in c:
                errs.append(f"{w} 缺少 value（没记录就写 null）")
            d = c.get("daily")
            if d is not None and (not isinstance(d, list) or len(d) != 7):
                errs.append(f"{w}.daily 要正好 7 个值（周一到周日，没记写 null）")

    if need(week, "achievements", "顶层"):
        a = week["achievements"]
        if len(a) > 6:
            errs.append("achievements 最多 6 件，挑真正做成的")
        for i, x in enumerate(a):
            need(x, "big", f"achievements[{i}]")
            need(x, "what", f"achievements[{i}]")
            fig = x.get("figure")
            if fig and not str(fig).lstrip().startswith("<svg"):
                errs.append(f"achievements[{i}].figure 要是一段 <svg>")
            if fig and re.search(r"<script|on\w+\s*=", str(fig), re.I):
                errs.append(f"achievements[{i}].figure 里不能有脚本")

    for i, e in enumerate(week.get("timeline") or []):
        w = f"timeline[{i}]"
        if not isinstance(e.get("day"), int) or not 0 <= e["day"] <= 6:
            errs.append(f"{w}.day 是 0（周一）到 6（周日）")
        for k in ("start", "end"):
            if not TIME.match(str(e.get(k, ""))):
                errs.append(f"{w}.{k} 要写成 HH:MM")
        if TIME.match(str(e.get("start", ""))) and TIME.match(str(e.get("end", ""))) and e["end"] <= e["start"]:
            errs.append(f"{w} 结束不晚于开始；跨零点的事拆成两条")
        if e.get("cat") not in CATS:
            errs.append(f"{w}.cat 只能是 {sorted(CATS)}")
        if e.get("cat") != "sleep" and not e.get("text"):
            errs.append(f"{w} 缺少 text")

    for i, g in enumerate(week.get("goals") or []):
        need(g, "name", f"goals[{i}]")
        if g.get("status") not in STATUS:
            errs.append(f"goals[{i}].status 只能是 {sorted(STATUS)}")

    mood = week.get("mood")
    if mood:
        days = mood.get("days") or []
        if len(days) != 7:
            errs.append("mood.days 要正好 7 天，读不出来的写 {\"level\": null}")
        if mood.get("source") not in ("read", "self"):
            errs.append("mood.source 写 read（助手读的）或 self（本人打分）")
        for i, d in enumerate(days):
            lv = d.get("level")
            if lv is not None and not (isinstance(lv, (int, float)) and 1 <= lv <= 5):
                errs.append(f"mood.days[{i}].level 是 1–5 或 null")

    for i, q in enumerate(week.get("quotes") or []):
        need(q, "text", f"quotes[{i}]")
    for i, para in enumerate((week.get("letter") or {}).get("paragraphs") or []):
        if not (isinstance(para, str) or (isinstance(para, dict) and para.get("text"))):
            errs.append(f"letter.paragraphs[{i}] 写成一句话，或者 {{\"tag\": \"学习\", \"text\": \"…\"}}")

    return errs


def load_theme(folder: Path) -> dict:
    cfg = json.loads((folder / "theme.json").read_text(encoding="utf-8"))
    js = folder / "theme.js"
    parts = "".join((folder / name).read_text(encoding="utf-8") + "\n" for name in cfg.get("parts", []))
    return {
        "name": cfg.get("name", folder.name),
        "fonts": cfg.get("fonts", ""),
        "scripts": cfg.get("scripts", []),
        "css": (folder / "theme.css").read_text(encoding="utf-8"),
        "js": parts + (js.read_text(encoding="utf-8") if js.exists() else ""),
    }


def build(week: dict, theme: dict, vendor: Path | None = None) -> str:
    meta = week["meta"]
    title = f"{meta['title']} 第{meta['week']}周"
    data = json.dumps(week, ensure_ascii=False).replace("</", "<\\/")
    fonts = (
        '<link rel="preconnect" href="https://fonts.googleapis.com">'
        '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
        f'<link rel="stylesheet" href="{html.escape(theme["fonts"])}">'
        if theme["fonts"] else ""
    ) + (
        # 原话卡的字：霞鹜文楷（开源 OFL），按字分片加载
        '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/lxgw-wenkai-webfont@1.7.0/style.css">'
    )
    kit_css = (ASSETS / "kit.css").read_text(encoding="utf-8")
    kit_js = (ASSETS / "kit.js").read_text(encoding="utf-8")
    return f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>{html.escape(title)}</title>
<meta name="generator" content="weekly-report skill · 主题：{html.escape(theme['name'])}">
{fonts}
<style>
{kit_css}
/* —— 主题：{theme['name']} —— */
{theme['css']}
</style>
</head>
<body>
<main id="wr"></main>
<script type="application/json" id="week">{data}</script>
{vendor_tags(theme["scripts"], vendor)}
<script>
{theme['js']}
</script>
<script>
{kit_js}
</script>
</body>
</html>
"""


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(description="把 week.json 拼成周报网页")
    p.add_argument("week", type=Path)
    p.add_argument("theme", type=Path)
    p.add_argument("-o", "--out", type=Path)
    p.add_argument("--check", action="store_true", help="只检查数据")
    p.add_argument("--vendor", type=Path, help="放 gsap.min.js 等文件的文件夹；不给就找开发目录，再找不到就用 CDN")
    a = p.parse_args(argv)

    week = json.loads(a.week.read_text(encoding="utf-8"))
    errs = validate(week)
    if errs:
        print("数据有问题，先改好再出页面：", file=sys.stderr)
        for e in errs:
            print("  - " + e, file=sys.stderr)
        return 1
    if a.check:
        print("数据检查通过")
        return 0
    out = a.out or a.week.with_suffix(".html")
    out.write_text(build(week, load_theme(a.theme), a.vendor), encoding="utf-8")
    print(f"已生成 {out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
