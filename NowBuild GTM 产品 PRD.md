# NowBuild GTM 行动台 — 产品 PRD

**版本：** v1.0  
**日期：** 2026-07-06  
**对齐文档：** [NowBuild 商业计划书](./NowBuild%20商业计划书.md)  
**产品代号：** NowBuild GTM 行动台 / First Launch OS  

---

## 0. 文档目的与范围

本文档定义 **用户交互主链路** 与 **Agent 体系设计**，作为 MVP 开发、UI 迭代与 Skill 治理的唯一产品规格来源。

**PRD 覆盖：**
- 目标用户与核心场景
- 端到端用户主链路（含页面级交互）
- Agent 角色、编排与 Skill 挂载规则
- 基于 Gingiris Skills 与现有代码库 Skill 的映射评估
- MVP 功能边界与数据模型要点
- 成功指标与验收标准

**PRD 不覆盖：** 技术架构详设、API Schema 全量、视觉稿像素级规范。

---

## 1. 产品概述

### 1.1 一句话

给 **用 AI 做出了产品、但从没正经做过市场推广** 的 Builder——一套 **30 天 GTM 行动台**：对话定策略，日历驱动每日执行，AI 预写内容，用户审核发布，轻量复盘驱动策略进化。

### 1.2 核心命题

| 维度 | 定义 |
|------|------|
| **品类** | GTM Execution OS（获客行动台） |
| **Primary ICP** | First-time Market Builder：大厂研发/PM 的 side project，能 ship、不会 market |
| **北极星指标** | 30 天战役完成率（≥70% 任务完成） |
| **护城河** | 策略绑定的行动日历 GUI + 内容预填 + 反馈进化闭环 |
| **明确不做** | 写代码、PRD 主路径、四位总监群聊、自动发布、全渠道全开 |

### 1.3 与现有代码库的关系

当前代码已有较完整的 GTM Agent 流水线（CMO 对话 → 渠道推荐 → 渠道策略 → 日历 → 任务执行 → 周复盘）及 **28 个渠道 Skill**。本 PRD 要求：

1. **产品入口收敛**：砍掉 CEO/产品/技术总监主路径，**唯一入口 = GTM Kickoff**
2. **GUI 优先**：「今日视图」为默认首页，对话为策略阶段专用
3. **Skill 分层启用**：MVP 仅激活 3–5 个渠道 Skill，其余注册可用但默认折叠
4. **Agent 编排简化**：用户感知 **1 个 GTM 顾问**，后台 **6 个专职 Agent 角色** + Skill 插件层

---

## 2. 用户主链路

### 2.1 链路总览

```
[落地/注册] → [资格门槛] → [GTM Kickoff] → [战略确认] → [生成日历]
      ↓
[今日视图 · 每日循环] ←→ [内容改稿对话]
      ↓
[每日复盘卡] → [第7天战报] → [第30天复盘] → [第二战役/续费]
```

### 2.2 分阶段详述

#### 阶段 0：进入产品（≤ 2 分钟）

**目标：** 过滤 Anti-Persona，建立「这是 GTM 行动台，不是创业大全套」的预期。

| 步骤 | 用户行为 | 系统行为 | 页面 |
|------|----------|----------|------|
| 0.1 | 从官网/广告进入 | 展示定位语 + 3 个资格问题 | Landing → 注册 |
| 0.2 | 注册/登录 | Clerk 认证 | `/sign-in` |
| 0.3 | 回答资格门槛（可卡片） | 若不满足：引导「先做出可展示产品再来」 | Onboarding Gate |

**资格门槛三问（卡片式，单选/多选）：**
1. 你是否 **已有可展示的产品**？（链接 / 截图 / Demo）→ 否 → 软拦截
2. 你是否 **从未系统做过 30 天推广**？→ 是 → 加分
3. 你是否 **愿意每天花 15–30 分钟执行推广**？→ 否 → 设预期

**MVP 可简化：** 仅问「产品链接」+「30 天目标」，无链接则允许继续但 Kickoff 首问必追 URL。

---

#### 阶段 1：GTM Kickoff — 策略对话（15–20 分钟）

**目标：** 收集足够上下文，合成 GTM 战略底座，推荐 2–3 个主渠道，用户确认后进入日历生成。

**用户感知：** 与 **一位 GTM 策略顾问** 对话；界面为 **聊天 + 嵌入式卡片**（非四位总监群聊）。

##### 1A. 快填卡片（3 分钟）

在对话流中插入 **结构化卡片**，减少打字：

| 字段 ID | 类型 | 选项示例 | 用途 |
|---------|------|----------|------|
| `productType` | 单选 | 工具 / 课程 / 咨询 / 社群 / 其他 | 路由 Skill 包 |
| `targetMarket` | 单选 | 国内 / 海外 / 都要 | 过滤 locale |
| `existingAssets` | 多选 | 落地页 / 小红书 / 公众号 / X / 无 | 任务 Day1 内容 |
| `dailyTimeBudget` | 单选 | 15min / 30min / 1h | 日历任务密度 |
| `contentPreference` | 多选 | 短帖 / 长文 / 视频口播 / 私信 | Task Executor 格式 |
| `productUrl` | 文本 | URL | website_copy 预检 |
| `thirtyDayGoal` | 单选+自定义 | 20 次咨询 / 100 UV / 10 付费 / 自定义 | 战略确认页目标 |

**交互规则：**
- 卡片提交后，Agent 用 2–3 句复述，再进入追问
- 已填字段不再重复问

##### 1B. Agent 动态追问（5–10 分钟，≤ 5 轮）

由 **Kickoff Agent** 根据卡片缺口动态生成，典型问题：

| 优先级 | 问题 | 触发条件 |
|--------|------|----------|
| P0 | 用一句话说，你和替代方案有什么不同？ | 始终 |
| P0 | 过去哪条内容（或用户反馈）数据最好？ | 有社媒账号 |
| P1 | 你最不想做哪种推广？ | 始终 |
| P1 | 目标用户会在哪个平台活跃？ | ICP 模糊 |
| P2 | 产品现在最大验证缺口是什么？ | 可选 Phase 0 |

**输出约束：** 每轮 Agent 回复 ≤ 150 字；不做成稿预览。

##### 1C. 渠道推荐卡片（系统生成 + 用户确认）

Kickoff 对话达到一定完整度后，**Channel Router** 触发 `runCmoRecommend`，展示：

```
┌─────────────────────────────────────────┐
│  📋 推荐作战方案                          │
│  ─────────────────────────────────────  │
│  第一波（立即执行）                        │
│  ☑ 小红书    — 你的 ICP 在此活跃          │
│  ☑ 朋友圈私域 — 咨询类转化路径短          │
│  ☐ 微信公众号 — 可选，长文深度            │
│                                         │
│  第二波（有信号后启动）                    │
│  ☐ Product Hunt — 海外 launch 时再开      │
│                                         │
│  Phase 0（若验证不足）                     │
│  ☐ 用户访谈 — 建议先跑 5 场               │
└─────────────────────────────────────────┘
```

**MVP 规则：**
- wave1 强制 **2–3 个渠道**，默认不超过 3
- Phase 0（user_interview / competitor_research）仅在 `validationGaps` 非空时 **置顶推荐**，不默认开启
- 用户可取消/替换渠道，但 wave1 至少保留 1 个

##### 1D. 战略确认页（2 分钟）

用户点击「确认并生成日历」前，展示 **一页纸摘要**（非黑盒）：

| 模块 | 内容示例 |
|------|----------|
| 🎯 30 天目标 | 获得 20 次有效咨询对话 |
| 📣 主战场 | 小红书 + 朋友圈私域 |
| 📅 节奏 | 每周 3 帖 + 2 次私信跟进 |
| 🚫 明确不做 | SEO、付费投放、PH（第二波） |
| 📊 成功信号 | L2：评论/私信；L3：咨询预约 |

用户必须点击 **「生成 30 天日历」** 才触发后台 batchStrategy + batchCalendar。

---

#### 阶段 2：日历生成（后台 1–3 分钟）

**目标：** 用户等待时看到进度，生成后可立即进入「今日」。

| 步骤 | 用户看到 | 后台 Agent |
|------|----------|------------|
| 2.1 | 全屏进度：「正在制定渠道策略… 1/3」 | Channel Strategist × N |
| 2.2 | 「正在排期 30 天任务… 2/3」 | Calendar Planner × N |
| 2.3 | 「正在预写今日内容… 3/3」 | Task Executor × 今日任务 |
| 2.4 | 进入 **今日视图** | phase → `execution` |

**合并规则（关键 GUI 设计）：**

多 channel 的 dailyTasks 按 `scheduledDate` / `dayIndex` **合并为一条时间线**，而非按渠道分 Tab。

```
今日 · 第 3 天 / 30 天
├── 09:00  小红书 · 发布笔记「我为什么做这个工具」     [查看内容]
├── 14:00  私域 · 朋友圈文案 + 3 个可私信对象思路       [查看内容]
└── 20:00  互动 · 回复昨日笔记评论 15 分钟             [标记完成]
```

---

#### 阶段 3：每日执行循环（核心留存链路）

**默认首页 = 今日视图** `/workspace/marketing/today`

##### 3A. 打开今日

| 元素 | 说明 |
|------|------|
| 进度条 | 第 N 天 / 30 天；本周完成率 |
| 任务列表 | 1–3 项，按建议时段排序 |
| 任务卡片 | 渠道 icon + 任务类型 + 一句话 brief + 状态 |
| CTA | 「查看内容」→ 内容面板 |

##### 3B. 审核 / 改稿

点击任务进入 **内容面板**（右栏或全屏）：

| 区域 | 内容 |
|------|------|
| 预填正文 | Task Executor 已生成的 deliverable（80% 完成度） |
| 操作 | 复制 / 编辑 / 「让 AI 改稿」 |
| 改稿对话 | **Content Editor Agent**（轻量，仅改当前 deliverable） |

**改稿对话示例：**
- 「更短一点，去掉销售感」
- 「加一个我周末做 side project 的真实故事」
- 「改成适合朋友圈的语气」

##### 3C. 发布与复盘（30 秒）

用户发布后点击 **「标记已发」**，弹出 **复盘卡**：

```
┌─ 今日复盘 ─────────────────────┐
│ 发出去了吗？  ✅已发  ⏭跳过  ❌没发 │
│                                │
│ 市场有反应吗？（可多选）          │
│ □ 没什么反应                    │
│ □ 点赞/收藏                     │
│ □ 评论/私信                     │
│ □ 点击链接/咨询                  │
│ □ 成交（可选填金额）              │
│                                │
│ 一句话感受：____________         │
│              [提交]             │
└────────────────────────────────┘
```

**状态回写：**
- 任务 status → `done` / `skipped`
- L2/L3 信号写入 `ChannelMetrics` 或 `TaskFeedback`
- 日历 UI：✓ 已发 / 🔥 有互动 / ⭐ 有转化

##### 3D. 月视图（ secondary ）

路径：`/workspace/marketing/calendar`

- 30 天网格，每天显示任务数与完成状态
- 点击某天 → 跳转该日任务列表
- 战略绑定：hover 显示「Day N · 小红书种草周 · 目标：建立信任」

---

#### 阶段 4：战报与策略进化

| 节点 | 触发 | 用户看到 | Agent |
|------|------|----------|-------|
| 第 7 天 | 定时 / 打开 App | **首周战报** 全屏摘要 | Weekly Reviewer |
| 第 14/21 天 | 同上 | 轻量进度提醒 | nudge only |
| 第 30 天 | 同上 | **月度复盘** + 续费/第二战役 | Weekly Reviewer + Kickoff |

**首周战报结构：**
1. 执行率（L1）：完成了多少任务
2. 市场信号（L2）：哪类内容有反应
3. 建议调整：下周多加/减少哪类任务
4. **用户确认** → 「应用调整」半自动更新日历（v1）；v2 全自动

---

#### 阶段 5：第二战役 / 续费

| 路径 | 条件 | 行为 |
|------|------|------|
| 续费同产品 | 30 天完成率 ≥ 50% | 新 30 天日历，可换 wave2 渠道 |
| 换渠道包 | 国内→海外 | 触发 PH + X Skill 包 |
| 流失挽回 | 7 日完成率 < 30% | 邮件：缩小任务量 + 1 对 1 Kickoff 精简版 |

---

### 2.3 用户主链路状态机

```
                    ┌──────────┐
                    │  kickoff │
                    └────┬─────┘
                         │ 战略确认
                    ┌────▼─────┐
                    │ strategy │  (batchStrategy)
                    └────┬─────┘
                         │ 生成任务
                    ┌────▼─────┐
                    │ calendar │  (batchCalendar)
                    └────┬─────┘
                         │
                    ┌────▼─────┐
         ┌──────────│ execution│◄────────┐
         │          └────┬─────┘         │
         │  每日复盘      │ 第7/30天      │ 应用调整
         │          ┌────▼─────┐         │
         └──────────│  review  │─────────┘
                    └──────────┘
```

对应代码 `GtmPhase`：`kickoff` → `strategy` → `calendar` → `execution` ↔ `review`

---

### 2.4 页面地图（MVP）

| 路由 | 名称 | 优先级 |
|------|------|--------|
| `/workspace/marketing` | Kickoff 对话（未完成时） | P0 |
| `/workspace/marketing/confirm` | 战略确认页 | P0 |
| `/workspace/marketing/today` | **今日视图（默认首页）** | P0 |
| `/workspace/marketing/calendar` | 30 天月视图 | P0 |
| `/workspace/marketing/tasks/[id]` | 任务详情 + 内容 + 改稿 | P0 |
| `/workspace/marketing/review/week-1` | 首周战报 | P0 |
| `/workspace/marketing/review/month-1` | 月度复盘 | P1 |
| ~~`/workspace`~~ | CEO 群聊 | **移除主路径** |
| ~~`/workspace/product`~~ | 产品总监 PRD | **移除主路径** |
| ~~`/workspace/tech`~~ | 技术总监 | **移除主路径** |
| `/workspace/marketing/dashboard` | 复杂 Dashboard | MVP 降级或隐藏 |

---

## 3. Agent 设计

### 3.1 设计原则

1. **用户只见一个顾问**，后台多角色分工（降低认知负担）
2. **Skill = 插件，Agent = 编排**；Agent 不背 28 个渠道方法论全文，按需 `loadSkill(channelId)`
3. **JSON 角色与对话角色分离**：规划类 Agent 输出结构化数据；对话类 Agent 输出自然语言
4. **Phase 0 与分发渠道同一流水线**，但任务类型与 deliverable 格式不同
5. **对齐 Gingiris**：战略层用 `go-to-market-playbook` 逻辑；渠道层用各 channel skill；路由层用 `growth-finder` 逻辑

### 3.2 Agent 架构总览

```
┌─────────────────────────────────────────────────────────────┐
│                    用户界面层                                 │
│   Kickoff 对话 │ 战略确认 │ 今日 │ 内容面板 │ 复盘 │ 战报    │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│              GTM Orchestrator（编排器，无 LLM 或轻量）         │
│   阶段路由 │ Skill 加载 │ 并行 batch │ 状态持久化              │
└───────────────────────────┬─────────────────────────────────┘
                            │
     ┌──────────────────────┼──────────────────────┐
     │                      │                      │
┌────▼────┐  ┌──────▼──────┐  ┌─────────▼─────────┐
│ Kickoff │  │  Channel    │  │    Execution     │
│  Agent  │  │  Router     │  │     Agents       │
│ (对话)  │  │  (推荐)     │  │                  │
└────┬────┘  └──────┬──────┘  └─────────┬─────────┘
     │              │                      │
     │         ┌────▼──────────────────────▼────┐
     │         │     Channel Strategist          │
     │         │     Calendar Planner            │
     │         │     Task Executor               │
     │         │     Content Editor              │
     │         │     Weekly Reviewer             │
     │         └──────────────┬──────────────────┘
     │                        │
     │              ┌─────────▼─────────┐
     │              │   Skill 插件层     │
     │              │  loadSkill(id)    │
     │              │  28 definitions   │
     │              └───────────────────┘
     └──────────────────────────────────┘
```

### 3.3 Agent 角色规格

#### Agent 1：Kickoff Agent（GTM 策略顾问 · 对话）

| 属性 | 规格 |
|------|------|
| **用户名称** | 「GTM 策略顾问」 |
| **代码 Prompt** | `CMO_KICKOFF_DIALOGUE_PROMPT`（需改版：去掉「四类项目文档」依赖，改为卡片+追问） |
| **输入** | 卡片字段、对话历史、可选 `productUrl` 抓取摘要 |
| **输出** | 自然语言；触发卡片组件 JSON |
| **挂载 Skill** | `go-to-market-playbook` 方法论摘要（内置 prompt，非 channel skill） |
| **不负责** | 渠道 JSON、成稿、日历 |

**改版要点（相对现有代码）：**
- 删除「用户已完成四类项目文档」前提
- 增加 **卡片协议**：`{ type: "card", cardId: "productType", ... }`
- 对话 5 轮上限后 **强制引导** 至渠道推荐

---

#### Agent 2：Channel Router（渠道推荐 · 结构化）

| 属性 | 规格 |
|------|------|
| **用户名称** | 无（系统卡片展示） |
| **代码 Prompt** | `CMO_RECOMMEND_PROMPT` |
| **输入** | Kickoff 全文 + 卡片字段 + 可选轻量 product context |
| **输出** | `CmoChannelRecommendation` JSON |
| **挂载 Skill** | **Growth Finder 逻辑**（见 3.5 节）：`getSkillRegistryMeta()` 全量注册表 + fit 矩阵 |
| **核心逻辑** | Gingiris GTM 五底座 → channel-market fit → wave1/wave2 |

**MVP 硬约束（产品层 override LLM）：**
```typescript
// MVP 国内包：LLM 推荐后 clamp
const MVP_CN_CHANNELS = ['xiaohongshu', 'wechat_official', 'user_outreach'];
// wave1 max 3; 若 LLM 输出 5 个，按 fit 截断
```

---

#### Agent 3：Channel Strategist（单渠道策略 · 结构化）

| 属性 | 规格 |
|------|------|
| **代码 Prompt** | `CHANNEL_STRATEGIST_PROMPT` |
| **输入** | 单 `channelId` + kickoff + 战略底座 + **`loadSkill(channelId)`** |
| **输出** | `ChannelStrategy` + `masterPlanMarkdown` |
| **并行** | `batchStrategy` 每渠道独立调用 |
| **Phase 0** | user_interview → 访谈计划；competitor_research → Battle Card 方向 |

---

#### Agent 4：Calendar Planner（日历规划 · 结构化）

| 属性 | 规格 |
|------|------|
| **代码 Prompt** | `CALENDAR_PLANNER_PROMPT` |
| **输入** | Channel Strategist 输出 + Skill cadence（`postsPerWeek`, `campaignDays`, `defaultTaskTypes`） |
| **输出** | `DailyTask[]`，`dayIndex` 1–30 |
| **规则** | 多 channel 任务由 Orchestrator **按 dayIndex 合并** 为统一时间线 |
| **任务密度** | 由 `dailyTimeBudget` 映射：15min→1 任务/天；30min→2；1h→3 |

---

#### Agent 5：Task Executor（内容生成 · 结构化）

| 属性 | 规格 |
|------|------|
| **代码 Prompt** | `buildTaskExecutorPrompt()` |
| **输入** | 单条 `DailyTask` + strategy 摘要 + **`loadSkill(channelId, { locale, templateId })`** |
| **输出** | `Deliverable` JSON |
| **触发时机** | 日历生成后 **预生成 Day1–Day3**；Day4+ **lazy load**（用户打开任务时） |
| **模板选择** | 从 Skill `templates[]` 按 `taskType` 匹配 |

---

#### Agent 6：Content Editor（改稿 · 对话）

| 属性 | 规格 |
|------|------|
| **用户名称** | 「改稿助手」 |
| **输入** | 当前 deliverable 全文 + 用户改稿指令 + channel 约束 |
| **输出** | 更新后的 deliverable 自然语言 / JSON |
| **挂载 Skill** | 仅 `loadSkill(channelId).reference` 中的格式约束（轻量） |
| **不负责** | 改战略、改日历 |

---

#### Agent 7：Weekly Reviewer（战报 · 结构化）

| 属性 | 规格 |
|------|------|
| **代码 Prompt** | `WEEKLY_REVIEWER_PROMPT` |
| **输入** | 任务完成率 + 用户复盘卡 L2/L3 + 各 channel metrics |
| **输出** | `WeeklyReview` + 日历调整建议 |
| **触发** | dayIndex === 7, 30 |
| **v1** | 调整建议需用户点击「应用」；写入 `adjustments` 字段 |

---

### 3.4 Orchestrator 职责（`buildGtmPlanFromChannels` 扩展）

| 职责 | 说明 |
|------|------|
| 阶段 gate | kickoff 未完成 → 不可进 today |
| Skill 加载 | `channelSkillId(channelId)` → `loadSkill` |
| 并行控制 | strategy 并行；calendar 并行；executor 限流（防 API 爆） |
| 时间线合并 | 多 channel `dailyTasks` → `UnifiedDayPlan[]` |
| 反馈闭环 | 复盘数据注入下一次 Reviewer / 可选 replan |

---

### 3.5 Skill 体系评估：Gingiris × 现有代码库

#### 3.5.1 Gingiris 41 Skills 分类（来源：gingiris.tools/skills）

| Gingiris 分类 | 数量 | 与 NowBuild 关系 |
|---------------|------|------------------|
| 🚀 Launch & PH | 8 | **战略层 + 第二波渠道**；MVP 仅 PH 预留 |
| 🔍 SEO & GEO | 2 | **extended**，30 天 first launch 默认 skip |
| 📈 B2B & SaaS | 5 | **extended**；ICP 为 B2B 时启用 linkedin-gtm |
| ⭐ Open Source | 5 | dev side project 专用包；MVP 可选 github-growth |
| 📱 Mobile & ASO | 2 | 仅 App 产品启用 |
| 🤝 Community & KOL | 9 | user_outreach / discord / ambassador 等 |
| 🎤 User Research | 2 | **Phase 0 核心** |
| 🌱 Startup Growth | 5 | 方法论来源，不直接暴露给用户 |
| 🧭 AI Agent & Meta | 2 | **Growth Finder → Channel Router** |

#### 3.5.2 现有代码库 28 Skill 映射表

| 层级 | channelId | skillId | 对应 Gingiris | MVP 国内 | MVP 海外 | Agent 挂载点 |
|------|-----------|---------|---------------|----------|----------|--------------|
| **Phase 0** | user_interview | user-interview-gtm | gingiris-user-interview | 按需 | 按需 | Strategist, Planner, Executor |
| **Phase 0** | competitor_research | competitor-research-gtm | competitor-research-playbook | 按需 | 按需 | 同上 |
| **P0 分发** | xiaohongshu | xiaohongshu-gtm | （Gingiris 无独立 XHS，自研） | ✅ 默认 | — | 全执行链 |
| **P0 分发** | wechat_official | wechat-official-gtm | 私域/公众号逻辑 | ✅ 可选 | — | 全执行链 |
| **P0 分发** | user_outreach | user-outreach-gtm | kol-outreach / gingiris-kol-outreach | ✅ 私域 | ✅ | Executor 为主 |
| **P1 海外** | product_hunt | product-hunt-gtm | product-hunt-playbook 等 3 个 | 第二波 | ✅ wave1 | 全执行链 |
| **P1 海外** | twitter_x | twitter-x-gtm | gingiris-twitter-agent-ops | 第二波 | ✅ wave1 | 全执行链 |
| **P1 海外** | community_hn_ih | community-hn-ih-gtm | open-source-marketing 部分 | 可选 | ✅ | 全执行链 |
| **P1 海外** | reddit | reddit-gtm | gingiris-reddit-marketing | — | 第二波 | 全执行链 |
| **P1** | website_copy | website-copy-gtm | gr-readme / landing 逻辑 | Day1 优化 | Day1 | Strategist, Executor |
| **P2** | linkedin | linkedin-gtm | b2b-marketing-playbook | B2B 时 | B2B 时 | 全执行链 |
| **P2** | content_seo | content-seo-gtm | gingiris-seo-geo | skip MVP | skip MVP | — |
| **P2** | youtube_shorts | youtube-gtm | — | 低 | 中 | 全执行链 |
| **P2** | newsletter | newsletter-gtm | — | 低 | 中 | 全执行链 |
| **extended** | github_growth | github-growth-gtm | gingiris-opensource 等 | 开源时 | 开源时 | 全执行链 |
| **extended** | douyin/tiktok/... | 各 extended | 各对应 Gingiris | 按产品形态 | 按产品形态 | 按需 |

#### 3.5.3 Skill 不应直接等于 Agent

**错误模型：** 28 个 Skill = 28 个对话 Agent → 用户迷失

**正确模型：**

```
Skill = 渠道方法论 + 模板 + 节奏参数（数据插件）
Agent = 通用角色 × loadSkill(当前 channelId)
```

同一 **Task Executor** 加载 `xiaohongshu-gtm` 产出笔记；加载 `twitter-x-gtm` 产出 thread——**角色不变，Skill 变**。

#### 3.5.4 Growth Finder 式路由（Channel Router 内置逻辑）

参考 Gingiris `gingiris-growth-finder`，在 Router 层实现 **规则 + LLM** 混合：

```
输入：productType, targetMarket, existingAssets, validationGaps
      ↓
规则层（确定性）：
  - validationGaps 非空 → 强制 Phase 0 占 wave1 前 1–2 位
  - productType=App → 推荐 aso-gtm
  - productType=开源 → 推荐 github-growth-gtm, community-hn-ih-gtm
  - targetMarket=国内 → 过滤 locales 不含 zh 的 skill
  - dailyTimeBudget=15min → wave1 最多 2 channel
      ↓
LLM 层：对剩余 channel 做 fit 评分 + 理由
      ↓
产品层 clamp：MVP 国内最多 3 channel
```

#### 3.5.5 MVP Skill 激活清单

**默认激活（国内 First Launch Pack）：**

| 顺序 | Skill | 战役角色 |
|------|-------|----------|
| 1 | xiaohongshu-gtm | 公域种草 + 故事 |
| 2 | user-outreach-gtm | 私域私信 / 朋友圈 |
| 3 | website-copy-gtm | Day1 落地页 Hero 优化（prep 任务） |

**可选激活：**
- wechat-official-gtm（长文深度）
- user-interview-gtm（验证不足时 Phase 0）

**注册但不展示（Kickoff UI 折叠「更多渠道」）：**
- 其余 22+ skills

**海外 Launch Pack（v2）：**
- product-hunt-gtm + twitter-x-gtm + website-copy-gtm + community-hn-ih-gtm

---

### 3.6 Agent × 用户阶段对照矩阵

| 用户阶段 | 可见 Agent | 后台 Agent | 加载 Skill |
|----------|------------|------------|------------|
| 资格门槛 | — | — | — |
| Kickoff 卡片 | 策略顾问 | Kickoff | GTM playbook 摘要 |
| Kickoff 追问 | 策略顾问 | Kickoff | — |
| 渠道推荐 | — | Channel Router | Registry meta |
| 战略确认 | — | — | — |
| 生成日历 | 进度 UI | Strategist + Planner + Executor(D1-3) | 各 channel skill |
| 今日任务 | — | — | — |
| 查看内容 | — | — | — |
| 改稿 | 改稿助手 | Content Editor | channel reference |
| 复盘 | — | — | — |
| 第7天战报 | 策略顾问（解读） | Weekly Reviewer | 高表现 channel skill 摘要 |
| 第30天 | 策略顾问 | Weekly Reviewer + Kickoff | 可选新 channel pack |

---

### 3.7 Prompt / Skill 治理建议

| 项 | 现状 | PRD 要求 |
|----|------|----------|
| CMO 对话依赖 PRD | 依赖四类文档 | Kickoff 自给自足，文档降为可选 enrich |
| 渠道数量 | UI 展示 14+ | MVP 展示 3+「更多」 |
| campaignDurationDays | 默认 14 | **统一 30 天** |
| Phase 0 | 与分发并列 | UI 上单独区块「建议先验证」 |
| Skill 版本 | 2.0.0 | 变更走 registry，Reviewer 可提示「策略已更新」 |

---

## 4. 关键交互规格

### 4.1 Kickoff 对话协议（UI ↔ Agent）

Agent 可在回复中嵌入机器可读块（或由后端单独返回 `uiActions`）：

```typescript
type KickoffUiAction =
  | { type: 'card'; cardId: string; payload: Record<string, unknown> }
  | { type: 'channel_recommendation'; data: CmoChannelRecommendation }
  | { type: 'navigate'; path: '/workspace/marketing/confirm' }
  | { type: 'generate_calendar'; kickoff: GtmKickoff };
```

### 4.2 任务状态机

```
pending → in_progress → done
                    ↘ skipped
```

复盘卡提交 → 自动 `done`；未发选 ❌ → `skipped`（计入完成率时分母处理需产品定义：skipped 不算完成但不惩罚过多）

### 4.3 效果追踪（MVP 手动）

```typescript
interface TaskFeedback {
  taskId: string;
  published: boolean;
  signals: ('none' | 'engagement' | 'comment_dm' | 'click_lead' | 'conversion')[];
  conversionNote?: string;
  feelingNote?: string;
  submittedAt: number;
}
```

---

## 5. 数据模型要点（与现有 `GtmState` 对齐）

| 实体 | 变更 |
|------|------|
| `GtmKickoff.campaignDurationDays` | 默认 **30** |
| `GtmState.phase` | 新增用户可见：`confirm`（战略确认） |
| `UnifiedDayPlan` | **新增**：合并多 channel 的日视图 |
| `TaskFeedback` | **新增**：复盘卡 |
| `ProjectDocuments` | Kickoff **不再强依赖**；可选从 URL 解析 enrich |

---

## 6. MVP 范围与排期建议

### 6.1 Must Have（P0，12 周）

- [ ] 资格门槛 / 简化 Onboarding
- [ ] Kickoff：卡片 + 对话 + 渠道推荐 + 战略确认
- [ ] batchStrategy + batchCalendar（30 天）
- [ ] 今日视图 + 任务详情 + 预填内容
- [ ] Content Editor 改稿
- [ ] 复盘卡 L1/L2/L3
- [ ] 首周战报
- [ ] Skill 包：小红书 + 私域 outreach + website_copy
- [ ] 移除/隐藏 CEO·产品·技术主路径

### 6.2 Should Have（P1）

- [ ] 月视图日历
- [ ] 战报后 semi-auto 日历调整
- [ ] 海外 Pack：PH + X
- [ ] Phase 0：user_interview skill 完整 UI

### 6.3 Won't Have（MVP）

- 自动发布、平台 API、GA 接入
- 15 渠道全开
- 四位总监群聊
- PRD 生成主路径

---

## 7. 成功指标与验收

| 指标 | 目标 | 验收方式 |
|------|------|----------|
| Kickoff → 生成日历 | ≥ 80% | 漏斗 |
| 7 日任务完成率 | ≥ 50% | L1 |
| 7 日内 ≥1 次 L2 反馈 | ≥ 40% | 复盘卡 |
| Day1 内容「可直接发」满意度 | ≥ 4/5 | 任务内 micro-survey |
| 首周战报打开率 | ≥ 60% | 埋点 |

**体验验收场景（必测）：**

1. **大厂后端 side project**：国内、小红书+私域、30 天、Day1 有预填笔记和朋友圈文案  
2. **验证不足产品**：Kickoff 推荐 user_interview 置顶，日历前 7 天以 research/prep 为主  
3. **7 天 0 转化**：战报强调 L2、建议调整内容类型，用户仍看到价值  

---

## 8. 附录

### 8.1 现有代码映射

| PRD Agent | 代码位置 |
|-----------|----------|
| Kickoff | `CMO_KICKOFF_DIALOGUE_PROMPT`, `runKickoffFromChat` |
| Channel Router | `CMO_RECOMMEND_PROMPT`, `runCmoRecommend` |
| Channel Strategist | `CHANNEL_STRATEGIST_PROMPT`, `runChannelStrategy` |
| Calendar Planner | `CALENDAR_PLANNER_PROMPT`, `runChannelCalendar` |
| Task Executor | `buildTaskExecutorPrompt`, execute-task route |
| Weekly Reviewer | `WEEKLY_REVIEWER_PROMPT`, review route |
| Orchestrator | `buildGtmPlanFromChannels`, `gtm/service.ts` |
| Skill 层 | `src/lib/agents/skills/*` |

### 8.2 对外定位语（与 PRD 一致）

> **NowBuild**：产品做完了，不知道下一步怎么推广？  
> 30 天获客日历——AI 写好每天要发的内容，你只管审核和发布。

---

**文档维护：** 产品战略、Skill 注册表或 Agent Prompt 变更时，同步更新本文档 §2、§3.5、§6。
