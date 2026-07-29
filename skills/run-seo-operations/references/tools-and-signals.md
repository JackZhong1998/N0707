# SEO 工具与信号地图

## 目录

1. 必需工具
2. 可选工具
3. 信号到动作映射
4. 自动化输入输出

## 1. 必需工具

| 目的 | 工具 | 使用频率 | 主要输出 |
|---|---|---|---|
| Google 搜索表现 | Google Search Console Performance | 每日异常检查、每周分析 | query/page/country/device 的 clicks、impressions、CTR、position |
| Google 索引状态 | Page Indexing、URL Inspection、Sitemaps | 每周/月及发布后 | 已索引、未索引原因、canonical、抓取状态 |
| Bing 搜索与通知 | Bing Webmaster Tools、IndexNow | 每周及 URL 变化后 | 搜索表现、提交、抓取、收录 |
| 用户与转化 | GA4、Plausible、PostHog 或产品数据库 | 每日异常、每周/月分析 | landing page、转化、收入或产品事件 |
| 页面体验 | PageSpeed Insights、Lighthouse、CrUX | 发布后与月度 | performance、accessibility、SEO、Core Web Vitals |
| 结构化数据 | Rich Results Test、Schema Markup Validator | 结构化数据变更后 | 语法、支持类型和警告 |
| 站点爬取 | Screaming Frog、Sitebulb 或自建 crawler | 小站月度、大站按需 | 状态码、canonical、标题、深度、孤岛和重复 |
| 代码与发布 | Git、CI、框架构建、浏览器测试 | 每次代码变化 | diff、类型、测试、构建和渲染结果 |

工具不能替代判断。Search Console 的平均排名是聚合指标，数据可能延迟、抽样或受隐私处理；分析时必须结合页面、查询、国家、设备和日期。

## 2. 可选工具

- Ahrefs、Semrush、Moz：竞品、链接与关键词数据库；属于第三方估算，不作为自身流量事实。
- 日志分析：用于大站抓取行为和 crawl budget 问题。
- Rank tracker：适合固定关键词监测，但不能替代真实 query 数据。
- 内容 inventory/数据库：记录 URL、意图、负责人、最后实质更新、状态和实验。
- 监控服务：检查 uptime、5xx、证书和关键页面变化。

## 3. 信号到动作映射

| 信号 | 先检查 | 常见动作 | 不应立刻做 |
|---|---|---|---|
| 展现增长、位置 8–30 | 查询意图、页面匹配、内链 | 补答案、证据、章节和相关内链 | 新建重复页面 |
| 排名前 10、CTR 低 | SERP、标题承诺、品牌/非品牌 | 改 title/description，使承诺更准确 | 标题党或虚假数字 |
| 点击/展现突然下降 | 部署、状态码、索引、季节、查询结构 | 先排事故，再比较同期与细分数据 | 当天大规模重写 |
| 已抓取未收录 | 内容独特性、canonical、重复、内链 | 合并/增强内容并改善发现路径 | 重复提交同一 URL |
| 自然流量高、转化低 | 查询相关性、CTA、页面速度、产品匹配 | 对齐下一步并减少摩擦 | 只追求更多流量 |
| CWV/性能差 | 真实用户数据与模板范围 | 优化影响最多页面的共享组件 | 为分数删除关键内容 |
| 多页争同一意图 | 页面地图、查询重叠、链接 | 明确分工或合并重定向 | 再发一篇同主题文章 |

## 4. 自动化输入输出

### 推荐输入

- Search Console query/page CSV 或 API 数据；
- Analytics landing page 与 conversion 数据；
- 公开 URL inventory；
- sitemap、robots、crawl export；
- 最近部署 diff 和上一期 SEO 日报；
- 产品定位、目标市场、业务转化与禁止声明。

### 推荐输出

- 今日一个优先任务；
- 证据、假设与影响 URL；
- 实际 diff；
- 验证结果；
- 需要观察的指标与时间窗口；
- 下一任务建议；
- 需要人工决定或授权的事项。

没有可靠输入时，自动化应退回到技术基线检查或“不修改”，而不是编造关键词和流量机会。
