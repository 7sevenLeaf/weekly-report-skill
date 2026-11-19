# week.json 格式

一份 `week.json` 就是一周。`scripts/build.py` 读它和一个主题文件夹，生成单文件网页。

**原则：没有记录就留空（`null` 或不写这一块），不编数据。** 解读类的字段（情绪读法、评价）页面上会标明是助手的读法。

## 总览

```json
{
  "meta": {...},          // 必填
  "core": [...],          // 必填：核心数据，2–4 项
  "achievements": [...],  // 必填：本周成就，1–6 件
  "timeline": [...],      // 可选：一周时间线
  "goals": [...],         // 可选：目标对账
  "mood": {...},          // 可选：情绪起伏
  "quotes": [...],        // 可选：值得记住的话
  "review": {...},        // 可选：复盘
  "letter": {...}         // 可选：给这一周的一封信
}
```

页面按上面的顺序排。封面、核心数据、本周成就固定在前三；其余模块有数据才出现。

有 `timeline` 时，页面还会自动算出两块，不用另外写数据：

- **时间花在哪**：一周 168 小时按类别切开的堆叠条，没记录的部分单独列出，不猜。
- **专注时段**（主题打开 `extras: ["heat"]` 时）：7 天 × 24 小时，学习和高光按小时累计。

`goals` 的 `result` 写成「3 / 4 次」这种形式时，会自动画进度条。

## meta

| 字段 | 必填 | 说明 |
|---|---|---|
| `title` | 是 | 一般就是「个人周报」 |
| `week` | 是 | 第几周（数字） |
| `start`、`end` | 是 | 周一、周日的日期，`YYYY-MM-DD` |
| `name` | 否 | 称呼，出现在封面和信的抬头 |
| `reader` | 否 | 写分析的人自称什么，默认「助手」 |
| `source` | 是 | 数据来源，一句话，印在页脚 |
| `fictional` | 否 | `true` 时页面顶部和页脚标明「示例数据，人物虚构」 |

## core：核心数据

```json
{ "key": "study", "label": "有效学习", "kind": "hours",
  "value": 31.5, "goal": 35, "prev": 28,
  "daily": [4, 5.5, 6, 3, 8, 0, 5], "note": "周六休息" }
```

- `kind`：`hours`（显示成 `31h30`）、`count`（次数）、`avg_hours`（平均睡眠这类）。
- `daily`：周一到周日 7 个值；没记的那天写 `null`，页面显示「没记」。
- `goal`、`prev`、`note` 都可以不写；不写就不比。
- `daily_goal`：每天的目标（比如每天学 6 小时），柱状图上画一条虚线。`avg_hours` 直接用 `goal` 画线。

## achievements：本周成就

```json
{ "big": "满分", "what": "概率论机考", "when": "周一",
  "detail": "考前模拟 4 次，最后一次 25 分钟全对。",
  "say": "满分不稀奇，稀奇的是你知道它是怎么来的。",
  "figure": "<svg viewBox='0 0 300 120'>…</svg>" }
```

- `big`：页面上最大的那个字或数，2–6 个字最好看。
- `detail`：发生了什么，用真实数据。`say`：评价，一两句。
- `figure`：这件事自己的小画（可选），一段 SVG，`viewBox` 宽 300。用主题的颜色变量（`var(--accent)` 等），不要写死颜色。

## timeline：一周时间线

```json
{ "day": 0, "start": "08:30", "end": "10:10", "cat": "study", "text": "马原期中", "icon": "pen" }
```

- `day`：0 是周一，6 是周日。跨过零点的事拆成两条。
- `cat`：`study`、`sport`、`sleep`、`life`（个人）、`star`（高光时刻）之一。
- `icon`：见下面的图标表，可以不写。睡眠不用写 `text`。

图标：`study` `book` `math` `code` `lab` `pen` `music` `sing` `run` `gym` `ball` `swim` `bike` `sleep` `heart` `game` `star` `trip` `meet`。也可以直接写一个字符，比如 `"∑"`。

## goals：目标对账

```json
{ "name": "健身", "result": "3 / 4 次", "status": "partial",
  "good": "三次力量训练都做了。", "gap": "周四没练。" }
```

`status`：`done`（达成）、`partial`（部分）、`moved`（主动调整）、`missed`（没做）。先写 `good`，再写 `gap`。

## mood：情绪起伏

```json
{ "source": "read",
  "days": [ { "level": 4, "quote": "终于学明白了。", "reading": "那个「终于」里有松一口气。" }, … 7 天 ] }
```

- `source`：`read` 表示助手从当天的话和做的事读出来的；`self` 表示本人打的分。混着有就逐天写 `"by": "self"`。
- `level`：1–5；读不出来写 `null`。`quote` 必须是本人原话，没有就不写。

## quotes：值得记住的话

```json
{ "text": "无效的学习时间不能记。", "when": "周六", "after": "后来成了记录的规矩。" }
```

只选感悟、想法、立下的规矩，不选进度汇报。`after` 写后来怎么样了，没有就不写。
`note` 是助手对这句话的一句走心评价（可选），会显示在卡片下面。

## review：复盘

```json
{ "good": ["…"], "improve": ["…"], "next": ["…", "…", "…"] }
```

## letter：一封信

```json
{ "title": "写给这一周", "paragraphs": [{ "tag": "学习", "text": "…" }, { "tag": "身体", "text": "…" }], "sign": "助手" }
```
