"""脚本测试：python -m unittest discover tests"""
import json
import sys
import tempfile
import unittest
from datetime import date, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "weekly-report" / "scripts"))

import build  # noqa: E402
import ics_to_week as ics  # noqa: E402

BJ = timezone(timedelta(hours=8))
ICS = """BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTSTART:20270315T003000Z
DTEND:20270315T023000Z
SUMMARY:复习有机化学
END:VEVENT
BEGIN:VEVENT
DTSTART;TZID=Asia/Shanghai:20270315T230000
DTEND;TZID=Asia/Shanghai:20270316T070000
SUMMARY:睡觉
END:VEVENT
BEGIN:VEVENT
DTSTART;TZID=Asia/Shanghai:20270316T180000
DURATION:PT1H
SUMMARY:夜跑 5 公里
END:VEVENT
BEGIN:VEVENT
DTSTART;VALUE=DATE:20270317
DTEND;VALUE=DATE:20270318
SUMMARY:乐队演出
END:VEVENT
BEGIN:VEVENT
DTSTART:20270322T010000Z
DTEND:20270322T020000Z
SUMMARY:下周的课
END:VEVENT
BEGIN:VEVENT
DTSTART;TZID=Asia/Shanghai:20270319T200000
DTEND;TZID=Asia/Shanghai:20270319T213000
SUMMARY:吉他练习，
 加了一段 solo
END:VEVENT
END:VCALENDAR
"""


def minimal_week():
    return {
        "meta": {"title": "个人周报", "week": 11, "start": "2027-03-15", "end": "2027-03-21", "source": "测试"},
        "core": [{"key": "study", "label": "学习", "kind": "hours", "value": 3, "daily": [1, 2, 0, 0, 0, 0, None]}],
        "achievements": [{"big": "满分", "what": "考试"}],
    }


class IcsTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.path = Path(self.tmp.name) / "cal.ics"
        self.path.write_text(ICS, encoding="utf-8")
        self.week, self.notes = ics.to_week([(self.path, None)], date(2027, 3, 15), BJ)

    def tearDown(self):
        self.tmp.cleanup()

    def test_sample_calendar_matches_example_week(self):
        """仓库里的示例日历，整理出来要和示例周的时间线、学习时长对得上。"""
        week, _ = ics.to_week([(ROOT / "examples" / "week-midterm.ics", None)], date(2027, 4, 12), BJ)
        ref = json.loads((ROOT / "examples" / "week-midterm.json").read_text(encoding="utf-8"))
        self.assertEqual(len(week["timeline"]), len(ref["timeline"]))
        self.assertEqual([e["cat"] for e in week["timeline"]], [e["cat"] for e in ref["timeline"]])
        study = {c["key"]: c for c in week["core"]}["study"]
        self.assertEqual(study["value"], 32)

    def test_utc_converted_to_beijing(self):
        ev = [e for e in self.week["timeline"] if e.get("text") == "复习有机化学"][0]
        self.assertEqual((ev["day"], ev["start"], ev["end"], ev["cat"]), (0, "08:30", "10:30", "study"))

    def test_sleep_split_at_midnight_and_counted_on_wake_day(self):
        pieces = [e for e in self.week["timeline"] if e["cat"] == "sleep"]
        self.assertEqual([(p["day"], p["start"], p["end"]) for p in pieces], [(0, "23:00", "24:00"), (1, "00:00", "07:00")])
        sleep = [c for c in self.week["core"] if c["key"] == "sleep"][0]
        self.assertEqual(sleep["daily"][1], 8.0)
        self.assertIsNone(sleep["daily"][0])
        self.assertIn("note", sleep)

    def test_duration_and_sport_count(self):
        sport = [c for c in self.week["core"] if c["key"] == "sport"][0]
        self.assertEqual(sport["daily"], [0, 1, 0, 0, 0, 0, 0])
        ev = [e for e in self.week["timeline"] if e["cat"] == "sport"][0]
        self.assertEqual((ev["start"], ev["end"], ev["icon"]), ("18:00", "19:00", "run"))

    def test_folded_line_and_escaped_comma(self):
        ev = [e for e in self.week["timeline"] if e.get("text", "").startswith("吉他")][0]
        self.assertEqual(ev["text"], "吉他练习，加了一段 solo")
        self.assertEqual(ev["icon"], "music")

    def test_allday_kept_aside_and_next_week_dropped(self):
        self.assertEqual(self.week["allday_events"], [{"day": 2, "text": "乐队演出", "cat": "life"}])
        self.assertFalse(any(e.get("text") == "下周的课" for e in self.week["timeline"]))

    def test_forced_category(self):
        week, _ = ics.to_week([(self.path, "study")], date(2027, 3, 15), BJ)
        self.assertTrue(all(e["cat"] == "study" for e in week["timeline"]))

    def test_output_needs_achievements_before_build(self):
        errs = build.validate(self.week)
        self.assertTrue(any("achievements" in e for e in errs))
        self.week["achievements"] = [{"big": "5km", "what": "夜跑"}]
        self.assertEqual(build.validate(self.week), [])

    def test_cli_rejects_non_monday(self):
        self.assertEqual(ics.main([str(self.path), "--week-start", "2027-03-16"]), 2)


class BuildTest(unittest.TestCase):
    def test_minimal_week_is_valid(self):
        self.assertEqual(build.validate(minimal_week()), [])

    def test_catches_common_mistakes(self):
        w = minimal_week()
        w["core"][0]["daily"] = [1, 2]
        w["timeline"] = [{"day": 7, "start": "23:00", "end": "01:00", "cat": "work", "text": "x"}]
        w["goals"] = [{"name": "健身", "status": "half"}]
        w["mood"] = {"source": "guess", "days": [{"level": 9}]}
        w["achievements"][0]["figure"] = "<svg onload='x()'></svg>"
        errs = "\n".join(build.validate(w))
        for frag in ("daily 要正好 7 个值", "day 是 0", "跨零点", "cat 只能是", "status 只能是", "mood.days 要正好 7 天",
                     "mood.source", "level 是 1–5", "不能有脚本"):
            self.assertIn(frag, errs)

    def test_letter_paragraph_forms(self):
        w = minimal_week()
        w["letter"] = {"paragraphs": ["一句话", {"tag": "学习", "text": "按方面写"}]}
        self.assertEqual(build.validate(w), [])
        w["letter"]["paragraphs"].append({"tag": "空的"})
        self.assertTrue(any("letter.paragraphs[2]" in e for e in build.validate(w)))

    def test_build_inlines_everything(self):
        theme = ROOT / "weekly-report" / "themes" / "exam"
        page = build.build(minimal_week(), build.load_theme(theme))
        self.assertIn('<script type="application/json" id="week">', page)
        self.assertIn("WR_THEME", page)
        self.assertNotIn('src="', page.split("<body>")[1])  # 不引外部脚本

    def test_data_cannot_close_script_tag(self):
        w = minimal_week()
        w["achievements"][0]["what"] = "</script><script>alert(1)</script>"
        page = build.build(w, build.load_theme(ROOT / "weekly-report" / "themes" / "exam"))
        data = page.split('id="week">')[1].split("</script>")[0]
        self.assertEqual(json.loads(data)["achievements"][0]["what"], w["achievements"][0]["what"])

    def test_examples_are_valid(self):
        for f in sorted((ROOT / "examples").glob("*.json")):
            with self.subTest(f=f.name):
                self.assertEqual(build.validate(json.loads(f.read_text(encoding="utf-8"))), [])


if __name__ == "__main__":
    unittest.main()
