# NowBuild 30 天冷启动产品交互 PRD

**版本：** v2.0  
**日期：** 2026-07-22  
**产品定位：** 面向 Solo Founder / OPC 的 30 天新产品冷启动执行系统  
**文档状态：** 已确认产品方向，作为后续交互与开发实施依据  
**关联旧文档：** [NowBuild GTM 产品 PRD](./NowBuild%20GTM%20产品%20PRD.md)

---

## 0. 文档目的

本文档重新定义 NowBuild 支付后的完整产品体验。

本次改版不再把 NowBuild 表达为一套抽象的 GTM 策略工具，而是把它定义为一支持续工作 30 天的 AI 冷启动团队：系统先理解用户的产品和竞争环境，再建立统一的 30-Day Campaign Launch Blueprint，并自动为每一个已支持渠道创建专属 Channel Agent、渠道策略、30 天执行计划和每日交付。

本文档用于约束：

- 支付后的端到端用户流程；
- 页面信息架构；
- 右侧常驻 Agent 的交互规则；
- Strategy Agent、Channel Agent 与用户可见 Agent 的关系；
- Launch Brief、Launch Blueprint、Launch Calendar、Weekly Review 等核心对象；
- Directory Submission Agent 的特殊交互；
- 现有功能的保留、改造和新增范围；
- 分阶段开发计划与验收标准。

本文档不定义官网销售页文案、像素级视觉稿、第三方渠道的完整技术实现细节。

---

## 1. 已确认的产品原则

以下原则是本次产品交互的硬约束，后续设计与开发不得偏离。

### 1.1 产品只服务一个明确任务

NowBuild 的核心任务是：

> 在 30 天内，尽可能把用户的新产品有策略地分发到所有 NowBuild 已支持的内容渠道、搜索渠道和产品目录。

产品不要求用户先学习营销方法，也不要求用户自己组建渠道组合。NowBuild 负责完成渠道判断、Campaign 设计、内容规划和执行准备。

### 1.2 初始化只需要产品链接

首次初始化不要求用户提供：

- Founder 社交账号；
- 已有内容渠道；
- Logo；
- 产品截图。

首屏唯一必填信息是产品 URL。

系统从网站中自动提取产品名称、定位、功能、用户、定价、页面信息和公开素材。缺失信息不通过长问卷补齐，而由右侧 Agent 在确有必要时通过自然对话追问。

Logo、截图等资产只有在某个执行任务确实需要时才处理。例如 Directory Agent 准备某个目录提交时发现必须上传 Logo，才在任务上下文中请求用户提供，或尝试从网站公开资源中提取。

### 1.3 不让用户选择 Launch Team

调研完成后不展示渠道勾选器，不要求用户选择 X、Reddit、LinkedIn、SEO 或 Directory Agent。

Strategy Agent 在确定统一 Campaign 目标后，自动为所有当前已支持的渠道生成渠道计划。NowBuild 每增加一个渠道能力，该渠道即可自动加入新创建的 30-Day Launch。

系统可以在 Blueprint 中表达不同渠道的优先级、内容频率与作用，但不能把渠道选择成本转嫁给用户。

### 1.4 全产品只有一个用户可见 Agent

产品右侧始终只有一个常驻 Agent。该 Agent：

- 可以收起和展开；
- 可以实时对话；
- 知道用户当前正在查看的页面、对象和内容；
- 可以直接修改左侧当前页面中的业务内容；
- 可以调用后台 Research、Strategy、Channel、Content、Review 等专职 Agent；
- 是用户提出修改、追问原因、调整方向和触发重做的唯一入口。

用户不会在多个 Agent 聊天窗口之间切换。后台可以存在多个专职 Agent，但它们通过右侧同一个 Agent 对用户提供服务。

### 1.5 左侧是工作成果，右侧是修改入口

每个核心页面遵循同一交互模型：

```text
┌──────────────────────────────────────────┬────────────────────┐
│                                          │                    │
│  左侧：当前业务内容                       │  右侧：常驻 Agent   │
│  Brief / Blueprint / Calendar / 内容等    │  对话、解释、修改    │
│                                          │                    │
└──────────────────────────────────────────┴────────────────────┘
```

左侧页面不设置 `Edit with AI`、`Correct Something` 等重复按钮。用户直接在右侧说：

- “目标用户不是开发者，是小型设计工作室。”
- “第二周不要讲功能，继续讲问题。”
- “把 Reddit 的内容改得更像经验分享。”
- “把这篇文章缩短一半。”

Agent 理解当前页面上下文，修改左侧对应对象，并反馈修改结果。

### 1.6 行动日历继续保留

现有行动日历保留，但更名并升级为 **Launch Calendar**。

它不再是一张孤立的待办表，而是统一展示 Strategy Agent 与所有 Channel Agent 在 30 天内的执行节奏。它负责回答：

- 今天各渠道要做什么；
- 本周 Campaign 的共同主题是什么；
- 不同渠道如何围绕同一目标配合；
- 哪些内容已经准备、发布、跳过或失败；
- 哪些任务需要用户处理验证或审批。

---

## 2. 产品概述

### 2.1 一句话定义

> NowBuild 用一支 AI Channel Agent 团队，为一个新产品规划并执行 30 天的全渠道冷启动。

### 2.2 用户购买后的明确结果

用户购买的不是一份静态策略，也不是若干互不相关的 AI 文案，而是：

1. 一份基于产品、用户和竞品调研生成的 Launch Brief；
2. 一套统一的 30-Day Campaign Launch Blueprint；
3. 所有已支持渠道各自定制的 30 天运营计划；
4. 一张跨渠道 Launch Calendar；
5. 每天由 Agent 准备好的发布、建设和提交任务；
6. 每周由各 Channel Agent 完成的复盘和下一周调整；
7. 第 30 天的完整执行报告。

### 2.3 核心用户体验

第一次进入：

> 输入一个产品链接，等待 NowBuild 建立完整冷启动 Campaign。

每天进入：

> 查看今天各 Channel Agent 已经准备好的工作，审核、发布或完成必要验证。

每周进入：

> 查看 Agent 的复盘和下一周调整结果，通过右侧对话提出修改。

第 30 天：

> 查看产品在哪些渠道完成了哪些推广动作，以及后续最值得继续运行的渠道计划。

---

## 3. Agent 体系

## 3.1 用户可见层：一个常驻 Launch Agent

右侧常驻 Agent 暂定名称为 **Launch Partner**，中文可显示为“冷启动合伙人”或“市场合伙人”。正式命名可在视觉与品牌阶段确定。

Launch Partner 的职责：

- 接收用户全部自然语言输入；
- 读取当前页面的 View Context；
- 解释左侧页面为何这样规划；
- 判断用户希望修改哪个业务对象；
- 调用对应后台 Agent；
- 将结果写回左侧页面；
- 汇报后台任务进度；
- 展示需要用户处理的阻塞事项；
- 保留跨页面的产品与 Campaign 上下文。

### 3.2 后台专职 Agent

用户不直接切换或单独与以下 Agent 聊天。

| Agent | 职责 | 主要产物 |
|---|---|---|
| Research Agent | 读取网站、识别产品、调研竞品与市场 | Research Report |
| Context Agent | 维护产品事实、用户纠正和长期记忆 | Product Profile |
| Strategy Agent | 生成统一 Campaign 目标与 30 天叙事 | Launch Brief、Launch Blueprint |
| Channel Agent × N | 为每个渠道生成专属策略和 30 天计划 | Channel Playbook、Launch Tasks |
| Content Agent | 为单条任务生成可发布内容 | Content Draft |
| Publishing Agent | 打开渠道、填写内容、记录发布结果 | Published URL、状态 |
| Directory Agent | 匹配目录、准备资产、执行提交 | Submission Pipeline、Report |
| Review Agent | 每周读取执行与表现，调整下一周 | Weekly Review |

### 3.3 编排关系

```text
用户
  ↕
右侧 Launch Partner
  ├── Research Agent
  ├── Context Agent
  ├── Strategy Agent
  ├── X Channel Agent
  ├── LinkedIn Channel Agent
  ├── Reddit Channel Agent
  ├── SEO Channel Agent
  ├── Directory Agent
  ├── 未来新增 Channel Agent
  └── Review Agent
```

### 3.4 多渠道一致性约束

Channel Agent 不能彼此完全独立生成计划。

所有渠道必须共同依赖：

- 同一份 Product Profile；
- 同一份 Launch Brief；
- 同一份 Launch Blueprint；
- 同一组 Campaign Pillars；
- 同一套四周阶段目标。

各渠道只负责把共同 Campaign 转译成适合本平台的运营方法，而不是各自发明不同的产品定位。

---

## 4. 端到端用户主链路

```text
官网支付
  ↓
输入产品 URL
  ↓
网站读取与竞品调研
  ↓
Launch Brief
  ↓
30-Day Campaign Launch Blueprint
  ↓
全部已支持 Channel Agent 自动生成计划
  ↓
Launch Command Center + Launch Calendar
  ↓
每日执行
  ↓
每周复盘与计划调整
  ↓
Day 30 Launch Report
```

---

## 5. 阶段一：支付后初始化

### 5.1 页面目标

让用户以最低输入成本启动冷启动项目。

### 5.2 页面内容

页面标题：

> What did you build?

辅助文案：

> Paste your product URL. NowBuild will study your product, competitors and market before building your 30-day launch.

唯一主输入：

- Product URL。

唯一主按钮：

- Build My Launch。

右侧 Launch Partner 从此页面开始常驻，可以回答“为什么需要链接”“支持什么类型的网站”等问题。
当然，用户可以选择一个副按钮“还没发布产品”，然后可以跟右侧的 Launch Partner 进行一些对话，来确定它的产品定位
如果没有产品，或者还没做出产品，可以引导用户点击 GitHub 的 SaaS 框架独立页面。
https://github.com/JackZhong1998/nowbuild-saas-kit
这个独立页面记录了一个开源的 SaaS 框架，包含登录、支付、数据库、SEO 等功能。引导用户跳转到这个页面之后，让用户自己去 build 产品。

### 5.3 URL 提交后的系统动作

1. 验证 URL 是否可访问；
2. 读取首页及必要公开页面；
3. 提取产品名称、核心功能、目标用户、定价和主要文案；
4. 提取 favicon、Open Graph 图片和公开可访问的产品素材，仅作为候选资源，不要求用户上传；
5. 识别产品类型与商业模式；
6. 搜索直接竞品和替代方案；
7. 分析竞品定位、内容渠道与主要表达；
8. 生成 Research Report；
9. 生成 Product Profile；
10. 生成 Launch Brief 初稿。

### 5.4 进度页

研究期间左侧显示真实阶段，不显示虚假的完成百分比。

示例：

```text
Building your launch foundation

✓ Reading your website
✓ Understanding the product
● Finding competitors
○ Mapping target audiences
○ Preparing your Launch Brief
```

右侧 Launch Partner 同时展示简短进度消息。用户可以继续对话，但不得打断已完成的研究结果；新的有效信息写入 Context Agent，并影响后续 Brief。

### 5.5 失败处理

| 场景 | 产品行为 |
|---|---|
| URL 无效 | 左侧原位提示并保留输入框 |
| 网站无法访问 | Agent 说明原因，请用户提供另一个可公开访问 URL |
| 页面信息太少 | 继续生成已有结果，Agent 在右侧只追问真正缺失的核心信息 |
| 竞品搜索失败 | 不阻塞主流程，标记 Research Confidence 较低 |
| 部分页面读取失败 | 展示已读取的来源，不让整次初始化失败 |

---

## 6. 阶段二：Launch Brief

### 6.1 页面目标

在生成所有渠道计划前，向用户展示 NowBuild 对产品和市场的共同理解。

Launch Brief 是所有后台 Agent 的事实底座，但不要求用户通过按钮逐项审批。

### 6.2 左侧信息结构

#### Product

- 产品是什么；
- 解决的核心问题；
- 核心功能；
- 当前产品阶段；
- 商业模式与定价（若网站可识别）。

#### Target Audience

- 主要目标用户；
- 用户当前如何解决问题；
- 使用场景；
- 购买或尝试动机。

#### Competitors and Alternatives

- 3–5 个直接竞品或替代方案；
- 每个竞品的主要定位；
- 与用户产品的相似点和差异；
- 可能的市场空位。

#### Recommended Positioning

- 一句话定位；
- 三个核心卖点；
- 主要痛点；
- 建议表达方式；
- 不应该作为主卖点的内容。

#### Research Confidence

每个重要结论显示信息来源或置信状态：

- From website；
- Inferred by NowBuild；
- Confirmed by user。

这不是让用户逐项确认，而是帮助用户发现 Agent 是否误解。

### 6.3 右侧对话修改

该页面不提供以下按钮：

- Edit with AI；
- Correct Something；
- Regenerate；
- Approve Brief。

用户直接在右侧输入：

> “我们的主要用户不是营销团队，是没有营销人员的 solo founder。”

系统行为：

1. Launch Partner 识别当前页面为 Launch Brief；
2. Context Agent 记录用户纠正为高置信事实；
3. Strategy Agent 只重写受影响的 Brief 区块；
4. 左侧内容实时更新；
5. 页面显示轻量提示“Launch Brief updated”；
6. 创建新版本，允许撤销。

### 6.4 进入下一阶段

Launch Brief 首次生成后，系统自动开始生成 Launch Blueprint，无需用户点击确认。

如果用户在 Blueprint 生成过程中修改了 Brief：

- 尚未生成的部分使用新版本；
- 已生成但受影响的部分被标记为需要刷新；
- Strategy Agent 自动重新计算受影响内容；
- 不重新执行无关的竞品研究。

---

## 7. 阶段三：30-Day Campaign Launch Blueprint

### 7.1 页面目标

先建立一个所有渠道共同遵循的 30 天 Campaign，再启动各 Channel Agent。

### 7.2 Blueprint 内容结构

#### Campaign Goal

一句话说明 30 天冷启动的总体目标。目标应是可执行方向，不承诺不可控业务结果。

#### Core Positioning

所有渠道共同使用的产品定位与核心信息。

#### Target Audience

本次 Campaign 主要触达的人群和市场。

#### Campaign Pillars

建议 3–5 个贯穿 30 天的内容支柱，例如：

- 用户问题与错误认知；
- Founder Story；
- Build in Public；
- 产品使用场景；
- 证明与案例。

#### Four-Week Narrative

| 周次 | 阶段目标 | 共同叙事 | 产品露出强度 |
|---|---|---|---|
| Week 1 | 建立问题认知 | 解释问题、现有做法为何失败 | 低 |
| Week 2 | 建立可信度 | Founder 经验、构建过程、行业判断 | 低至中 |
| Week 3 | 展示解决方案 | 场景、功能、案例、对比 | 中 |
| Week 4 | 集中 Launch | 结果、社会证明、明确 CTA | 高 |

具体内容必须由 Strategy Agent 按用户产品定制，不得固定套用示例。

#### Channel Roles

Blueprint 必须说明每个渠道在整体 Campaign 中承担什么角色，而不仅是列出渠道名称。

例如：

- X：高频观点与 Build in Public；
- LinkedIn：Founder authority 与专业叙事；
- Reddit：社区适配的经验与问题讨论；
- SEO：建立搜索内容集群；
- Directory：扩大产品被发现和引用的覆盖面。

#### Global Guardrails

- 核心事实不得跨渠道冲突；
- 同一周围绕共同 Campaign 主题；
- 不把同一篇内容机械复制到所有平台；
- 各渠道使用自己的格式与语言习惯；
- 控制产品推广内容与非推广内容比例；
- 所有无法从网站确认的具体数据不得编造。

### 7.3 页面交互

左侧以可阅读的 Campaign 文档呈现。右侧 Launch Partner 可解释和修改任一模块。

典型输入：

- “30 天目标应该更偏向获取第一批用户，不是建立 Founder Brand。”
- “第一周就可以适当展示产品，不用完全隐藏。”
- “所有渠道都使用英语。”
- “不要使用 Build in Public 这个角度。”

修改 Blueprint 后，系统必须计算影响范围：

- 只影响某个模块：局部更新；
- 影响某一周：重新生成该周所有 Channel Plan；
- 影响定位、用户或市场：重新生成所有渠道中受影响的计划与未发布内容；
- 已发布内容永不被覆盖，只在后续计划中应用新方向。

---

## 8. 阶段四：自动生成全部 Channel Plan

### 8.1 无渠道选择步骤

Blueprint 建立后，系统自动读取当前 `supportedChannels`，为每一个已支持渠道创建 Channel Agent 和 Channel Plan。

用户不会看到选择 Launch Team 的页面。

### 8.2 Channel Agent 生成顺序

为控制等待时间与成本，后台采用分批生成，但用户感知为统一的 Launch Team 正在组建。

1. Strategy Agent 写出所有渠道的 role brief；
2. 高优先级渠道先生成策略和 Week 1；
3. 其他渠道并行生成策略；
4. 先生成 Day 1–7 可执行任务；
5. Day 8–30 可先生成计划骨架，随后补齐内容；
6. Directory Agent 单独建立 Submission Pipeline。

### 8.3 生成进度页

```text
Building your 30-day launch

✓ Campaign Blueprint
✓ X strategy
● Reddit community plan
● SEO content cluster
○ LinkedIn founder campaign
○ Directory submission pipeline

Week 1 will be ready first. The rest of the campaign continues building in the background.
```

右侧 Agent 可回答当前进度。用户不需要等待所有 30 天内容全部写完才能进入产品。

### 8.4 每个 Channel Plan 的标准结构

- Channel mission；
- Why this channel matters for this product；
- Target audience on this channel；
- Channel-specific content pillars；
- Formats；
- Publishing rhythm；
- Product mention rules；
- Four-week plan；
- Week 1 tasks；
- Success signals；
- Channel-specific risks and constraints。

### 8.5 新增渠道的未来行为

当 NowBuild 新增一个 Channel Agent：

- 新创建的 Launch 默认包含该渠道；
- 正在执行的 Launch 不强制插入，避免破坏已运行计划；
- 右侧 Agent 可以提示现有用户“NowBuild 新增了某渠道，是否加入剩余 Campaign”；
- 用户通过自然语言同意后，系统生成该渠道剩余天数计划。

---

## 9. Launch Command Center

### 9.1 默认首页

完成基础生成后，产品默认进入 Launch Command Center，而不是聊天页或完整月历。

页面标题：

> Day N of your 30-day launch

### 9.2 左侧页面结构

#### A. Campaign Status

- Day N / 30；
- 当前 Week 主题；
- 总完成率；
- 已准备任务数；
- 已发布内容数；
- 已完成目录提交数；
- 需要用户处理的阻塞数。

#### B. Today’s Launch Queue

这是页面主区域，按优先级显示：

1. Needs your action；
2. Ready to publish；
3. Agent working；
4. Completed today。

任务卡包含：

- Channel Agent；
- 任务标题；
- 任务类型；
- 本条任务在 Campaign 中的目的；
- 推荐时间；
- 当前状态；
- 主操作入口。

#### C. Your Channel Agents

用状态卡显示全部渠道，但卡片不是独立聊天入口。

```text
X Agent
Week 2 · Building founder credibility
12 tasks completed · 3 ready

Reddit Agent
18 communities mapped
2 posts ready · 1 needs revision

Directory Agent
21 / 60 submitted
4 require verification
```

点击卡片进入该 Channel Workspace。右侧仍然是同一个 Launch Partner，只是 View Context 切换到了对应渠道。

#### D. This Week

- 本周 Campaign 目标；
- 各渠道承担的作用；
- 本周预计完成的主要交付；
- 下次 Weekly Review 时间。

### 9.3 右侧 Agent 在首页的默认行为

Agent 自动知道：

- 当前是第几天；
- 哪些任务需要用户处理；
- 哪些后台任务正在运行；
- 当前最大阻塞是什么；
- 本周 Campaign 目标。

用户可以说：

- “今天我只有十分钟，帮我只保留最重要的任务。”
- “为什么今天 Reddit 和 LinkedIn 都在讲同一个问题？”
- “把今天所有内容都改得更个人一些。”
- “目录验证先放到晚上。”

---

## 10. Launch Calendar

### 10.1 定位

Launch Calendar 是跨渠道 Campaign 的执行时间轴，不是产品唯一首页。

### 10.2 三种视图

#### Today

- 与 Command Center 的 Today Queue 同源；
- 适合集中处理当天工作；
- 展示需要用户操作的最小集合。

#### Week

- 默认日历视图；
- 清晰展示不同 Channel Agent 如何围绕同一 Week Narrative 配合；
- 每个渠道使用固定颜色或图标；
- 支持按渠道过滤，但默认显示全部。

#### Month

- 展示完整 30 天节奏；
- 每周显示 Campaign 主题；
- 不在单个日期格中塞入完整内容；
- 重点展示任务数量、渠道分布和完成状态。

### 10.3 Task 状态

标准状态：

- Planned：计划中；
- Generating：Agent 正在生成；
- Draft：已有初稿；
- Ready：可审核/发布；
- Needs Action：需要登录、验证、上传或确认；
- Publishing：发布中；
- Published / Completed：已完成；
- Skipped：跳过；
- Failed：失败；
- Replanning：受策略修改影响，正在重算。

### 10.4 日历任务卡

任务卡至少显示：

- Channel；
- Title；
- Campaign Week；
- Content Pillar / Task Purpose；
- Time；
- Status。

点击后进入 Task Detail。右侧 Agent 自动切换到该 Task 的上下文。

### 10.5 通过右侧 Agent 修改日历

不为日历增加复杂的 AI 操作菜单。用户直接说：

- “把本周所有 Reddit 内容推迟两天。”
- “这周 X 发得太多，减少到每天两条。”
- “把周五的文章提前到周三。”
- “后两周增加产品案例内容。”

Agent 输出简短影响说明，然后直接更新未完成任务。涉及大范围重排时显示：

```text
Updating 18 future tasks across X and LinkedIn…
```

完成后左侧日历实时刷新，并可 Undo。

---

## 11. Channel Workspace

### 11.1 页面目标

让用户看见每个渠道 Agent 的方法、当前阶段和交付，但不创建新的聊天入口。

### 11.2 左侧信息结构

#### Agent Summary

- Channel Agent 名称；
- Mission；
- Current phase；
- 本周目标；
- 完成进度；
- 当前阻塞。

#### Playbook

- 目标用户在该渠道的行为；
- 内容支柱；
- 内容形式；
- 发布节奏；
- 产品露出规则；
- 四周计划；
- 风险与限制。

#### Queue

- 该渠道 Planned / Draft / Ready / Published 的全部任务；
- 支持按状态筛选；
- 支持进入单条 Task Detail。

#### Weekly Reviews

- Week 1–4 的复盘记录；
- 已应用的计划调整；
- 用户通过右侧 Agent 提出的关键决定。

### 11.3 右侧上下文

虽然页面可能显示“X Agent”或“Reddit Agent”，右侧仍然是统一 Launch Partner。

Launch Partner 在后台将问题路由给对应 Channel Agent。例如用户在 X 页面说：

> “这个账号不想一直发 Build in Public。”

系统只修改 X Playbook、X 未发布内容和未来 X Tasks，不影响其他渠道，除非用户明确要求修改全局 Campaign。

---

## 12. Task Detail 与内容交付

### 12.1 左侧结构

#### Why this task

- Channel；
- Campaign Week；
- Content Pillar；
- Task Purpose；
- Target Audience；
- 与前后内容的关系；
- 推荐时间。

#### Deliverable

根据任务类型展示：

- 社交帖子正文；
- Thread 分段；
- Reddit 标题与正文；
- 博客标题、摘要、正文与 metadata；
- Directory submission form data；
- 网站建设建议或页面文案。

#### Execution

- 发布助手状态；
- 复制/打开发布页等基础操作；
- Published URL；
- 公开互动数据；
- 失败原因。

### 12.2 内容修改

不显示 `Edit with AI` 按钮。右侧 Agent 自动获取当前 Task 与 Deliverable。

典型输入：

- “短一点。”
- “不要提产品名。”
- “加一个我为什么做这个产品的真实开头。”
- “把它改成 Reddit 用户更愿意看的表达。”
- “重新写一个完全不同的角度。”

系统只修改当前内容，除非用户明确说“以后都这样写”。如果用户表达长期偏好，Context Agent 将偏好保存，并用于未来未生成内容。

### 12.3 发布与确认

涉及第三方实际发布、提交表单、付费或敏感信息传输时，产品仍需在动作发生前展示明确确认。这个确认属于执行安全，不是额外的 AI 编辑按钮。

---

## 13. Weekly Review

### 13.1 触发时间

- Day 7；
- Day 14；
- Day 21；
- Day 30 为 Final Review。

### 13.2 自动输入

Review Agent 使用当前可获得的数据：

- 任务完成、跳过和失败状态；
- 已发布 URL；
- 浏览器插件读取到的公开互动；
- Directory submission 状态；
- 用户通过 Agent 提供的反馈；
- 过去一周被修改最多或跳过最多的内容类型。

不要求用户额外填写冗长周报。

### 13.3 左侧 Review 页面

#### Week Summary

- 本周目标；
- 各渠道完成情况；
- 主要产出；
- 阻塞事项。

#### Channel Reviews

每个 Channel Agent 输出：

- 做了什么；
- 哪些信号较强；
- 哪些内容或动作没有完成；
- 下周保留什么；
- 下周改变什么。

#### Updated Next Week

直接展示 Agent 已提出的下一周计划变化。

### 13.4 无额外批准按钮

Weekly Review 页面不要求用户逐条勾选 Agent 建议。Agent 默认把合理调整应用到未来未完成任务。

用户如果不同意，直接在右侧说：

- “不要减少产品内容。”
- “Reddit 继续原来的方向。”
- “下周把 SEO 优先级提高。”

系统更新计划并记录变更历史。

对于会大规模删除未来任务或改变全局定位的修改，Agent 先在对话中说明影响并请求一句自然语言确认。

---

## 14. Directory Submission Agent 特殊交互

### 14.1 定位

Directory Agent 属于整个 Launch Team，但其主要工作不是按天写内容，而是运行一个持续提交 Pipeline。

### 14.2 Pipeline 阶段

```text
Discovered
  → Matched
  → Prepared
  → Needs Action
  → Submitted
  → Under Review
  → Published / Rejected / Unavailable
```

### 14.3 Directory Workspace 左侧结构

#### Summary

- 找到的候选目录数量；
- 符合产品的目录数量；
- 已准备数量；
- 已提交数量；
- 需要用户操作数量；
- 已上线数量。

#### Directory Table

每行显示：

- 目录名称；
- Match reason；
- Free / Paid；
- Required assets；
- Automation level；
- Last verified；
- Current status；
- Proof screenshot；
- Published URL。

#### Needs Your Action

集中显示：

- 邮箱验证；
- OAuth / 登录；
- CAPTCHA；
- 付费确认；
- 缺失的特定资产。

### 14.4 与 Launch Calendar 的关系

Calendar 中只显示聚合任务，例如：

- “Directory Agent 准备首批 10 个 AI directories”；
- “完成 4 个邮箱验证”；
- “检查本周目录审核状态”。

具体目录列表和每个平台状态留在 Directory Workspace，不把几十个目录塞进日历。

### 14.5 右侧 Agent 修改示例

- “优先提交免费的目录。”
- “跳过所有要求反向链接的平台。”
- “为什么这个目录适合我的产品？”
- “所有付费目录都先不要提交。”
- “重新写这个平台的产品介绍。”

---

## 15. 右侧常驻 Agent 详细规范

### 15.1 桌面端布局

- 展开宽度建议 380–440 px；
- 默认根据上次用户状态保持展开或收起；
- 收起后保留 52–60 px 窄栏；
- 窄栏显示 Agent 图标、工作状态、未读通知和阻塞数量；
- 展开时始终占据右侧，不用覆盖左侧关键内容；
- 左侧内容区域响应式缩放。

### 15.2 移动端布局

- 默认以底部浮动入口存在；
- 展开后成为全高 Drawer；
- 关闭后返回当前左侧页面和滚动位置；
- 不允许在移动端同时展示过窄的双栏。

### 15.3 View Context

每次路由或选中对象变化时，向 Agent 提供：

- `view`；
- `path`；
- `entityType`；
- `entityId`；
- `title`；
- `channelId`；
- `section`；
- `selectedText`；
- `revision`。

Agent 顶部显示简短上下文，例如：

```text
正在查看 · Launch Brief
正在查看 · X Agent / Week 2
正在查看 · Reddit Task / Day 8
```

### 15.4 修改协议

用户通过对话提出修改后：

1. Director 判断是局部内容、渠道策略还是全局 Campaign 修改；
2. 将请求路由给对应后台 Agent；
3. 后台 Agent 返回结构化 patch，而不是只返回一段自然语言；
4. 服务端验证 patch 的对象、版本和允许修改范围；
5. 保存新 revision；
6. 左侧局部刷新；
7. Agent 用一句话说明修改了什么；
8. UI 提供 Undo toast 或版本历史。

### 15.5 并发与版本冲突

- 每个 Artifact 保存 revision；
- Agent 修改时携带读取到的 revision；
- revision 已变化时不直接覆盖；
- Agent 重新读取最新内容并合并；
- 无法安全合并时在右侧说明冲突。

### 15.6 Agent 主动消息

Agent 只在以下情况主动提醒：

- 研究或生成完成；
- 有任务需要用户操作；
- 发布或提交失败；
- Weekly Review 完成；
- 全局策略变化导致大量任务重算；
- Day 30 Report 完成。

不要为普通后台进度频繁打扰用户。

---

## 16. 信息架构

建议保留简单产品导航，但不增加第二个聊天页面。

```text
Launch Command Center
Launch Calendar
Campaign Blueprint
Channel Agents
  ├── X
  ├── LinkedIn
  ├── Reddit
  ├── SEO
  ├── Directory
  └── Future Channels
Published Content
Launch Report
```

全局右侧始终是 Launch Partner。

不再需要单独的 Chat 页面作为主导航。历史对话由右侧 Agent 自己承载。

---

## 17. 核心数据对象

### 17.1 LaunchProject

- `id`
- `userId`
- `productUrl`
- `startDate`
- `endDate`
- `currentDay`
- `phase`
- `status`
- `createdAt`
- `updatedAt`

### 17.2 ProductProfile

- 产品事实；
- 推断事实；
- 用户确认事实；
- 来源 URL；
- revision。

### 17.3 ResearchReport

- 网站读取结果；
- 竞品列表；
- 替代方案；
- 市场观察；
- 来源；
- confidence；
- revision。

### 17.4 LaunchBrief

- product summary；
- target audience；
- competitors；
- positioning；
- key messages；
- non-goals；
- revision。

### 17.5 LaunchBlueprint

- campaign goal；
- core positioning；
- campaign pillars；
- four-week narrative；
- channel roles；
- guardrails；
- revision。

### 17.6 ChannelPlan

- `channelId`
- mission；
- target audience；
- channel pillars；
- formats；
- cadence；
- product mention rules；
- weekly plan；
- review history；
- revision。

### 17.7 LaunchTask

- `channelId`
- `dayIndex`
- `scheduledAt`
- `type`
- `title`
- `purpose`
- `pillar`
- `phase`
- `status`
- `deliverableId`
- `publishedUrl`
- `revision`

### 17.8 WeeklyReview

- week index；
- summary；
- per-channel findings；
- applied changes；
- affected task IDs；
- data sources；
- revision。

### 17.9 DirectorySubmission

- directory ID；
- match reason；
- required fields；
- required assets；
- automation level；
- status；
- proof；
- submittedAt；
- publishedUrl；
- lastCheckedAt。

---

## 18. 现有功能映射

### 18.1 保留

- 产品链接 Kickoff；
- Researcher Agent；
- Context Agent；
- Strategy Agent；
- Channel Specialist；
- 30 天 Todo 生成；
- 行动日历；
- 内容生成与改稿；
- X / 小红书浏览器发布助手；
- 发布链接与公开数据读取；
- Stripe 与账号体系；
- 右侧 Agent Panel 与 View Context 基础设施。

### 18.2 改造

| 现有能力 | 改造目标 |
|---|---|
| GTM Kickoff 问卷 | 收敛为 Product URL 单输入 |
| Market Strategy | 拆分为 Launch Brief + Launch Blueprint |
| 推荐 2–3 个渠道 | 改为所有 supported channels 自动生成 |
| Channel Specialist | 产品化为 Channel Agent |
| Action Calendar | 升级为 Launch Calendar |
| Todo | 升级为 Launch Task，增加 purpose/pillar/phase |
| 内容改稿入口 | 移除独立按钮，统一由右侧 Agent 修改 |
| Chat 页面 | 取消主入口地位，右侧 Agent 承载对话 |
| 周复盘 | 按所有 Channel Agent 输出并直接调整未来计划 |

### 18.3 新增

- Launch Brief 页面；
- Launch Blueprint 页面；
- Launch Command Center；
- Channel Workspace；
- Task Purpose 与 Campaign 关联；
- Artifact revision / Undo；
- 多 Agent 结构化 patch；
- Directory Submission Pipeline；
- Day 30 Launch Report。

---

## 19. MVP 范围

### 19.1 MVP 必须完成

1. 支付后输入 URL；
2. 网站与竞品研究进度；
3. Launch Brief；
4. 通过右侧 Agent 修改 Launch Brief；
5. Launch Blueprint；
6. 自动为全部当前支持渠道生成 Channel Plan；
7. Launch Command Center；
8. Launch Calendar；
9. Channel Workspace；
10. Task Detail 与右侧对话改稿；
11. Week 1 Review；
12. 版本保存与 Undo；
13. Directory Agent 的基础 Pipeline 状态。

### 19.2 MVP 可以简化

- 首次只完整生成 Week 1，Week 2–4 先生成骨架；
- Weekly Review 只使用任务状态、发布 URL 和已有公开数据；
- Directory Agent 可先支持 10–30 个已验证目录；
- 暂不支持复杂实时协同编辑；
- 不要求每个渠道真正无人值守自动发布；
- 不要求完整自动抓取所有社交数据。

### 19.3 MVP 不做

- 用户选择 Launch Team；
- 多个可见聊天 Agent；
- Founder 社交账号初始化问卷；
- 已有内容渠道初始化问卷；
- 初始化阶段要求 Logo 和截图；
- 页面内重复的 Edit with AI 按钮；
- 让用户逐条勾选 Agent 的策略建议；
- 为了凑数量生成大量无关联内容。

---

## 20. 分阶段开发计划

### Phase 1：统一页面与 Agent 修改模型

- 保留现有 AppShell 右侧 Agent；
- 完善 View Context；
- 移除独立 Chat 主入口依赖；
- 支持 Agent 对当前 Artifact 进行结构化更新；
- 增加 revision 与 Undo。

### Phase 2：Launch Brief 与 Blueprint

- URL-only Kickoff；
- Research progress；
- Launch Brief 数据结构与页面；
- Strategy Agent 生成 Launch Blueprint；
- Brief / Blueprint 对话修改与影响范围计算。

### Phase 3：全部 Channel Agent 与 Launch Calendar

- 从 `supportedChannels` 自动创建 Channel Plan；
- 统一 Campaign Spine；
- Week 1 优先生成；
- Todo 增加 purpose、pillar、phase；
- Action Calendar 改造为 Launch Calendar。

### Phase 4：Command Center 与 Weekly Review

- Today Queue；
- Channel Agent 状态卡；
- This Week；
- Weekly Review；
- 自动应用未来任务调整。

### Phase 5：Directory Submission Agent

- Directory database；
- 匹配；
- Launch Kit 按需生成；
- Submission Pipeline；
- 浏览器填写；
- 证据与报告。

---

## 21. 验收标准

### 21.1 初始化

- 用户只输入一个有效 URL 即可启动；
- 不出现 Founder 社交账号、已有渠道、Logo、截图必填项；
- 用户能看见研究的真实阶段；
- 部分研究失败不导致项目整体失败。

### 21.2 Launch Brief

- Brief 至少包含 Product、Audience、Competitors、Positioning；
- 页面没有 Edit with AI / Correct Something；
- 用户在右侧纠正目标用户后，左侧对应区块更新；
- 用户纠正写入长期 Context；
- 可以撤销最近修改。

### 21.3 Blueprint 与渠道生成

- 系统不展示渠道勾选页面；
- Blueprint 包含统一目标、Pillars、四周叙事和渠道角色；
- 所有 supported channels 自动获得 Channel Plan；
- 各渠道计划遵循同一 Campaign Spine；
- Week 1 可先于完整 30 天内容进入执行。

### 21.4 右侧 Agent

- 所有核心页面都只有一个右侧 Agent；
- Agent 能显示当前 View Context；
- Agent 能修改当前页面对象；
- 局部修改不会无故重做全局计划；
- 全局修改会重算受影响的未来任务；
- 已发布内容不会被覆盖。

### 21.5 Calendar

- 支持 Today / Week / Month；
- 默认展示全部渠道；
- 任务显示 purpose、pillar、phase 和状态；
- 用户可以通过右侧自然语言批量调整未来任务；
- Directory 以聚合任务进入日历。

### 21.6 Weekly Review

- Day 7 能产生 Review；
- Review 包含每个渠道的完成情况和下一周调整；
- 调整默认写入未来任务；
- 用户可以通过右侧 Agent 撤回或修改调整。

---

## 22. 核心成功指标

### 激活

- 支付后成功提交 URL 的比例；
- 成功生成 Launch Brief 的比例；
- 成功生成 Week 1 全渠道计划的比例；
- 从支付到第一个 Ready Task 的时间。

### 执行

- Day 1 至少完成一个任务的项目比例；
- 每周 Ready Task → Published/Completed 转化率；
- 需要用户操作的任务解决率；
- 每个 Channel Agent 的任务完成率。

### Agent 价值感知

- 用户通过右侧 Agent 修改页面的次数；
- 修改后被保留而未撤销的比例；
- Weekly Review 后继续执行下一周的比例；
- 用户主动询问“为什么这样安排”的次数及回答后的继续执行率。

### 30 天交付

- 完成 30 天 Campaign 的项目比例；
- 实际发布内容数；
- 实际完成目录提交数；
- 获得公开 URL 的任务比例；
- 继续运行某个 Channel Agent 或启动第二个产品的比例。

---

## 23. 最终产品体验定义

NowBuild 的产品交互最终应让用户形成以下理解：

> 我不需要选择渠道，也不需要自己把策略拆成任务。NowBuild 先理解我的产品，再制定一个统一的 30 天冷启动 Campaign，然后让每个渠道 Agent 按自己的平台方法执行。我每天只需要打开首页，处理 Agent 已经准备好的工作；如果任何地方不对，我直接告诉右侧的 Agent，左侧的计划、内容或日历会随之更新。

对应的产品体验可以压缩成四句话：

1. **输入一个链接，NowBuild 建立 Launch Brief。**
2. **Strategy Agent 生成统一的 30-Day Campaign Blueprint。**
3. **所有 Channel Agent 自动生成并执行各自的 30 天计划。**
4. **用户始终通过右侧一个 Agent 查看、解释和修改左侧全部成果。**

