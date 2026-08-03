# 免费市场策略报告漏斗（2026-08-02）

本文档是当前免费体验、付费墙和 Directory 权限的产品事实来源；若旧 PRD 中的“免费 Launch Brief 后付费”与本文冲突，以本文为准。

## 核心策略

NowBuild 免费开放一份完整的《30 天市场策略报告》作为获客体验。报告合并原来的市场策略、渠道推荐和 Directory 提交规划，用户看完报告后才会遇到付费 CTA。

免费报告必须包含：

1. 产品、目标用户、痛点、差异化、启动条件和待验证假设。
2. 推荐渠道、推荐理由、市场适配、投入强度和具体频率。
3. Day 1–7、8–14、15–21、22–30 四阶段 Launch 发布计划。
4. Directory 资料准备、筛选标准、分批提交排期和 Launch 节点配合。
5. 指标、继续/调整/停止门槛，以及立即开始的三个动作。

## 用户路径与付费墙

1. 首页 CTA：免费获取 30 天市场策略报告。
2. 登录后，首选通过 Prompt 从 Codex、Claude Code、Lovable 等平台生成项目文档，并粘贴回 NowBuild。
3. 替代方案：输入公开产品网址，由 Research 读取网站并调研竞品。
4. 无产品用户可直接进入开源 SaaS Starter。
5. 用户粘贴的 Markdown 原样成为项目文档；系统可在内部提取结构化字段，但不得把派生摘要重复插到项目文档正文前面。
6. Promotion Plan Agent 开始后，右侧对话展示生成中状态和完整报告内容卡片；免费阶段不展示推荐渠道卡片。
7. 完整报告内容卡片之后展示“Build My Launch Agent Team” CTA。
8. 支付成功后不再追加 Quick Profile 问卷，直接展示渠道多选卡片；用户确认后生成对应渠道计划，随后进入 Todo。
9. 渠道多选卡片之后同时展示独立 Directory 内容卡片，点击进入付费后的个性化平台推荐页。
10. 付费后才生成逐日 Todo、渠道原生内容、发布材料、个性化 Directory 排名和自动提交任务。

项目文档页面不再触发付费墙。日历免费态保留执行预览，但 CTA 的含义是付费构建 Launch Agent Team，不是初始化产品。

## Directory 权限

- 免费：展示中性的通用 Directory 列表，可按平台、域名和标签搜索；不得出现产品匹配分、推荐理由、个性化排序或执行入口。
- 付费：服务端订阅状态确认后，才根据 Launch Brief 生成匹配列表，展示推荐层级、原因、风险、资料检查和提交队列。
- 免费报告可以解释 Directory 的战略角色与排期，但 Directory 工作区中的具体平台推荐属于付费执行能力。

## 报告存储约束

`market_strategy_reports` 是免费报告的不可变存储：

- 每个 `(project_id, launch_id)` 只允许一条记录。
- Promotion Plan Agent 完成全部字段后，一次性插入完整 `report` JSON 和 `report_markdown`。
- 不做流式、分段或增量数据库写入。
- 重试先读取已有记录；并发请求由唯一约束裁决，冲突请求返回第一条完整记录，不更新、不重复上传。

对应迁移：`supabase/migrations/20260802000000_add_market_strategy_reports.sql`。

部署兼容：若专用表尚未进入 Supabase/PostgREST schema cache，服务端会把同一份完整报告一次性写入现有 `agent_work_jobs.result_summary`，并使用唯一的 `(project_id, build_key)` 防止重复。后续读取会同时识别专用表和兼容记录，因此不会因迁移窗口重复生成或丢失报告。
