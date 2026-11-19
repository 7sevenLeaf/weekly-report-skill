#!/usr/bin/env python3
"""把日历导出的 .ics 文件整理成 week.json 的数据部分。

用法：
    python ics_to_week.py 日历.ics --week-start 2027-03-15 -o week.json
    python ics_to_week.py 学习.ics:study 运动.ics:sport 睡眠.ics:sleep --week-start 2027-03-15

- 文件名后面加 :分类，表示这个日历里的事都算这一类；不加就按标题里的关键词猜。
- 分类：study 学习、sport 运动、sleep 睡眠、life 个人、star 高光。
- 时间按 --utc-offset 换算（默认 +08:00 北京时间）。带 TZID 的时间当作已经是这个时区。
- 只整理数据：成就、评价、情绪这些要再由助手补进去。
只用 Python 标准库。
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

KEYWORDS = {
    "sleep": ["睡", "sleep", "午休", "nap"],
    "sport": ["跑", "健身", "训练", "力量", "球", "游泳", "骑", "瑜伽", "徒步", "gym", "run", "workout", "swim", "yoga", "football", "basketball"],
    "study": ["学", "课", "复习", "作业", "论文", "读", "研究", "刷题", "考", "study", "class", "homework", "lecture", "exam", "paper"],
    "star": ["★", "⭐", "高光", "通过", "获奖", "满分", "上线", "发表"],
}
ICON_HINTS = [("数学", "math"), ("代码", "code"), ("编程", "code"), ("实验", "lab"), ("读", "book"), ("考", "pen"), ("跑", "run"),
              ("健身", "gym"), ("球", "ball"), ("游泳", "swim"), ("骑", "bike"), ("唱", "sing"), ("琴", "music"), ("吉他", "music"),
              ("乐", "music"), ("游戏", "game"), ("会", "meet"), ("旅", "trip")]


def unfold(text: str) -> list[str]:
    lines: list[str] = []
    for raw in text.splitlines():
        if raw[:1] in (" ", "\t") and lines:
            lines[-1] += raw[1:]
        else:
            lines.append(raw)
    return lines


def unescape(v: str) -> str:
    return v.replace("\\n", "\n").replace("\\N", "\n").replace("\\,", ",").replace("\\;", ";").replace("\\\\", "\\")


def parse_dt(params: str, value: str, tz: timezone) -> tuple[datetime, bool]:
    """返回 (本地时间, 是否全天)。"""
    if "VALUE=DATE" in params.upper() or re.fullmatch(r"\d{8}", value):
        d = datetime.strptime(value[:8], "%Y%m%d")
        return d, True
    if value.endswith("Z"):
        dt = datetime.strptime(value[:-1], "%Y%m%dT%H%M%S").replace(tzinfo=timezone.utc)
        return dt.astimezone(tz).replace(tzinfo=None), False
    return datetime.strptime(value[:15], "%Y%m%dT%H%M%S"), False


def parse_duration(v: str) -> timedelta:
    m = re.fullmatch(r"([+-])?P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?", v)
    if not m:
        return timedelta(0)
    sign = -1 if m.group(1) == "-" else 1
    w, d, h, mi, s = (int(x) if x else 0 for x in m.groups()[1:])
    return sign * timedelta(weeks=w, days=d, hours=h, minutes=mi, seconds=s)


def read_events(text: str, tz: timezone) -> list[dict]:
    events, cur = [], None
    for line in unfold(text):
        if line == "BEGIN:VEVENT":
            cur = {}
        elif line == "END:VEVENT" and cur is not None:
            events.append(cur)
            cur = None
        elif cur is not None and ":" in line:
            name, value = line.split(":", 1)
            key, _, params = name.partition(";")
            cur[key.upper()] = (params, value)
    out = []
    for e in events:
        if "DTSTART" not in e:
            continue
        start, allday = parse_dt(*e["DTSTART"], tz)
        if "DTEND" in e:
            end, _ = parse_dt(*e["DTEND"], tz)
        elif "DURATION" in e:
            end = start + parse_duration(e["DURATION"][1])
        else:
            end = start + (timedelta(days=1) if allday else timedelta(0))
        out.append({
            "start": start, "end": end, "allday": allday,
            "summary": unescape(e.get("SUMMARY", ("", ""))[1]).strip(),
            "categories": unescape(e.get("CATEGORIES", ("", ""))[1]).strip(),
            "description": unescape(e.get("DESCRIPTION", ("", ""))[1]).strip(),
        })
    return out


def guess_cat(text: str) -> str:
    low = text.lower()
    for cat in ("sleep", "star", "sport", "study"):
        if any(k in low for k in KEYWORDS[cat]):
            return cat
    return "life"


def guess_icon(text: str, cat: str) -> str:
    for k, ic in ICON_HINTS:
        if k in text:
            return ic
    return {"study": "study", "sport": "run", "star": "star", "life": "heart"}.get(cat, "")


def to_week(paths: list[tuple[Path, str | None]], week_start: date, tz: timezone) -> tuple[dict, list[str]]:
    notes: list[str] = []
    w0 = datetime.combine(week_start, datetime.min.time())
    w1 = w0 + timedelta(days=7)
    timeline, allday = [], []
    for path, forced in paths:
        for e in read_events(path.read_text(encoding="utf-8-sig"), tz):
            cat = forced or guess_cat(f"{e['summary']} {e['categories']}")
            if e["allday"]:
                if w0 <= e["start"] < w1:
                    allday.append({"day": (e["start"] - w0).days, "text": e["summary"], "cat": cat})
                continue
            s, t = max(e["start"], w0), min(e["end"], w1)
            while s < t:  # 跨零点拆开
                midnight = datetime.combine(s.date() + timedelta(days=1), datetime.min.time())
                piece_end = min(t, midnight)
                timeline.append({
                    "day": (s.date() - week_start).days,
                    "start": s.strftime("%H:%M"),
                    "end": "24:00" if piece_end == midnight else piece_end.strftime("%H:%M"),
                    "cat": cat,
                    **({} if cat == "sleep" else {"text": e["summary"] or "（无标题）", "icon": guess_icon(e["summary"], cat)}),
                    "_minutes": (piece_end - s).total_seconds() / 60,
                    "_wake": t.date() == piece_end.date() or piece_end != midnight,
                    "_whole": (e["start"], e["end"]),
                })
                s = piece_end

    timeline.sort(key=lambda x: (x["day"], x["start"]))
    study = [0.0] * 7
    sport = [0] * 7
    sleep: list[float | None] = [None] * 7
    seen_sport = set()
    for x in timeline:
        if x["cat"] == "study":
            study[x["day"]] += x["_minutes"] / 60
        elif x["cat"] == "sport" and x["_whole"] not in seen_sport:
            seen_sport.add(x["_whole"])
            sport[x["day"]] += 1
    for x in timeline:  # 睡眠按醒来那天算整段
        if x["cat"] == "sleep" and x["_whole"][1] >= w0:
            wake_day = (x["_whole"][1].date() - week_start).days
            if 0 <= wake_day <= 6 and x["end"] != "24:00":
                hours = (x["_whole"][1] - x["_whole"][0]).total_seconds() / 3600
                sleep[wake_day] = round((sleep[wake_day] or 0) + hours, 2)
    for x in timeline:
        for k in ("_minutes", "_wake", "_whole"):
            x.pop(k, None)

    slept = [v for v in sleep if v is not None]
    core = [
        {"key": "study", "label": "有效学习", "kind": "hours", "value": round(sum(study), 2), "daily": [round(v, 2) for v in study]},
        {"key": "sport", "label": "运动", "kind": "count", "value": sum(sport), "daily": sport},
        {"key": "sleep", "label": "平均睡眠", "kind": "avg_hours",
         "value": round(sum(slept) / len(slept), 2) if slept else None, "daily": sleep,
         **({"note": f"只记了 {len(slept)} 晚，没记的留空。"} if 0 < len(slept) < 7 else {})},
    ]
    if not slept:
        core.pop()
        notes.append("日历里没有睡眠记录，核心数据里去掉了睡眠。")
    if allday:
        notes.append(f"有 {len(allday)} 个全天事件没放进时间线，放在 allday_events 里供助手参考。")
    iso = week_start.isocalendar()
    week = {
        "meta": {"title": "个人周报", "week": iso[1], "start": week_start.isoformat(),
                 "end": (week_start + timedelta(days=6)).isoformat(), "source": "数据来自日历导出（.ics），按 UTC" + tz_label(tz) + " 整理"},
        "core": core,
        "achievements": [],
        "timeline": timeline,
        "allday_events": allday,
    }
    notes.append("achievements 还是空的：请助手从记录里挑真正做成的事补上。")
    return week, notes


def tz_label(tz: timezone) -> str:
    off = tz.utcoffset(None)
    mins = int(off.total_seconds() // 60)
    return f"{'+' if mins >= 0 else '-'}{abs(mins) // 60:02d}:{abs(mins) % 60:02d}"


def parse_offset(s: str) -> timezone:
    m = re.fullmatch(r"([+-])(\d{1,2}):?(\d{2})?", s)
    if not m:
        raise argparse.ArgumentTypeError("时区写成 +08:00 这样")
    mins = int(m.group(2)) * 60 + int(m.group(3) or 0)
    return timezone(timedelta(minutes=mins if m.group(1) == "+" else -mins))


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(description="把 .ics 整理成 week.json")
    p.add_argument("files", nargs="+", help="日历文件，可以写成 文件.ics:分类")
    p.add_argument("--week-start", required=True, help="这周周一的日期 YYYY-MM-DD")
    p.add_argument("--utc-offset", type=parse_offset, default=parse_offset("+08:00"))
    p.add_argument("-o", "--out", type=Path)
    a = p.parse_args(argv)

    start = date.fromisoformat(a.week_start)
    if start.weekday() != 0:
        print(f"{start} 不是周一", file=sys.stderr)
        return 2
    paths = []
    for f in a.files:
        m = re.fullmatch(r"(.+?):(study|sport|sleep|life|star)", f)
        paths.append((Path(m.group(1)), m.group(2)) if m else (Path(f), None))
    week, notes = to_week(paths, start, a.utc_offset)
    text = json.dumps(week, ensure_ascii=False, indent=2)
    if a.out:
        a.out.write_text(text, encoding="utf-8")
        print(f"已写入 {a.out}")
    else:
        print(text)
    for n in notes:
        print("提示：" + n, file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
