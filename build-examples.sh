#!/bin/sh
# 重新生成全部示例：数据文件 → 主题 → examples/<主题>.html
set -e
cd "$(dirname "$0")"
b() { python weekly-report/scripts/build.py "examples/week-$1.json" "weekly-report/themes/$2" -o "examples/$2.html"; }
b midterm exam
b midterm swiss
b show vinyl
b hackathon terminal
b midterm cloud
