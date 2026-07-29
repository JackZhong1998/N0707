# NowBuild SEO 蓝图

> 更新：2026-07-22  
> 目标：用“产品推广意图”获取正在准备上线、但缺少系统推广方法的独立开发者和一人公司。

## 1. SEO 定位

NowBuild 不应与泛“AI 写作”产品竞争。最容易建立认知的品类是：

**AI 驱动的 30 天产品推广系统 / AI-powered 30-day product marketing system for solo founders**

这里的 AI 修饰的是“推广系统”，不是“用户的产品”。NowBuild 自身是 AI 产品，但它服务的产品可以是 SaaS、App、浏览器插件、开源项目、课程、模板、咨询或其他类型，不必是 AI 产品。

首页需要在第一屏同时回答四件事：

1. 给谁：已经做出产品的独立开发者。
2. 解决什么：不知道如何开始、去哪里发、每天发什么。
3. 交付什么：连续 30 天的渠道策略、内容日历、每日草稿和发布协助。
4. 与通用 AI 有什么不同：多渠道共用同一定位，但分别使用平台原生方法，每天内容前后相连。

## 2. 关键词与页面集群

| 集群 | 英文搜索意图 | 中文搜索意图 | 承接页 | 转化动作 |
|---|---|---|---|---|
| 核心品类 | AI-powered product marketing, AI marketing automation, product launch planning software | AI 驱动的产品推广、产品推广自动化、产品冷启动工具 | 首页 | 免费生成计划 |
| 时间型方案 | 30-day product launch plan, SaaS launch checklist | 30 天产品推广计划、SaaS 上线清单 | 30 天路线图文章 / 未来 Pillar Page | 生成本产品版计划 |
| ICP | marketing for solo founders, indie hacker marketing | 独立开发者推广、一人公司获客 | 首页 + 指南 | 导入产品网址 |
| 早期用户 | how to get first 100 users, launch without ads | 前 100 个用户、不花广告费获客 | 现有博客文章 | 预览第一周行动 |
| 渠道选择 | first marketing channel, Reddit marketing for SaaS, LinkedIn founder content | 第一个推广渠道、小红书推广 SaaS | 渠道选择文章 + 后续渠道页 | 让 Agent 推荐渠道 |
| 目录分发 | SaaS directories, AI tool directories, submit startup | SaaS 导航站、AI 工具收录、提交产品目录 | `/directories` | 筛选目录 / 申请代提交 |
| 替代方案 | ChatGPT marketing workflow, Buffer alternative for strategy | ChatGPT 做营销、营销日历工具对比 | 对比页（第二阶段） | 免费体验差异 |

注：在还没有 Google Search Console 查询数据前，这是按“搜索意图与产品匹配度”排的优先级，不是搜索量预测。

## 3. 页面架构

```text
/
├─ /pricing
├─ /directories
├─ /blog
│  ├─ /product-done-now-what
│  ├─ /how-to-choose-first-channel
│  └─ /first-100-users-without-ads
├─ 第二阶段：/solutions/solo-founder-marketing
├─ 第二阶段：/solutions/product-launch-automation
├─ 第二阶段：/channels/reddit-marketing
├─ 第二阶段：/channels/linkedin-founder-content
├─ 第二阶段：/channels/seo-content-cluster
└─ 第二阶段：/compare/chatgpt-vs-nowbuild
```

原则：一个主意图只由一个主页承接，避免首页、博客和方案页争抢同一个关键词。博客回答“怎么做”，方案页回答“用什么做”。

## 4. 90 天执行计划

### 第 1–2 周：把索引基础变干净

- 只把公开营销页放入 sitemap，`/app/*`、登录与 API 页全部排除。
- 核对 canonical、`hreflang=en/zh/x-default`和两个语言版本的双向对应。
- 提交 Google Search Console 和 Bing Webmaster Tools；记录当前有效索引数、查询数和品牌词占比。
- 保持 `llms.txt`、结构化数据、定价页与实际产品交付一致。

### 第 3–6 周：建立两个主题集群

- 集群 A：“30 天产品冷启动”，包含路线图、渠道选择、内容日历、首周复盘。
- 集群 B：“产品目录提交”，包含 AI 工具、SaaS、开源项目和浏览器插件四个类型。
- 每篇文章必须有一个 30–50 字直接答案、3–5 个真实问题 FAQ、2–3 个站内链接以及一个与搜索意图一致的 CTA。
- 不编造客户 Logo、用户数、排名、流量或“平均提升”类数字。

### 第 7–12 周：扩展商业意图页

- 上线 solo founder marketing、AI product launch 两个方案页。
- 在确保功能对比可验证后，上线 ChatGPT / Buffer / Notion 对比页。
- 把真实的用户访谈、产品操作截图、公开案例和发布结果添加到相应页，增强可信度。
- 每两周用 GSC 查询数据做一次取舍：优先更新排名 11–30 且展现持续增长的页，而不是一直发新文。

## 5. 每个页面的内容模板

1. **Title**：主搜索意图前置，尽量保持在搜索结果可完整展示的长度。
2. **H1**：用用户的话明确说出结果，不重复品牌口号。
3. **直接答案**：第一屏用 2–3 句回答问题，同时说明产品如何帮忙。
4. **可验证机制**：用产品截图、步骤、输出样例和能力边界代替空泛信任词。
5. **异议处理**：定价、适用人群、不适用情况、需要用户亲自确认的步骤。
6. **内链**：链向一个上级 Hub、两个相关指南和一个产品转化页。

## 6. 衡量

### 领先指标

- 非品牌查询的有效索引页数、展现、点击和前 30 名查询数。
- 首页 → 指南、指南 → 免费生成计划的内链点击率。
- 每个主题集群的收录率与查询覆盖数。

### 产品指标

- SEO 着陆页访客 → 提交产品网址。
- 提交产品网址 → 完成产品资料。
- 完成产品资料 → 生成第一周预览。
- 指南集群带来的注册和付费占比。

不要只看总自然流量。NowBuild 真正需要的是“已有产品、准备开始推广”这类查询带来的资料提交和计划生成。

## 7. 本次重设计的决策来源

- `nowbuild-website-conversion`：首页只保留一个主转化目标，先说结果和适用人群，所有信任信息必须可验证。
- `startup-marketing-playbook`：围绕低成本自然渠道建立内容与社区分发系统，而不是把 SEO 孤立为发文任务。
- `gr-blog-post`：为指南添加直接答案、真实 FAQ、内链、canonical 与多语言对应；避免重复主题和虚构数字。

官方 skill 在线清单本次请求时返回 HTTP 403，因此没有安装新 skill；上述三份是仓库内已有、与当前产品最相关的参考。
