---
name: weekly-report
description: 把一周的记录（日历、.ics 文件、或者用户贴的一段本周记录）做成一份每周换主题、手机上好看、可以点的个人周报网页。用于「出周报」「做这周的周报」「周复盘做成网页」这类请求。
---

# 个人周报

把这一周变成一份**单文件网页**：封面、核心数据、本周成就固定在前三，其余模块有数据才出现。每周一个主题，从这周的内容里长出来。

## 铁规矩

1. **不编数据。** 没有记录就留空（`null` 或整块不写）。解读要标明是解读：页面会自动写「助手读到的」（称呼来自 `meta.reader`）。
2. **情绪是读出来的，要说清楚。** 用户自己打过分的那天以用户为准。引用的话必须是用户原话。
3. **不要「一句话定调」**：不要在开头放一句总结全周的金句。让成就和数据自己说话。
4. **一件事只说一次。** 同一个数字不要在封面、成就、复盘、信里反复出现。

## 步骤

### 1. 收输入

按用户手里有什么来：

| 用户给了 | 做法 |
|---|---|
| 一个或几个 `.ics` 文件 | `python scripts/ics_to_week.py 文件.ics --week-start 周一日期 -o week.json`。日历分了类就写成 `学习.ics:study` |
| 连上了日历（连接器） | 读这周的事件，按 [references/data.md](references/data.md) 自己写 `timeline` 和 `core` |
| 一段文字记录 | 从文字里整理；时间不全就不写 `timeline`，只写能确定的 |

问一次就够：这周的目标是什么（用来对账）、有没有想放进去的原话。不知道就不写 `goals` 和 `quotes`。

### 2. 写内容

在 `week.json` 里补上助手要写的部分，规则见 [references/writing.md](references/writing.md)：

- `achievements`：1–6 件**真正做成的事**，每件配一张自己的小画（`figure`，SVG）。
- `goals`：先写做成的，再写差在哪。
- `mood`：七天的起伏，原话 + 你的读法。
- `quotes`、`review`、`letter`：可选。

### 3. 定主题

读完这一周再定。主题是**一个比喻**，整页都在这个比喻里：

- 现成的主题在 `themes/`：`cloud`（云白沉浸版：滑动就是这一周在过去，每天按当天的主角换色调、场景、转场和数据面板，默认首选）、`swiss`（编辑部：任何一周都合适，冷静清楚）、`exam`（考卷：考试周）、`vinyl`（唱片：演出、创作、节奏强的一周）、`terminal`（终端：写代码、做项目的一周）。
- 都不贴切就新做一个：复制一个主题文件夹，改 `theme.json`、`theme.css`、`theme.js`。做法见 [references/design.md](references/design.md)。
- 用过的主题记进用户目录下的 `themes-used.md`，同一个用户不要连着两周用同一个。

### 4. 出页面

```bash
python scripts/build.py week.json themes/<主题> -o 周报.html
```

脚本会先检查数据，有问题会用中文列出来，改好再出。

### 5. 检查再交

- 用浏览器在 **400px 宽**和**宽屏**各看一遍：没有横向滚动、没有报错、封面第一屏就能看到三个核心数字。
- 对照 [references/design.md](references/design.md) 最后的「交付前检查」。
- 交给用户时说一句这周的亮点，附上文件或链接。

## 文件

- `scripts/build.py`：检查数据并拼成网页（只用 Python 标准库）
- `scripts/ics_to_week.py`：`.ics` → `week.json` 的数据部分
- `assets/kit.js`、`assets/kit.css`：页面套件，所有主题共用
- `themes/`：主题
- `references/data.md`：`week.json` 格式
- `references/writing.md`：内容怎么写
- `references/design.md`：主题怎么做、交付前检查
