# NowBuild 产品 PRD（GTM / Agent 体系）

**版本：** v1.1  
**日期：** 2026-07-30  
**产品代号：** NowBuild Agent Launch Team / 30 天冷启动团队  
**对齐文档：**  
- [NowBuild 商业计划书](./NowBuild%20商业计划书.md)（定位与商业）  
- [NowBuild 30 天冷启动产品交互 PRD](./NowBuild%2030天冷启动产品交互%20PRD.md)（**页面级交互唯一来源**）

---

## 0. 文档目的与范围

本文档定义 **产品定位、端到端主链路、Agent 编排与 Skill 治理**，供工程与 Prompt 维护使用。

| 主题 | 以哪份文档为准 |
|------|----------------|
| 官网定位 / 定价叙事 | 商业计划书 + 落地页组件 |
| 页面信息架构、Brief/Blueprint/日历交互 | **30 天冷启动交互 PRD** |
| Agent 角色、编排、Skill 映射、验收指标 | **本文** |

**v1.0 遗留说明：** 旧版「GTM Kickoff 问卷 → 战略确认 → 用户勾选 2–3 渠道」主链路已废弃。现网为 **免费 URL → Launch Brief → 付费组建全渠道团队**。

---

## 1. 产品概述

### 1.1 一句话

给 **已做出产品、但从没正经做过系统冷启动** 的独立开发者——一支 **30 天 Agent 冷启动团队**：先免费读懂产品，再把研究、策略、内容、社区、SEO、分发交给协同智能团队；用户每天约 30 分钟审核与发布。

### 1.2 核心命题

| 维度 | 定义 |
|------|------|
| **品类** | 30-Day Agent Launch Team（30 天冷启动 Agent 团队） |
| **Primary ICP** | Solo founder / indie maker：能 ship、不会 market |
| **北极星** | 30 天战役完成率（≥70% 任务完成） |
| **护城河** | 免费证明理解 + 共享产品认知 + 战役日历 GUI + 反馈进化 |
| **明确不做** | 写代码主路径、四位总监群聊、无人值守自动发布、保量广告、保证流量结果 |

### 1.3 与现网代码的关系

现网已具备：产品研究 → Launch Brief → 付费 → Campaign 队列（Blueprint / 渠道策略 / 日历）→ Command Center → 任务执行 → 周复盘，以及多渠道 Skill。

产品约束：

1. **唯一可见对话入口** = 右侧市场合伙人 / 冷启动合伙人（Launch Partner）  
2. **GUI 优先**：付费后默认冷启动工作台；对话用于纠正与改稿  
3. **渠道不由用户勾选**：`supportedChannels` 自动进入新 Campaign  
4. **付费门闩在 Brief 之后**：未付费仅开放 onboarding / 研究进度 / Brief  

---

## 2. 用户主链路

### 2.1 链路总览

```
[落地页 / 注册] → [粘贴产品 URL · 免费]
      ↓
[研究进度] → [Launch Brief · 可纠正 ≤20 次]
      ↓
[组建 30 天推广团队 · Paywall $49]
      ↓
[Campaign 队列 · Blueprint → 渠道策略 → 日历]
  （离开可能暂停；回页 ResumeOnReturn 续跑）
      ↓
[冷启动工作台 · 每日循环] ←→ [右侧 Agent 改稿]
      ↓
[周复盘] → [Day 30 报告] → [续费 / 下一轮]
```

### 2.2 分阶段详述

#### 阶段 0：进入产品

| 步骤 | 用户行为 | 系统行为 |
|------|----------|----------|
| 0.1 | 官网理解定位（冷启动团队 / organic-first） | Landing |
| 0.2 | 注册 / 登录 | Clerk → `/app` |
| 0.3 | 无产品则走 Starter 分流 | `/open-source-saas-starter` |

资格由官网 Qualifier + URL 可达性软过滤；**不做长问卷 Kickoff**。

#### 阶段 1：免费分析 → Launch Brief

| 步骤 | 用户看到 | 后台 |
|------|----------|------|
| 1.1 | 「把你的产品介绍给我们」+ URL +「免费分析」 | 校验公开 URL |
| 1.2 | 研究真实阶段进度（非假百分比） | Research / 产品档案 / 竞品 |
| 1.3 | `/app/brief` 展示 Brief | `phase = brief_ready` |
| 1.4 | 右侧纠正 Brief | 计入免费修改次数 |

**禁止：** Brief 生成后自动开始 Blueprint。

#### 阶段 2：付费组建团队

| 步骤 | 用户行为 | 系统行为 |
|------|----------|----------|
| 2.1 | 点击「组建我的 30 天推广团队」 | 打开 Paywall |
| 2.2 | Stripe 订阅成功 | `paid = true` |
| 2.3 | 进度页「正在组建 30 天 Agent Team」 | `CampaignBootstrap` 幂等入队 |
| 2.4 | 可离开；回来同步 | `ResumeOnReturn` + Worker |

#### 阶段 3：每日执行

- 默认首页：Launch Command Center（第 N 天、今日队列、渠道卡、目录进度）  
- 日历：Today / Week / Month，跨渠道合并时间线  
- 打开任务再生成当日内容；右侧 Agent 改稿  
- 发布 / 验证由用户确认；不存第三方密码  

#### 阶段 4：周复盘与 Day 30

- Day 7 / 14 / 21：Weekly Review，调整未来任务  
- Day 30：Launch Report + 下一轮建议  

---

## 3. Agent 体系

### 3.1 用户感知模型

```
用户
  ↕
右侧 Launch Partner（市场合伙人 / 冷启动合伙人）
  ├── Research Agent
  ├── Context Agent
  ├── Strategy Agent
  ├── Channel Agent × N
  ├── Content Agent
  ├── Directory Agent
  ├── Publishing 辅助
  └── Review Agent
```

用户 **不** 在多个 Agent 窗口间切换。后台专职 Agent 通过右侧同一入口服务。

### 3.2 后台角色职责

| Agent | 职责 | 主要产物 |
|-------|------|----------|
| Research | 读站、竞品、市场 | Research / 产品档案 |
| Context | 事实与用户纠正记忆 | Product Profile |
| Strategy | 统一战役目标与叙事 | Launch Brief、Blueprint |
| Channel × N | 渠道策略与 30 天计划 | Channel Plan、Tasks |
| Content | 单任务可发布稿 | Content Draft |
| Directory | 匹配目录、提交管线 | Submission Pipeline |
| Review | 周复盘与调历 | Weekly Review |

### 3.3 编排原则

1. 所有渠道共享同一 Brief / Blueprint / Pillars  
2. Channel Agent 只做平台转译，不各自发明定位  
3. Campaign 用数据库队列分步执行，幂等 `buildKey`  
4. 回页恢复为主路径；不假设离开后一定持续跑完  

### 3.4 与旧「六 Agent + Kickoff」映射

| 旧 PRD 名称 | 现网对应 |
|-------------|----------|
| Kickoff Agent / GTM 顾问 | Launch Partner + Research + Brief 流程 |
| Channel Router（用户勾选 2–3 渠道） | **废弃勾选**；全量 supported channels |
| Channel Strategist | Channel Agent 策略步 |
| Calendar Planner | Channel Agent 日历步 |
| Task Executor | Content / 任务打开时生成 |
| Weekly Reviewer | Review Agent |
| Orchestrator | Campaign Worker + `buildCampaignFromBrief` |

### 3.5 Skill 层

- 渠道 Skill 仍作为插件挂在 Channel Agent 下  
- 新渠道 = 新 Channel Agent + Skill；新 Launch 默认纳入  
- 进行中的 Launch 不强制插入；可由用户通过自然语言同意后补齐剩余天数  

具体 Skill 注册表以代码 `src/lib/agents/skills/*` 与 `SUPPORTED_LAUNCH_CHANNELS` 为准，本文不维护易过期的全量枚举。

---

## 4. 信息架构（摘要）

详细页面规格见 **30 天冷启动交互 PRD**。App 侧主要路由：

| 路由 | 用途 | 付费门 |
|------|------|--------|
| `/app` | Onboarding / Progress / Command Center | Brief 前免费 |
| `/app/brief` | Launch Brief | 免费可读；CTA 付费 |
| `/app/blueprint` | Campaign Blueprint | 付费 |
| `/app/calendar` | Launch Calendar | 付费 |
| `/app/channels/[id]` | Channel Workspace | 付费 |
| `/app/launch-kit` 等 | 目录资料 | 付费 |

AppShell：右侧常驻 Agent；未付费锁定执行面；挂载 `ResumeOnReturn` + `CampaignBootstrap` + Paywall。

---

## 5. MVP 边界

### 必须

- 免费 URL → Brief → Paywall → 全渠道 Campaign  
- 单一右侧 Agent 修改左侧产物  
- Command Center + Calendar + 基础 Directory Pipeline  
- Resume-on-return 与幂等队列  

### 不做

- 用户勾选 Launch Team / 多可见 Agent  
- 初始化强填社交账号、Logo、截图  
- Brief 后自动开 Blueprint（跳过付费）  
- 保证业务结果的 SLA  

---

## 6. 成功指标

| 指标 | 目标 | 说明 |
|------|------|------|
| URL → Brief | ≥ 85% | 免费漏斗可用性 |
| Brief → 付费 | ≥ 15% | 理解是否转化为购买 |
| 付费 → planReady | ≥ 90% | Worker / 回页恢复可靠性 |
| 7 日任务完成率 | ≥ 50% | GUI 是否驱动行动 |
| 30 日战役完成率 | ≥ 30% | 北极星前置 |

---

## 7. 验收场景（抽样）

1. **有落地页的小 SaaS：** 免费 Brief 准确度可纠正 → 付费后各渠道计划共享同一支柱  
2. **离开组建页再回来：** banner 同步，未完成步骤继续，不重复全量重做  
3. **未付费误进日历：** 被锁回 Brief / Paywall  
4. **无产品用户：** Starter 分流，不进入付费 Campaign  

---

## 8. 附录

### 8.1 代码映射（示意）

| 能力 | 代码位置（随重构可能变更） |
|------|----------------------------|
| 免费 Onboarding | `LaunchOnboarding.tsx` |
| Brief 页 / 付费 CTA | `app/.../brief/page.tsx` |
| 入队与轮询 | `CampaignBootstrap.tsx` |
| 回页恢复 | `ResumeOnReturn.tsx` |
| Worker 文档 | `docs/CAMPAIGN_WORKER.md` |
| 渠道策略 / 日历 | `runChannelStrategy` / `runChannelCalendar` 等 |
| Skill | `src/lib/agents/skills/*` |

### 8.2 对外定位语（与官网一致）

> **NowBuild**：为独立开发者而设的 30 天冷启动团队。  
> 产品已经上线。接下来，让市场看见它。  
> 先免费生成冷启动简报；确认后再组建完整推广团队。

---

**文档维护：** 定位/定价变更同步商业计划书与落地页；交互变更同步 30 天 PRD；Agent/Worker/Skill 变更同步本文 §3、§8。
