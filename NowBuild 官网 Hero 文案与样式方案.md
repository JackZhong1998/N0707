# NowBuild 官网 Hero 文案与样式方案

**日期：** 2026-08-04  
**范围：** 官网首页 Hero 首屏  
**目标：** 保留现有品牌 H1，在尽量少的文字里说清用户痛点、AI Marketing Agent Team、渠道 Skills 与自动化执行能力。

---

## 一、Hero 必须传达的核心

NowBuild 面向的是已经做出产品，但不会做市场增长、不知道如何验证市场的独立开发者。

Hero 首屏需要让用户在几秒内理解：

1. **这是为我设计的：** 我会做产品，但不会做 Marketing 和市场验证。
2. **这是什么：** 一支专为产品冷启动工作的 AI 营销 Agent Team。
3. **它为什么不是普通 AI 工具：** 多个专业 Agent 共享产品认知，会调用不同渠道的专业 Skills。
4. **它会真正执行：** 自动选题、创作、准备发布，并匹配、提交产品 Directories。
5. **最终目的：** 通过真实市场反馈验证用户、需求与市场方向。

对外核心公式：

> **AI Marketing Agent Team × 28+ Channel Skills × Automated Execution**

---

## 二、推荐 Hero 文案

### Eyebrow

> AI MARKETING AGENT TEAM FOR SOLO FOUNDERS

### H1

**英文：**

> You built the product.  
> Now **Build** the market.

其中 `Build` 继续使用现有 NowBuild 的 B Logo 组合样式。

**中文：**

> 产品已经上线。  
> 接下来，让市场看见它。

### Description

**英文：**

> Not sure how to grow—or whether the market really wants it? Your **AI Marketing Agent Team** uses **28+ Channel Skills** to research, create, publish, and distribute—turning real feedback into market validation.

**中文：**

> 不会做市场增长，也不知道需求是否真实？**AI 营销 Agent Team** 调用 **28+ 渠道 Skills**，自动研究、选题、创作、发布和提交 Directories，用真实反馈帮你验证市场。

### CTA

> 免费分析我的产品

### CTA 下方能力标签

> AI Marketing Agent Team · 28+ Channel Skills · Automated Execution

中文可用：

> AI 营销 Agent Team · 28+ 渠道 Skills · 自动化执行

### 自动化边界

对外可以表达“自动发布”能力，但在用户流程和其他说明中应保持准确：

- Agent 自动完成选题、内容创作、排期和发布准备。
- 涉及外部账号、验证码、付费或最终发布时，仍由用户审核或确认。
- Directory Agent 可自动匹配目录、准备材料并执行已支持的提交流程。

Hero 不需要写入这些边界说明，但页面后续的人机分工模块需要说清。

---

## 三、首屏信息与样式层级

```text
AI MARKETING AGENT TEAM FOR SOLO FOUNDERS

产品已经上线。
接下来，让市场看见它。

不会做市场增长，也不知道需求是否真实？
[AI 营销 Agent Team] 调用 [28+ 渠道 Skills]，
自动研究、选题、创作、发布和提交 Directories，用真实反馈验证市场。

                 [ 免费分析我的产品 ]

 [ AI 营销 Agent Team ] [ 28+ 渠道 Skills ] [ 自动化执行 ]


CHANNEL AGENTS · SPECIALIZED SKILLS

[X] 趋势选题与 Threads      [Reddit] 社区研究与原生内容
[SEO] 关键词与内容集群     [小红书] 选题、笔记与发布
[PH] Launch 策划              [用户访谈] 需求验证
                            ← 自动滑动


DIRECTORY AGENT · AUTOMATED SUBMISSIONS

[G2] [Capterra] [AlternativeTo] [SaaSHub] [BetaList] ...
                            → 反向滑动
```

### 样式重点

1. **H1 保留原有品牌主张。** 英文继续强调 `Build` 的 B Logo 与品牌色；中文保留“产品已经上线。接下来，让市场看见它。”
2. **Description 最多三行。** 痛点、Agent Team、Skills、自动化和市场验证都在一段内完成，不继续罗列所有 Agent 岗位。
3. **CTA 只保留一个。** 免费入口聚焦“分析我的产品”，而不是强调领取一份报告。
4. **CTA 下方放三个短能力标签。** `AI Marketing Agent Team` 和 `28+ Channel Skills` 是前两个标签，与 `Automated Execution` 共同建立产品差异。
5. **滑块是能力证明，不是 Logo 墙。** 用户不仅需要知道支持哪些平台，还必须知道 Agent 在这个平台会做什么。

---

## 四、AI Marketing Agent Team 的强调样式

`AI Marketing Agent Team` 是 Hero 中的核心产品品类，不能只作为普通正文出现。

### Description 中的强调

- 使用品牌黄绿色 `brand-300`。
- 使用 `font-semibold` 或 `font-bold`，不使用全大写。
- 可在文字后添加一个很轻的连接光点或 Agent 群组图标，强化“多 Agent 协同”，但不使用过大的独立插画。

### CTA 下方的 Agent Team Badge

- 使用深色半透明背景、品牌色边框和轻微内发光。
- Badge 左侧放置 3–4 个小型重叠 Agent 节点，代表 Research、Strategy、Content 和 Distribution 协同工作。
- 主文案使用 `AI Marketing Agent Team`，可用较小辅助文字 `Shared product memory`。
- 悬停时只轻微提高边框亮度，不做大幅度缩放。

### 建议视觉

```text
●●●●  AI Marketing Agent Team
        Shared product memory
```

---

## 五、渠道 Skills 的强调样式与滑块

`Channel Skills` 是 NowBuild 区别于通用 AI 对话和普通内容生成器的能力证明，需要和 Agent Team 有明显但不冲突的第二层强调。

### Description 中的强调

- `28+ 渠道 Skills` 使用高亮文字或小型胶囊背景。
- 建议使用深色底 + 品牌色文字，并加入轻微的方括号、终端指令或插件槽边框感，表达“可调用能力”。
- 不使用与 Agent Team Badge 完全相同的样式：Agent Team 表达“团队”，Skills 表达“工具和专业方法”。

### CTA 下方的 Skills Badge

- 主文案使用 `28+ Channel Skills`。
- 左侧可使用简洁的闪电、插件或命令符号，与 Agent 节点图标区分。
- 悬停时可显示辅助提示：`Platform-native playbooks`。

### 建议视觉

```text
⚡ 28+ Channel Skills
  Platform-native playbooks
```

### 分组标题

> CHANNEL AGENTS · 28+ SPECIALIZED SKILLS

中文可用：

> 渠道 AGENTS · 28+ 专业 SKILLS

### 卡片内容规则

当前卡片只显示平台 Logo 和名称，会让用户将 NowBuild 理解成“支持很多平台”。应改为：

> **平台名 + 该平台的核心 Skill**

示例：

| 渠道 | 卡片文案 |
|---|---|
| X / Twitter | 趋势选题 · Threads · 互动 |
| LinkedIn | 专业观点 · Founder Story |
| Reddit | 社区研究 · 原生帖子 |
| Hacker News | Show HN · 技术叙事 |
| Indie Hackers | Build in Public · 复盘 |
| Product Hunt | Launch 策划 · 发布素材 |
| GitHub | README 增长 · 社区分发 |
| 小红书 | 选题 · 笔记 · 发布 |
| 微信公众号 | 长文 · 标题 · 排版 |
| TikTok | 脚本 · Hook · 分镜 |
| YouTube | 选题 · 脚本 · SEO |
| Instagram | Reels · Carousel · Caption |
| SEO | 关键词 · 内容集群 · 落地页 |
| 官网转化 | 定位 · Hero · CTA |
| 用户访谈 | 招募 · 提纲 · 需求验证 |
| 竞品研究 | 定位 · 价格 · 差异机会 |

### 卡片样式

- 保留现有平台 Logo。
- 平台名称使用较高对比度。
- Skill 说明使用更小、更浅的文字。
- 可采用上下两行，避免单张卡片过宽。
- 继续保留悬停时暂停滑动的交互。

---

## 六、Directory 自动化滑块

### 分组标题

> DIRECTORY AGENT · AUTOMATED SUBMISSIONS

中文可用：

> DIRECTORY AGENT · 自动匹配与提交

### 展示原则

- 保留 G2、Capterra、AlternativeTo、SaaSHub、BetaList 等 Directory Logo。
- Directory 卡片不必每张都加能力文案，避免过于拥挤。
- 通过分组标题直接说明这不是普通 Logo 墙，而是 Directory Agent 的自动提交范围。
- 保留与渠道 Skills 相反的滑动方向，建立视觉节奏。

---

## 七、Hero 不应承担的信息

以下内容应放在 Hero 之后的 Agent Team、自动化或人机分工模块，不继续塞进首屏：

- 所有 Agent 的完整岗位和职责。
- 完整 30 天执行流程。
- 免费和付费阶段的全部产物。
- 自动发布的账号、验证码和审核边界。
- 具体的价格对比。
- 不保证流量、排名或收入的风险说明。

Hero 只需要完成一个任务：

> **让不会做市场的独立开发者，立即理解 NowBuild 是一支带着专业 Skills、能够自动执行并帮他验证市场的 AI 营销 Agent Team。**

---

# 官网首页 V2：完整文案与样式方案

## 八、新的内容结构

官网 V2 按照“建立需求 → 解释产品 → 证明能力 → 证明执行 → 解除顾虑 → 付费”组织：

```text
01  Hero
    痛点 + 品牌主张 + Agent Team / Skills / Automation

02  AI Marketing Agent Team
    这不是一个 AI 助手，而是一支分工协作的营销团队

03  Channel Skills
    每个渠道 Agent 都调用平台专属 Skills

04  Automated Workflow
    从研究、假设到选题、发布、Directory 和反馈的执行闭环

05  30-Day Outcomes
    Day 1 / Day 7 / Day 30 的市场验证进展

06  Daily Workspace
    用真实产品界面证明 Agent 每天在工作

07  Agent vs Founder
    自动化的边界以及用户保留的控制权

08  Pricing
    免费分析 → $49 组建完整 Agent Team

09  FAQ
    解决差异、自动发布、Skills、Directory 和效果预期

10  Closing CTA
    回扣品牌 H1，统一到“免费分析我的产品”
```

### 整页视觉节奏

- Hero 使用深色背景，建立 AI Agent 与自动化的产品感。
- Agent Team 继续深色，与 Hero 形成一个完整的“产品定义区”。
- Channel Skills 切换到浅色，让大量渠道卡片保持清晰。
- Automated Workflow 回到深色或深灰，用运行状态强化“系统正在工作”。
- Outcomes 与 Workspace 使用浅色，承接故事与产品截图。
- Agent vs Founder 使用黑白左右分屏。
- Pricing 使用暖白背景，将注意力收束到两张方案卡。
- Closing CTA 重回深色品牌区，与 Hero 首尾呼应。

---

## 九、模块 01：Hero

### 文案

**Eyebrow**

> AI MARKETING AGENT TEAM FOR SOLO FOUNDERS

**H1**

> 产品已经上线。  
> 接下来，让市场看见它。

**Description**

> 不会做市场增长，也不知道需求是否真实？**AI 营销 Agent Team** 调用 **28+ 渠道 Skills**，自动研究、选题、创作、发布和提交 Directories，用真实反馈帮你验证市场。

**CTA**

> 免费分析我的产品

**Capability Badges**

> AI Marketing Agent Team · 28+ Channel Skills · Automated Execution

### 样式

- 沿用现有深色网格、品牌色光晕和居中排版。
- H1 保留两行，第二行使用品牌黄绿色。
- 英文 `Now Build the market.` 继续使用特殊 B Logo。
- Description 中 `AI 营销 Agent Team` 使用品牌色粗体；`28+ 渠道 Skills` 使用插件式高亮胶囊。
- CTA 下方使用三个小型 Capability Badge，不再放长信任行。
- Hero 底部保留两排滑块，第一排表达 Channel Skills，第二排表达 Directory 自动提交。

---

## 十、模块 02：AI Marketing Agent Team

### 模块任务

承接 Hero 里的核心主张，让用户看见“一支 Agent Team”到底由谁组成、怎样协作。

### 文案

**Eyebrow**

> YOUR AI MARKETING AGENT TEAM

**H2**

> 不是一个 AI 助手。  
> 是一支真正分工协作的营销团队。

**Description**

> 把产品讲清楚一次，所有 Agent 就能共享同一份产品认知。它们围绕同一个市场假设分工、协作，并把真实反馈同步给整支团队。

**Agent Roles**

| Agent | 展示文案 | 核心产物 |
|---|---|---|
| Market Research Agent | 读懂产品、用户、竞品和市场 | 用户问题 · 竞品差异 · 需求信号 |
| Growth Strategy Agent | 将想法变成可验证的市场假设 | 定位 · 验证路径 · 30 天 Campaign |
| Content Agent | 把市场假设变成持续选题与内容 | 选题 · 文案 · 视频与视觉 Brief |
| Channel Agents | 调用平台专属 Skills 执行渠道工作 | 平台原生内容 · 互动 · 发布 |
| SEO Agent | 发现搜索需求，积累长期可发现性 | 关键词 · 内容集群 · 落地页 |
| Directory Agent | 匹配产品目录并执行支持的提交 | 目录排名 · 提交材料 · 进度 |
| Review Agent | 读取执行和市场反馈，调整下一步 | 周复盘 · 市场信号 · 调整建议 |

**Shared Memory Label**

> ONE PRODUCT MEMORY · ONE MARKET HYPOTHESIS · ONE 30-DAY CAMPAIGN

### 样式

- 整个模块继续使用深色背景，与 Hero 连成一个完整故事。
- 桌面端使用“中心共享记忆 + 外围 Agent 节点”的网络布局。
- 中心节点使用品牌色，文案为 `Product Memory / Market Hypothesis`。
- Agent 节点不使用卡通头像，使用简洁缩写、状态灯和产物标签，保持专业工具感。
- 节点之间使用低亮度连线，可有缓慢流动的光点表达上下文和反馈同步。
- 移动端改为横向滑动 Agent 卡，顶部固定 Shared Memory 状态条。

---

## 十一、模块 03：Channel Skills

### 模块任务

让用户直接看见 NowBuild 对不同渠道的理解，以及对应 Skill 会如何完成具体工作。不解释抽象技术架构，而是通过多个平台的实际方法证明：**Skills 不是通用模板，而是每个渠道的专业执行能力。**

### 文案

**Eyebrow**

**中文**

> 28+ 渠道专属 SKILLS

**English**

> 28+ PLATFORM-NATIVE SKILLS

**H2**

**中文**

> 每个平台都有自己的语言。  
> 每个 Skill 都知道该怎么做。

**English**

> Every channel has its own language.  
> Every Skill knows how to work in it.

**Description**

**中文**

> 不是把同一篇文案改几个词后四处发布。NowBuild 把每个平台的用户心智、内容结构、社区规则和执行方法做成 Skills，让对应 Agent 产出真正适合该渠道的内容与行动。

**English**

> NowBuild does not rewrite one post for every platform. Each Skill captures a channel's audience mindset, native formats, community rules, and execution methods—so the right Agent can produce work that genuinely belongs there.

**核心强调**

> **不同渠道，不同理解，不同做法。**  
> **Different channels. Different context. Different execution.**

### Channel Skill Showcase Slider

滑块中每张卡片都回答两个问题：

1. **NowBuild 如何理解这个平台？**
2. **这个平台的 Skills 会具体做什么？**

#### Reddit

**渠道理解**

> Reddit 用户愿意回应有用的讨论，但会迅速抵触伪装成分享的广告。

**Skills 会怎么做**

> 找到相关 Subreddits 和反复出现的真实问题，检查社区规则，再生成能引发讨论的原生帖子与回复。

**Skill Tags**

> `Community Research` · `Native Discussion` · `Rule Check`

#### X / Twitter

**渠道理解**

> X 靠第一句抢下注意力，内容要有明确观点，也要为后续对话留出空间。

**Skills 会怎么做**

> 从 Campaign 主线中拆出多个选题角度，测试 Hook，生成单帖或 Thread，并准备互动回复和发布版式。

**Skill Tags**

> `Topic Mining` · `Hook Writing` · `Threads` · `Engagement`

#### LinkedIn

**渠道理解**

> LinkedIn 用户关心专业判断、真实经历和可信证据，不需要另一个空洞的“成功学”故事。

**Skills 会怎么做**

> 从产品决策、用户问题和构建过程中提炼 Founder POV，组织证据、段落节奏和讨论式 CTA。

**Skill Tags**

> `Founder POV` · `Professional Story` · `Proof` · `Conversation CTA`

#### 小红书

**渠道理解**

> 小红书同时是内容社区和搜索入口，选题、封面、标题与笔记结构需要一起工作。

**Skills 会怎么做**

> 研究搜索词与热门内容，提炼选题和标题，生成笔记结构、封面 Brief、标签与发布材料。

**Skill Tags**

> `Trend Research` · `Search Topics` · `Note Structure` · `Cover Brief`

#### TikTok

**渠道理解**

> TikTok 需要在开头几秒让用户愿意停下，文案必须能被说出来，而不是只适合被阅读。

**Skills 会怎么做**

> 设计多个开场 Hook，将产品价值改写为口播脚本，并生成分镜、演示画面和拍摄 Brief。

**Skill Tags**

> `Hook Testing` · `Spoken Script` · `Shot List` · `Production Brief`

#### YouTube

**渠道理解**

> YouTube 的点击和留存来自同一个承诺：标题、缩略图、开场和视频内容必须对齐。

**Skills 会怎么做**

> 从搜索意图与用户问题中生成选题，准备标题与缩略图概念，完成脚本、章节和演示镜头。

**Skill Tags**

> `Search Intent` · `Title & Thumbnail` · `Script` · `Retention`

#### SEO

**渠道理解**

> SEO 不是一篇文章塞入更多关键词，而是围绕用户搜索意图建立可持续扩展的内容结构。

**Skills 会怎么做**

> 识别搜索意图，组织关键词集群，安排支柱页、支持内容与内链，并生成可执行的 Content Brief。

**Skill Tags**

> `Search Intent` · `Keyword Clusters` · `Content Briefs` · `Internal Links`

#### Product Hunt

**渠道理解**

> Product Hunt 不只是上传一个产品，而是在一个集中时间窗里完成定位、讲述、素材与社区互动。

**Skills 会怎么做**

> 准备 Tagline、Gallery 文案、Maker Comment、FAQ 和上线日互动素材，并检查 Launch Kit 是否完整。

**Skill Tags**

> `Positioning` · `Launch Kit` · `Maker Comment` · `Launch Day`

#### Directories

**渠道理解**

> 不是所有 Directory 都适合每个产品；不同平台的收录范围、字段、素材与验证要求也完全不同。

**Skills 会怎么做**

> 根据产品匹配度给目录排序，按平台要求准备简介、标签和图片，执行已支持的提交并跟踪结果。

**Skill Tags**

> `Fit Matching` · `Submission Assets` · `Form Filling` · `Status Tracking`

### English Slider Card Copy

**Reddit**

> **Channel understanding:** Reddit rewards useful discussion and quickly rejects promotion disguised as a post.  
> **What the Skills do:** Find relevant subreddits and recurring problems, check community rules, then prepare native discussions and replies that contribute before they promote.  
> `Community Research` · `Native Discussion` · `Rule Check`

**X / Twitter**

> **Channel understanding:** The first line earns attention. A strong post carries one clear point of view and leaves room for conversation.  
> **What the Skills do:** Turn the campaign theme into multiple angles, test hooks, build posts or threads, and prepare follow-up replies and publishing format.  
> `Topic Mining` · `Hook Writing` · `Threads` · `Engagement`

**LinkedIn**

> **Channel understanding:** LinkedIn responds to professional judgment, lived experience, and credible proof—not another empty success story.  
> **What the Skills do:** Extract a founder point of view from product decisions and customer problems, then shape the proof, pacing, and conversation-led CTA.  
> `Founder POV` · `Professional Story` · `Proof` · `Conversation CTA`

**Xiaohongshu**

> **Channel understanding:** Xiaohongshu is both a content community and a search surface. Topic, cover, title, and note structure have to work together.  
> **What the Skills do:** Research search terms and popular notes, select viable angles, then prepare the title, note structure, cover brief, tags, and publishing assets.  
> `Trend Research` · `Search Topics` · `Note Structure` · `Cover Brief`

**TikTok**

> **Channel understanding:** TikTok has to earn the next second immediately. The copy must sound natural when spoken, not merely look good on a page.  
> **What the Skills do:** Test opening hooks, turn the product value into a spoken script, and prepare the shot list, demo moments, and production brief.  
> `Hook Testing` · `Spoken Script` · `Shot List` · `Production Brief`

**YouTube**

> **Channel understanding:** Click and retention come from the same promise. The title, thumbnail, opening, and video must stay aligned.  
> **What the Skills do:** Generate topics from search intent and user problems, then prepare title and thumbnail concepts, the script, chapters, and demo shots.  
> `Search Intent` · `Title & Thumbnail` · `Script` · `Retention`

**SEO**

> **Channel understanding:** SEO is not adding more keywords to one article. It is building a connected content structure around real search intent.  
> **What the Skills do:** Identify intent, organize keyword clusters, plan pillar and supporting pages, map internal links, and produce executable content briefs.  
> `Search Intent` · `Keyword Clusters` · `Content Briefs` · `Internal Links`

**Product Hunt**

> **Channel understanding:** Product Hunt is not a simple product upload. Positioning, story, assets, and community interaction must come together inside one launch window.  
> **What the Skills do:** Prepare the tagline, gallery copy, maker comment, FAQ, launch-day responses, and a completeness check for the launch kit.  
> `Positioning` · `Launch Kit` · `Maker Comment` · `Launch Day`

**Directories**

> **Channel understanding:** Not every directory fits every product, and each platform has different eligibility, fields, assets, and verification requirements.  
> **What the Skills do:** Rank directories by fit, prepare platform-specific descriptions and assets, complete supported submission flows, and track the result.  
> `Fit Matching` · `Submission Assets` · `Form Filling` · `Status Tracking`

### 样式

- 模块使用浅色背景，中间是一条可拖拽、可点击切换的横向 Skill Showcase Slider。
- 桌面端同时露出 3 张卡片：中心卡完整展示，左右卡显示约 70%，让用户明确知道还有更多平台。
- 中心卡建议宽 420–480px，相邻卡稍小且降低对比度；滑入中心时恢复完整尺寸和清晰度。
- 卡片不设计成快速连续滚动的 Marquee，而是使用 Scroll Snap 分页滑动，每 6–8 秒自动切换一张，悬停或手动操作时暂停。
- 每张卡片固定四层：`Logo + Channel`、`渠道理解`、`Skills 会怎么做`、`Skill Tags`。
- `渠道理解` 使用深色大字，`Skills 会怎么做` 使用较小正文，Skill Tags 使用品牌浅色胶囊。
- 卡片左上角使用渠道 Logo，右上角使用 `CHANNEL SKILL` 小标签，避免被误解为普通渠道介绍。
- Slider 下方放平台 Logo 导航轨道，点击 Logo 可直接跳到对应卡片，同时显示当前序号，例如 `03 / 09`。
- 支持鼠标拖拽、触摸滑动、左右箭头和键盘方向键。
- 移动端每次显示 1 张卡片，左右各露出少量相邻卡片，用来提示可滑动。
- 对 `prefers-reduced-motion` 用户停止自动切换，但保留手动滑动和 Logo 导航。

---

## 十二、模块 04：Automated Workflow

### 模块任务

把 Agent Team、Skills 和自动化连成一条完整的市场验证流程。

### 文案

**Eyebrow**

> FROM MARKET HYPOTHESIS TO DAILY EXECUTION

**H2**

> 不只给你建议。  
> Agent Team 会把每一步真正推进下去。

**Description**

> 从读懂产品、建立市场假设，到自动选题、创作、准备发布、提交 Directories 和每周调整，所有工作都连在同一场 Campaign 里。

**Step 01 — Research**

> **先搞清楚要验证什么**  
> Research 与 Strategy Agents 读取产品、用户和竞品，形成可修正的市场假设。

**Step 02 — Plan**

> **把假设拆成 30 天行动**  
> Growth Strategy Agent 设定优先渠道、内容主线、发布节奏和需要观察的市场信号。

**Step 03 — Execute**

> **Agents 调用 Skills 自动执行**  
> 系统按日历自动选题、创作内容、准备发布材料，经你确认后发布；Directory Agent 同步匹配并提交产品目录。

**Step 04 — Learn**

> **让真实反馈改变下一步**  
> Review Agent 汇总发布、互动、访谈和执行信号，判断什么值得加码、什么需要调整。

### 样式

- 使用深色背景，整体像一个正在运行的 Campaign Pipeline。
- 四个阶段使用横向流程线连接，移动端切换为纵向时间线。
- 每个阶段右上角显示运行状态：`Analyzing`、`Plan ready`、`Agents working`、`Learning`。
- Step 03 使用品牌色高亮，因为这是 NowBuild 与只给建议的 AI 工具之间的核心差异。
- 流程底部可放一条实时 Agent Activity：

```text
Research Agent finished competitor scan
Strategy Agent updated market hypothesis
Reddit Skill prepared a native discussion draft
Directory Agent submitted AlternativeTo
Review Agent added a signal to next week's plan
```

---

## 十三、模块 05：30-Day Outcomes

### 模块任务

将功能转换为用户真正感知到的市场验证进展。

### 文案

**Eyebrow**

> 30 DAYS OF MARKET LEARNING

**H2**

> 30 天后，不只是发过内容。  
> 而是知道市场如何回应你。

**Description**

> 每一天的渠道行动都在验证同一组市场假设，让你逐步看清谁在意、什么信息有效、哪条路值得继续。

**Day 01**

> **知道这个月要验证什么**  
> Agent Team 读懂产品、用户与竞品，建立市场假设、优先渠道和 30 天执行路径。  
> `产品认知 · 市场假设 · Campaign Blueprint`

**Day 07**

> **让第一批真实反馈进入系统**  
> Channel Agents 已按平台 Skills 选题、创作并推进发布；Directory Agent 同步开始提交。  
> `已发布内容 · Directory 进度 · 第一轮市场信号`

**Day 30**

> **知道应该加码、调整还是停下**  
> 渠道表现、用户回应、内容资产和执行结论沉淀为可复盘的市场证据。  
> `渠道结论 · 需求信号 · 下一轮建议`

### 样式

- 使用三张横向卡片，但增加从 Day 01 到 Day 30 的连续进度线。
- Day 01 使用浅色，Day 07 加入运行中的品牌色，Day 30 使用深色卡片表达结论沉淀。
- 每张卡片底部的产物使用小型证据标签，不只作为一行普通文字。
- 可在进度线上加入微型信号节点：帖子发布、用户回复、Directory 上线、访谈完成。

---

## 十四、模块 06：Daily Workspace

### 模块任务

用产品界面而不是口号证明“Agent Team 每天正在工作”。

### 文案

**Eyebrow**

> YOUR AGENTS' DAILY OUTPUT

**H2**

> 每天打开，  
> Agent 已经把下一步准备好了。

**Description**

> 选题、草稿、制作说明、发布材料和 Directory 任务都会按优先级进入工作台。原本数小时的准备，被压缩成每天约 30 分钟审核与判断。

**Workspace Status Labels**

> Agent researching · Draft ready · Ready for approval · Publishing prepared · Directory submitted · Feedback received · Plan adjusted

**Bottom Note**

> 同一份产品认知 · 同一个 Campaign 目标 · 草稿、进度与反馈始终在同一个上下文中

### 样式

- 保留现有横向日历工作台，但从“任务看板”升级为“Agent 执行状态”。
- 每张任务卡增加 Agent 名称、Skill 名称和当前状态。
- 今日列继续使用深色高亮，但将首张卡片的状态从简单箭头改为 `Ready for review`。
- 已完成卡片显示 Agent 产物，例如 `3 topic angles generated`、`Reddit draft ready`、`12 directories submitted`。
- 可在看板上方增加一条今日摘要：`6 Agents working · 3 items ready for you · 8 tasks completed automatically`。

---

## 十五、模块 07：Agent vs Founder

### 模块任务

说清自动化能力与用户控制权，避免用户将 NowBuild 误解成纯建议工具或无人值守代运营。

### 文案

**Eyebrow**

> AUTOMATED, WITH YOU IN CONTROL

**H2**

> Agent 负责执行。  
> 你负责最终判断。

**Agent Team 负责**

> **研究、准备、协调和持续推进**

- 研究产品、用户、竞品和市场机会。
- 建立市场假设与 30 天验证路径。
- 调用渠道 Skills 选题、创作和准备发布。
- 自动匹配产品 Directories，准备材料并执行支持的提交。
- 记录执行进度，汇总市场反馈并调整后续工作。

**你负责**

> **核对事实、保持真实并做出关键决定**

- 确认产品事实、目标用户和重要市场判断。
- 审核将以你名义发布的内容。
- 完成外部账号登录、验证码、付费和平台要求的最终确认。
- 和真实用户建立关系，把一手反馈带回系统。

**Trust Note**

> NowBuild 不保存第三方平台密码，也不会绕过登录、验证码、社区规则或最终确认。

### 样式

- 使用黑白左右分屏，左侧深色为 Agent Team，右侧浅色为 Founder。
- 中间使用一条品牌色分界线，在审批相关动作上显示从 Agent 到 Founder 的交接节点。
- Agent 一侧使用勾选和运行状态；Founder 一侧使用确认、锁和对话图标。
- Trust Note 放在两列底部，字号较小但保持清晰可读。

---

## 十六、模块 08：Pricing

### 模块任务

将“免费证明理解”和“付费解锁执行”表达为一条清楚、低风险的购买路径。

### 文案

**Eyebrow**

> START FREE. AUTOMATE WHEN READY.

**H2**

> 先看团队懂不懂你的产品。  
> 再决定是否把执行交给它。

**Description**

> 先免费获得产品与市场方向分析；确认方向后，再以 $49/月组建完整 AI Marketing Agent Team，开启一轮 30 天自动化执行。

### Free Card

**免费市场分析**

> **$0**  
> 先让 Agent 读懂产品，看清市场验证应该从哪里开始。

- 产品、用户、竞品和需求分析。
- 可修正的产品认知与市场假设。
- 推荐的渠道方向与验证重点。
- 不需要信用卡。

**CTA**

> 免费分析我的产品

### Paid Card

**30 天 AI Marketing Agent Team**

> **$49 / 月**  
> 组建一支共享产品认知、调用渠道 Skills 并每天推进执行的 AI 营销团队。

- 完整 30 天 Campaign Blueprint 与行动日历。
- AI Marketing Agents 共享产品记忆和市场假设。
- 28+ Channel Skills 支持选题、内容、社区、视频、SEO 和分发。
- 每天准备好的草稿、制作说明、发布材料和渠道任务。
- 产品 Directories 智能匹配与已支持的自动提交。
- 发布进度、每周复盘、市场信号与下一步建议。

**CTA**

> 组建我的 Agent Team

**Value Note**

> 每天约 30 分钟审核 · 1 个活跃产品 · 1 轮 30 天 Campaign · 随时取消

### 样式

- 使用两张并排方案卡，而不是先展示 Agency 价格对比。
- Free Card 使用白色背景和灰色边框；Paid Card 使用深色背景、品牌色边框和 `Recommended` 标签。
- 在两张卡片之间使用一条箭头或流程文案：`先证明理解 → 再解锁执行`。
- $2,000+ Agency 成本对比不再作为独立大卡，可收缩为 Paid Card 下方的辅助价值标签。
- 删除定价模块里与前文重复的四张价值卡。

---

## 十七、模块 09：FAQ

### 模块任务

不再重复功能介绍，专门解决购买前的疑问和风险感知。

### 推荐问答

**1. NowBuild 到底是什么？**

> NowBuild 是为已经做出产品、但不会做市场增长的独立开发者打造的 AI Marketing Agent Team。团队共享产品认知，调用专业 Channel Skills，在 30 天里连续研究、创作、分发和复盘，帮你用真实反馈验证市场。

**2. 它和直接用 ChatGPT 有什么不同？**

> ChatGPT 更适合完成一次性问答或文案。NowBuild 的多个 Agent 会共享产品记忆、市场假设、渠道计划、发布进度和真实反馈，并调用渠道 Skills 持续推进同一场 Campaign。

**3. Channel Skills 是什么？**

> Channel Skills 是针对不同平台的专业执行方法。例如 Reddit Agent 会先研究社区语境和真实问题；TikTok Agent 会准备 Hook、口播与分镜；SEO Agent 会围绕搜索意图组织关键词和内容集群。它们共享同一个市场目标，但不会把同一篇文案简单改写后四处发布。

**4. NowBuild 可以完全自动发布吗？**

> NowBuild 会自动选题、创作、排期并准备发布材料，在平台允许时辅助打开页面和填写内容。账号登录、验证码、授权、付费、社区规则检查和最终发布可能仍需要你确认。NowBuild 不保存平台密码，也不会绕过平台控制。

**5. Directory 自动提交是怎样工作的？**

> Directory Agent 会先根据产品类型、目标用户和提交要求进行匹配，再准备简介、标签、素材和表单字段，执行已支持的提交流程。是否收录、何时上线、是否收费以及是否提供外链，仍由第三方平台决定。

**6. 30 天能保证我获得用户或收入吗？**

> 不能。NowBuild 承诺的是一套持续执行、有记录、能复盘的市场验证过程，而不是保证流量、排名、用户数或收入。30 天后，你应该获得渠道表现、用户回应、内容资产和下一步决策所需的市场信号。

**7. 免费和 $49 付费版有什么区别？**

> 免费阶段用来让 Agent 读懂你的产品，给出产品与市场方向分析。付费后会组建完整 AI Marketing Agent Team，解锁 30 天 Campaign、渠道 Skills、每日内容与执行任务、Directory 自动提交、发布跟踪和每周复盘。

**8. 可以只买一个月吗？**

> 可以。$49 订阅包含 1 个活跃产品和同时 1 轮 30 天 Campaign，完成一轮后可以随时取消。

### 样式

- 继续使用单列 Accordion，控制在 8 个问题内。
- 问题按“是什么 → 有什么不同 → 如何执行 → 自动化边界 → 付费”排序。
- 与自动发布、Directory 和效果承诺相关的答案保持完整，其他答案尽量控制在 3–4 行。
- 可给 `Agent Team`、`Channel Skills`、`Automated execution` 添加小型文字高亮，但不使用大面积胶囊。

---

## 十八、模块 10：Closing CTA

### 文案

**Eyebrow**

> BUILD YOUR PRODUCT. BUILD YOUR MARKET. BUILD YOUR BUSINESS.

**H2**

> 产品已经上线。  
> 现在，让 AI Marketing Agent Team 开始工作。

**Description**

> 先免费让 Agent 分析你的产品、用户与市场方向。确认它真正读懂以后，再决定是否组建完整团队。

**CTA**

> 免费分析我的产品

**Trust Line**

> 无需信用卡 · 先看分析结果 · 确认后再开启自动化执行

### 样式

- 继续使用深色大圆角品牌区。
- `AI Marketing Agent Team` 使用品牌色，与 Hero Description 的强调方式一致。
- CTA 沿用白色主按钮，悬停后切换为品牌黄绿色。
- 背景可使用非常淡的 Agent 连接线和 Skill 节点，但不再展示渠道 Logo，避免和 Hero 重复。

---

## 十九、全页文案统一规则

### 核心名称

| 用途 | 中文 | 英文 |
|---|---|---|
| 对外产品品类 | AI 营销 Agent Team | AI Marketing Agent Team |
| 单个平台执行者 | 渠道 Agent | Channel Agent |
| 平台专业能力 | 渠道 Skill | Channel Skill |
| 中心用户入口 | 市场合伙人 | Market Partner |
| 30 天执行对象 | 30 天 Campaign | 30-Day Campaign |
| 产品与市场共识 | 共享产品认知 | Shared Product Memory |

### 主要动词

优先使用：

> 研究 · 验证 · 选题 · 创作 · 发布 · 提交 · 跟踪 · 调整

少用抽象表达：

> 赋能 · 增长飞轮 · 全栈 GTM · 行动操作系统 · 智能化解决方案

### 核心结果表达

不把“自动发布”本身当作最终结果，全页应始终回到：

> **帮你用真实市场反馈，验证谁需要这个产品、什么信息有效、哪条增长路径值得继续。**
