# 给 AI 助手的说明

这个仓库是一个 Agent Skills 格式的 skill：`weekly-report/`。

- 用户要「出周报」时，读 `weekly-report/SKILL.md` 并照做。
- 生成页面：`python weekly-report/scripts/build.py <week.json> weekly-report/themes/<主题> -o <输出.html>`。
- 改代码后跑 `python -m unittest discover tests`；改了页面，用 `tools/shoot.mjs`（截图、查横向滚动）和 `tools/interact.mjs`（把交互点一遍）检查。
