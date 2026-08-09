/**
 * 无 OPENROUTER_API_KEY 时的演示模式（Mock）。
 * 让完整的「对话 → 策略 → To-Do → 内容 → 修改」流程在本地零配置可跑通。
 */

import type {
  ChannelChatResponse,
  ChannelTodosResponse,
  ChannelWriteResponse,
  ChatMessage,
  ContextResponse,
  DirectorResponse,
  StrategyResponse,
} from '@/lib/gtm/types';
import { clampChannelContent } from '@/lib/gtm/channel-content-limits';
import { channelName, getChannelCatalog } from './catalog';
import { getChannelDefinition } from './skills/channel-map';
import { SUPPORTED_LAUNCH_CHANNELS } from '@/lib/gtm/launch';
import type { ChannelRecommenderInput } from './channel-recommender';
import type { ChannelRecommendationResponse } from '@/lib/gtm/types';

export function isMockMode(): boolean {
  return !process.env.OPENROUTER_API_KEY;
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* ------------------------------------------------------------------ */
/* 市场总监                                                             */
/* ------------------------------------------------------------------ */

export async function mockDirector(input: {
  history: ChatMessage[];
  message: string;
  hasStrategy: boolean;
  hasTodos: boolean;
  hasChannelRecommendations?: boolean;
  channels: string[];
}): Promise<DirectorResponse> {
  await delay(700);
  const msg = input.message;
  const channelIds = input.channels;
  const websiteUrl = msg.match(/https?:\/\/[^\s<>()]+/i)?.[0];

  if (/(?:新增|添加|加).{0,12}(?:todo|待办|任务)|(?:create|add).{0,12}(?:todo|task)/i.test(msg)) {
    const channelId = channelIds.find((id) => id !== 'directory') ?? getChannelCatalog()[0]?.channelId;
    if (channelId) {
      const date = new Date().toLocaleDateString('en-CA');
      const wantsZh = /中文|中国|简体|zh-?cn/i.test(msg);
      return {
        reply: '我会把这条任务直接加到行动日历。',
        actions: [{
          type: 'create_todo',
          channelId,
          title: msg.slice(0, 120),
          brief: msg,
          date,
          writeNow: /(直接写|写好|成稿|write now|draft it)/i.test(msg),
          ...(wantsZh
            ? {
                outputLocale: 'zh-CN',
                market: '中国大陆',
                audience: '中文用户',
              }
            : {}),
        }],
      };
    }
  }

  if (/(?:搜索|调研|查资料|查一下|search|research)/i.test(msg) && !websiteUrl) {
    return {
      reply: '我会执行网络搜索，再把结论和来源整理成研究报告。',
      actions: [{ type: 'research_query', query: msg, maxSources: 8 }],
    };
  }

  if (/(?:写|起草|撰写|write|draft)/i.test(msg) && /(?:邮件|报告|脚本|帖子|文档|email|report|script|post|document)/i.test(msg)) {
    const artifactType = /(?:邮件|email)/i.test(msg)
      ? 'email'
      : /(?:报告|report)/i.test(msg)
        ? 'report'
        : /(?:脚本|script)/i.test(msg)
          ? 'script'
          : /(?:帖子|post)/i.test(msg)
            ? 'post'
            : 'document';
    return {
      reply: '我会把完整成稿写好并保存到文档工作区。',
      actions: [{ type: 'write_artifact', instruction: msg, artifactType }],
    };
  }

  if (/(推荐|渠道选择|做什么渠道)/.test(msg) || (!input.hasChannelRecommendations && /计划|渠道/.test(msg) && channelIds.length === 0)) {
    return {
      reply: '我先根据你的产品档案和用户背景做渠道推荐，结果会出现在左侧「渠道推荐」页。',
      actions: [{ type: 'recommend_channels' }],
    };
  }

  if (input.hasChannelRecommendations && channelIds.length > 0 && !input.hasStrategy) {
    return {
      reply: `已看到你选了 ${channelIds.length} 个渠道。我现在逐个写渠道计划，完成一个就会推一张卡片。`,
      actions: [{ type: 'generate_channel_plans', channelIds }],
    };
  }

  if (input.hasStrategy && !input.hasTodos) {
    return {
      reply: '渠道计划已经就绪。要我现在为这些渠道生成未来 7 天 Todo 吗？',
      actions: [{ type: 'generate_todos', channelIds: channelIds.length > 0 ? channelIds : getChannelCatalog().slice(0, 4).map((c) => c.channelId) }],
    };
  }

  if (input.hasStrategy && input.hasTodos) {
    if (/(今天|今日|待办|做什么|任务)/.test(msg)) {
      return {
        reply:
          '我会以今天的行动日历为准：先处理带有「需要操作」的事项，再完成已经准备好的内容。已发布内容不会被后续调整覆盖。',
      };
    }
    return {
      reply:
        '计划正在按已确认的市场策略和渠道计划推进。你可以直接告诉我要改哪一部分，我只会更新未来未完成的工作；发布记录保持不变。',
    };
  }

  if (!websiteUrl) {
    return {
      reply:
        '把产品官网链接发给我即可开始。没有官网时，请给我一句产品定义和目标用户；其余缺口我会标成假设，不会卡住整个 Launch。',
    };
  }

  return {
    reply:
      '链接已收到。我会先完成产品研究，再免费生成包含渠道组合、30 天排期和 Directory 计划的市场策略报告；看完报告后再决定是否组建执行团队。',
    actions: [{ type: 'research_product', websiteUrl }],
  };
}

/* ------------------------------------------------------------------ */
/* 策略生成                                                             */
/* ------------------------------------------------------------------ */

const CHANNEL_STRATEGY_TEMPLATES: Record<
  string,
  { positioning: string; direction: string; pillars: string[] }
> = {
  xiaohongshu: {
    positioning: '创始人个人号：一个正在把想法做成产品的人，真实、专业、在场',
    direction: '以「30 天冷启动实验」为叙事主线，用创始人视角持续输出对需求的认知、市场判断与解决用户痛点的干货',
    pillars: ['对需求的认知与市场判断', '解决用户痛点的实操干货', '产品背后的真实故事与数据复盘'],
  },
  user_outreach: {
    positioning: '真实的朋友，而非推销员：先给价值，再谈产品',
    direction: '朋友圈建立「在做一件认真的事」的持续印象，私信做一对一深聊，把强关系转化为第一批种子用户',
    pillars: ['朋友圈进展叙事', '一对一真诚触达', '种子用户社群沉淀'],
  },
  twitter_x: {
    positioning: 'Build in public 的独立开发者：数据透明、观点鲜明',
    direction: '以公开数据和真实进展为核心，产出可直接发布的帖子与 thread，用成稿建立存在感',
    pillars: ['公开数据与里程碑', '行业观点与讨论', '产品演示与迭代'],
  },
  wechat_official: {
    positioning: '领域内的深度思考者：一周一篇长文，建立专业信任',
    direction: '把碎片化输出沉淀为体系化长文，服务搜索流量与深度转化',
    pillars: ['方法论长文', '案例拆解', '行业观察'],
  },
  reddit: {
    positioning: '先做社区成员，再做产品作者',
    direction: '在目标 subreddit 建立发言信用，以「分享经验」而非「推广产品」的姿态渗透',
    pillars: ['经验分享帖', '问答互动', '发布节点帖'],
  },
  linkedin: {
    positioning: '专业领域的从业者视角',
    direction: '以职业化叙事触达 B2B 决策者，输出行业洞见与产品价值',
    pillars: ['行业洞见', '客户案例', '个人职业叙事'],
  },
  product_hunt: {
    positioning: '有备而来的发布者',
    direction: '用 3 周做发布前蓄水（关注者、支持者、素材），第 4 周正式发布冲榜',
    pillars: ['发布前蓄水', '发布日执行', '发布后承接'],
  },
  github_growth: {
    positioning: '开源社区的贡献者',
    direction: '以高质量 README 与 issue 互动带动 star 增长',
    pillars: ['README 优化', '社区互动', '版本发布'],
  },
};

function fallbackTemplate(channelId: string) {
  return (
    CHANNEL_STRATEGY_TEMPLATES[channelId] ?? {
      positioning: '以创始人真实视角运营',
      direction: '围绕用户痛点持续输出有价值的内容，建立信任后自然转化',
      pillars: ['痛点干货', '产品故事', '用户案例'],
    }
  );
}

export async function mockStrategy(input: {
  channelIds: string[];
  feedback?: string;
}): Promise<StrategyResponse> {
  await delay(2500);
  const feedbackNote = input.feedback
    ? `\n\n> 已根据你的补充调整：${input.feedback.slice(0, 120)}\n`
    : '';

  return {
    goal: '30 天内在全部支持渠道建立一致的市场认知，并获得可验证的高意向用户信号',
    overviewMarkdown: `# 30 天冷启动市场策略

## 总体判断

你的产品处于冷启动阶段。全部渠道共享同一定位、目标人群和四周叙事，再由各渠道按原生格式执行。以下内容是没有模型配置时的安全演示骨架，未确认的产品事实必须继续标成假设：${feedbackNote}

| 阶段 | 主题 | 核心动作 |
| --- | --- | --- |
| 第 1 周 | 建立问题认知 | 讲清楚目标用户、问题和当前替代方案 |
| 第 2 周 | 建立可信度 | 用有来源的观察、过程和方法解释判断 |
| 第 3 周 | 展示解决方案 | 用真实场景和已验证能力说明产品 |
| 第 4 周 | 集中 Launch | 聚合已有证据，给出清楚、克制的行动邀请 |

## 方向原则

1. **事实统一**：所有渠道只使用官网来源或用户确认事实
2. **表达原生**：共享 Campaign，不机械复制同一篇内容
3. **节奏合理**：按渠道价值排期，不为了填满 30 天制造任务
4. **证据优先**：没有真实数据、案例或背书时不把它写进文案

## 成功信号

- 第 1 周：核心页面和首批渠道交付进入可执行状态
- 第 2 周：获得可归因的目标用户互动或访问证据
- 第 3 周：形成可验证的问题、异议和使用场景信号
- 第 4 周：保留发布 URL、结果证据和下一轮可检验假设`,
    channels: input.channelIds.map((channelId) => {
      const t = fallbackTemplate(channelId);
      const name = channelName(channelId);
      return {
        channelId,
        channelName: name,
        positioning: t.positioning,
        direction: t.direction,
        contentPillars: t.pillars,
        markdown: `# ${name} · 渠道策略

## 账号定位

${t.positioning}

## 30 天方向

${t.direction}

## 内容支柱

${t.pillars.map((p, i) => `${i + 1}. **${p}**`).join('\n')}

## 节奏建议

- 第 1 周：账号搭建 + 自我介绍 + 痛点观察（建立「你是谁」）
- 第 2 周：干货输出 + 数据复盘（建立「你有料」）
- 第 3 周：互动活动 + 用户故事（建立「你有人」）
- 第 4 周：冲刺活动 + 完整复盘（建立「你能赢」）

## 禁忌

- 不发硬广，所有产品露出必须包在故事或干货里
- 不追热点，除非与你的领域强相关
- 不间断更新，宁可短内容也不断更`,
      };
    }),
  };
}

/* ------------------------------------------------------------------ */
/* 上下文管理                                                           */
/* ------------------------------------------------------------------ */

export async function mockContext(input: {
  recentMessages: ChatMessage[];
  userProfileDoc: string;
  projectProfileDoc: string;
  conversationSummary?: string;
  memoryFacts?: ContextResponse['memoryFacts'];
}): Promise<ContextResponse> {
  await delay(400);
  const userLines = input.recentMessages
    .filter((m) => m.role === 'user')
    .map((m) => `- ${m.content.slice(0, 80)}`)
    .slice(0, 4);

  const userDoc =
    input.userProfileDoc ||
    `# 用户个人档案\n\n## 身份背景\n\n- 暂无已确认身份信息\n\n## 对话中提到\n`;
  const projectDoc =
    input.projectProfileDoc ||
    `# 项目档案\n\n## 产品概况\n\n（随对话持续累积）\n\n## 关键信息\n`;

  return {
    userProfileDoc: `${userDoc}\n${userLines.join('\n')}`.slice(0, 6000),
    projectProfileDoc: `${projectDoc}\n${userLines.join('\n')}`.slice(0, 6000),
    conversationSummary:
      userLines.length > 0
        ? `## 当前讨论\n${userLines.join('\n')}`
        : input.conversationSummary ?? '',
    memoryFacts: input.memoryFacts ?? [],
  };
}

export async function mockChannelRecommendations(
  input: ChannelRecommenderInput
): Promise<ChannelRecommendationResponse> {
  await delay(900);
  const profile = `${input.projectProfileDoc}\n${input.userProfileDoc}`.toLowerCase();
  const dev =
    profile.includes('coding') ||
    profile.includes('developer') ||
    profile.includes('github');
  const china = profile.includes('中文') || profile.includes('小红书');

  const primaryIds = dev
    ? ['hacker_news', 'twitter_x', 'reddit', 'product_hunt']
    : china
      ? ['xiaohongshu', 'wechat_official', 'website_copy']
      : ['linkedin', 'reddit', 'seo', 'product_hunt'];

  const secondaryIds = dev
    ? ['github_growth', 'indie_hackers', 'seo']
    : china
      ? ['seo', 'user_outreach']
      : ['twitter_x', 'indie_hackers'];

  const used = new Set([...primaryIds, ...secondaryIds]);
  const isZh = input.locale !== 'en';

  const toItem = (
    channelId: string,
    priority: ChannelRecommendationResponse['recommendations'][number]['priority'],
    fitScore: number
  ) => {
    const def = getChannelDefinition(channelId);
    return {
      channelId,
      channelName: def ? (isZh ? def.name : def.nameEn) : channelId,
      priority,
      fitScore,
      rationale: def?.description ?? channelId,
      marketFit: isZh ? '演示推荐' : 'Demo recommendation',
      effortLevel: 'medium' as const,
      suggestedCadence: isZh
        ? `每周约 ${def?.postsPerWeek ?? 2} 个交付`
        : `About ${def?.postsPerWeek ?? 2} deliverables per week`,
    };
  };

  const recommendable = SUPPORTED_LAUNCH_CHANNELS.filter(
    (c) => c.channelId !== 'directory'
  );

  const launchPlan = [
    { days: 'Day 1–7', phase: isZh ? '定位与开张' : 'Positioning & setup', objective: isZh ? '统一产品信息并建立首批渠道阵地' : 'Align the message and establish initial channels', channelIds: primaryIds.slice(0, 3), actions: isZh ? ['校准定位和核心 CTA', '完成渠道主页', '发布首批问题认知内容'] : ['Align positioning and CTA', 'Complete channel profiles', 'Publish problem-led content'], successSignal: isZh ? '首批目标用户互动' : 'First target-user interactions' },
    { days: 'Day 8–14', phase: isZh ? '内容验证' : 'Message validation', objective: isZh ? '找到最有反应的信息与渠道' : 'Find the message and channel with the strongest response', channelIds: primaryIds, actions: isZh ? ['持续原生内容', '定向触达', '记录异议与点击'] : ['Publish native content', 'Run targeted outreach', 'Track objections and clicks'], successSignal: isZh ? '至少一个可重复的正向信号' : 'One repeatable positive signal' },
    { days: 'Day 15–21', phase: isZh ? '证据与蓄水' : 'Proof & buildup', objective: isZh ? '把反馈变成可信证据并准备发布' : 'Turn feedback into proof and prepare the launch', channelIds: [...primaryIds, ...secondaryIds.slice(0, 2)], actions: isZh ? ['沉淀演示或案例', '加码有效渠道', '准备发布素材'] : ['Package a demo or case study', 'Double down on effective channels', 'Prepare launch assets'], successSignal: isZh ? '形成可公开证据与支持者名单' : 'Public proof and a supporter list' },
    { days: 'Day 22–30', phase: isZh ? '集中发布与复盘' : 'Launch & review', objective: isZh ? '完成发布并决定下一轮方向' : 'Launch and decide the next growth bet', channelIds: primaryIds, actions: isZh ? ['执行集中发布', '完成 Directory 提交批次', '复盘渠道与转化'] : ['Run the coordinated launch', 'Complete directory batches', 'Review channel and conversion signals'], successSignal: isZh ? '明确加码、调整与停止项' : 'Clear keep, change, and stop decisions' },
  ];
  const directoryPlan = {
    strategy: isZh ? '先准备统一提交资料，再按目标用户匹配度、收录资格和审核速度分两批提交。最适合你的具体平台会在付费后于 Directory 工作区解锁。' : 'Prepare one shared submission kit, then submit in two batches based on audience fit, eligibility, and review speed. Exact best-fit platforms unlock in the paid Directory workspace.',
    priorityCriteria: isZh ? ['目标用户匹配度', '收录资格', '审核速度', '成本与可追踪价值'] : ['Audience fit', 'Eligibility', 'Review speed', 'Cost and trackable value'],
    schedule: [
      { days: 'Day 1–3', objective: isZh ? '准备提交资料' : 'Prepare submission materials', actions: isZh ? ['产品定位与描述', 'Logo、截图、定价与创始人资料'] : ['Positioning and descriptions', 'Logo, screenshots, pricing, and founder details'] },
      { days: 'Day 8–14', objective: isZh ? '第一批高匹配提交' : 'First high-fit batch', actions: isZh ? ['优先快速审核平台', '记录状态与补充项'] : ['Prioritize fast-review platforms', 'Track status and missing fields'] },
      { days: 'Day 22–26', objective: isZh ? 'Launch 同步提交' : 'Launch-timed batch', actions: isZh ? ['更新发布证据', '处理人工验证'] : ['Add launch proof', 'Handle human verification'] },
    ],
  };
  const summaryMarkdown = isZh
    ? '## 执行摘要\n\n产品处于冷启动阶段。先用少量高匹配渠道验证定位与信息，再在第四周集中发布；所有动作围绕同一目标用户和同一转化路径。'
    : '## Executive summary\n\nThe product is at cold start. Validate positioning with a small set of high-fit channels, then coordinate the launch in week four around one audience and one conversion path.';
  const reportMarkdown = `${isZh ? '# 30 天市场策略报告' : '# 30-Day Market Strategy Report'}\n\n${summaryMarkdown}\n\n## ${isZh ? '产品与启动判断' : 'Product and launch diagnosis'}\n\n${isZh ? '先验证目标用户是否对核心问题和价值主张产生反应，再扩大内容与发布动作。当前未确认的信息应作为第一周访谈和触达中的关键假设。' : 'First validate whether the target audience responds to the core problem and value proposition, then expand content and launch activity. Treat unconfirmed inputs as week-one validation hypotheses.'}\n\n## ${isZh ? '30 天 Launch 发布计划' : '30-day launch plan'}\n\n${launchPlan.map((phase) => `### ${phase.days} · ${phase.phase}\n\n${phase.objective}\n\n${phase.actions.map((action) => `- ${action}`).join('\n')}\n\n**${isZh ? '成功信号' : 'Success signal'}：** ${phase.successSignal}`).join('\n\n')}\n\n## ${isZh ? 'Directory 提交计划' : 'Directory submission plan'}\n\n${directoryPlan.strategy}\n\n${directoryPlan.schedule.map((phase) => `### ${phase.days}\n\n${phase.objective}\n\n${phase.actions.map((action) => `- ${action}`).join('\n')}`).join('\n\n')}\n\n## ${isZh ? '立即开始' : 'Start now'}\n\n1. ${isZh ? '确认一句话定位' : 'Confirm the one-line positioning'}\n2. ${isZh ? '建立第一个主渠道主页' : 'Set up the first primary channel'}\n3. ${isZh ? '准备 Directory 统一提交资料' : 'Prepare the shared directory submission kit'}`;

  return {
    reportMarkdown,
    summaryMarkdown,
    diagnosis: {
      productType: dev ? 'dev_tool' : 'b2b_saas',
      growthStage: 'cold-start',
      primaryMarket: china ? '中文区' : '北美',
      bottleneck: isZh ? '分发渠道缺口' : 'distribution gap',
    },
    recommendations: [
      ...primaryIds.map((id) => toItem(id, 'primary', 90)),
      ...secondaryIds.map((id) => toItem(id, 'secondary', 75)),
      ...recommendable
        .filter((c) => !used.has(c.channelId))
        .slice(0, 3)
        .map((c) => toItem(c.channelId, 'explore', 50)),
      ...recommendable
        .filter(
          (c) => !used.has(c.channelId) && !primaryIds.includes(c.channelId)
        )
        .slice(-3)
        .map((c) => toItem(c.channelId, 'skip', 25)),
    ],
    launchPlan,
    directoryPlan,
    specialistSkillsUsed: ['gingiris-growth-finder', 'go-to-market-playbook'],
    updatedAt: Date.now(),
  };
}

/* ------------------------------------------------------------------ */
/* 渠道专员                                                             */
/* ------------------------------------------------------------------ */

const TODO_PATTERNS: Record<string, Array<{ day: number; time: string; title: string; brief: string; phase: string }>> = {
  xiaohongshu: [
    { day: 1, time: '09:00', title: '发布创始人自我介绍帖', brief: '你是谁、为什么做这个产品、你看到的问题', phase: '第 1 周 · 定位与开张' },
    { day: 2, time: '10:00', title: '发布「我看到的需求」认知帖', brief: '讲清楚你对目标用户需求的判断，先共鸣不卖货', phase: '第 1 周 · 定位与开张' },
    { day: 4, time: '09:30', title: '发布行业痛点观察帖', brief: '列出目标用户最疼的 3 个问题', phase: '第 1 周 · 定位与开张' },
    { day: 6, time: '12:00', title: '发布「30 天冷启动实验」开篇', brief: '公开承诺连续 30 天更新，制造追更预期', phase: '第 1 周 · 定位与开张' },
    { day: 8, time: '09:00', title: '发布解决痛点的干货帖', brief: '3 个可落地的方法，其中一个自然引出产品', phase: '第 2 周 · 内容放量' },
    { day: 10, time: '10:00', title: '发布「踩坑帖」', brief: '我做错的 3 件事，自嘲式干货', phase: '第 2 周 · 内容放量' },
    { day: 12, time: '09:30', title: '发布对比帖：手动做 vs 用工具做', brief: '用时间账算给用户看', phase: '第 2 周 · 内容放量' },
    { day: 14, time: '11:00', title: '发布半月数据复盘', brief: '涨粉、阅读、注册数据全公开', phase: '第 2 周 · 内容放量' },
    { day: 16, time: '09:00', title: '发布评论区提问帖草稿', brief: '完整帖文：提问「你最头疼的问题是什么？」并写清抽奖规则与 CTA', phase: '第 3 周 · 互动与转化' },
    { day: 18, time: '10:00', title: '发布完整方法论长文', brief: '把干货串成体系，结尾放产品入口', phase: '第 3 周 · 互动与转化' },
    { day: 20, time: '12:00', title: '发布用户案例故事', brief: '第一批用户怎么用产品解决问题', phase: '第 3 周 · 互动与转化' },
    { day: 23, time: '09:00', title: '发布限时活动帖', brief: '收官福利：前 50 名注册送 XX', phase: '第 4 周 · 冲刺与沉淀' },
    { day: 26, time: '10:00', title: '发布「用户教我的 5 件事」', brief: '把用户反馈精华写成帖子', phase: '第 4 周 · 冲刺与沉淀' },
    { day: 29, time: '10:00', title: '发布 30 天完整复盘', brief: '数据、方法、踩坑、下一步', phase: '第 4 周 · 冲刺与沉淀' },
  ],
  user_outreach: [
    { day: 1, time: '19:00', title: '朋友圈官宣产品启动', brief: '产品截图 + 真诚请求：帮我转给需要的人', phase: '第 1 周 · 定位与开张' },
    { day: 3, time: '11:00', title: '私信 10 位潜在种子用户', brief: '问真问题：你现在怎么解决 X？', phase: '第 1 周 · 定位与开张' },
    { day: 7, time: '18:00', title: '朋友圈发首周复盘', brief: '晒对话截图（打码），感谢帮忙的朋友', phase: '第 1 周 · 定位与开张' },
    { day: 10, time: '14:00', title: '回访第一批私信对象', brief: '发产品更新，附专属体验码', phase: '第 2 周 · 内容放量' },
    { day: 13, time: '19:00', title: '朋友圈发产品使用场景', brief: '一个真实使用瞬间，配一句感受', phase: '第 2 周 · 内容放量' },
    { day: 16, time: '19:00', title: '建立种子用户微信群', brief: '拉进前 20 位活跃用户，定群规', phase: '第 3 周 · 互动与转化' },
    { day: 19, time: '15:00', title: '写群内主题讨论开场帖', brief: '可直接发送的开场文案：抛一个行业话题 + 2 个追问，引导用户语言', phase: '第 3 周 · 互动与转化' },
    { day: 24, time: '11:00', title: '一对一回访 5 位深度用户', brief: '30 分钟访谈：为什么留下来', phase: '第 4 周 · 冲刺与沉淀' },
    { day: 28, time: '18:00', title: '朋友圈发 30 天成绩单', brief: '一张图讲完全部数据', phase: '第 4 周 · 冲刺与沉淀' },
  ],
  twitter_x: [
    { day: 1, time: '21:00', title: 'Build in public 第 1 帖', brief: '晒 MVP + 数据基线，立 30 天 flag', phase: '第 1 周 · 定位与开张' },
    { day: 3, time: '20:00', title: '写引用评论草稿', brief: '针对 1 条相关热帖写可粘贴的引用评论：带你自己的判断，不带链接', phase: '第 1 周 · 定位与开张' },
    { day: 5, time: '21:00', title: '发布产品背后的 why', brief: '为什么这个问题值得解决', phase: '第 1 周 · 定位与开张' },
    { day: 8, time: '21:00', title: '发布第 1 周数据复盘 thread', brief: '真实数字：曝光、私信、注册', phase: '第 2 周 · 内容放量' },
    { day: 11, time: '20:00', title: '发布产品演示短视频', brief: '30 秒屏录 + 字幕', phase: '第 2 周 · 内容放量' },
    { day: 14, time: '21:00', title: '发布半月里程碑', brief: '关键数据 + 学到的一件事', phase: '第 2 周 · 内容放量' },
    { day: 17, time: '21:00', title: '发布用户证言合集推文', brief: '3 张好评截图 + 1 句话总结，展示真实反馈', phase: '第 3 周 · 互动与转化' },
    { day: 21, time: '20:00', title: '发布行业观点 thread', brief: '一个有争议的判断 + 论据', phase: '第 3 周 · 互动与转化' },
    { day: 25, time: '21:00', title: '发布产品迭代路线图', brief: '根据反馈公布下一步，邀请投票', phase: '第 4 周 · 冲刺与沉淀' },
    { day: 30, time: '20:00', title: '发布收官 thread + 致谢', brief: '@帮助过你的人，宣布下个目标', phase: '第 4 周 · 冲刺与沉淀' },
  ],
  // 官网/落地页：一个个具体建设任务（设计、文案、SEO、外链），不是抽象实验
  website_copy: [
    { day: 1, time: '14:00', title: '设计落地页 Hero 区', brief: '一句话说清给谁解决什么问题，配真实产品截图', phase: '第 1 周 · 定位与开张' },
    { day: 3, time: '14:00', title: '编写功能区文案', brief: '3 个核心功能各配一句结果导向的描述', phase: '第 1 周 · 定位与开张' },
    { day: 5, time: '14:00', title: '编写 SEO 标题与 meta 描述', brief: '首页与核心页面各定一个目标关键词', phase: '第 1 周 · 定位与开张' },
    { day: 7, time: '14:00', title: '新增 FAQ 模块并编写 6 条问答', brief: '把私信里被问最多的问题沉淀到落地页', phase: '第 1 周 · 定位与开张' },
    { day: 9, time: '10:00', title: '提交站点到 5 个产品目录站', brief: '外链建设：BetaList、AlternativeTo 等逐个提交', phase: '第 2 周 · 内容放量' },
    { day: 12, time: '14:00', title: '新增用户案例页', brief: '把第一个用户故事做成独立页面，配数据与截图', phase: '第 2 周 · 内容放量' },
    { day: 14, time: '14:00', title: '发布第 1 篇 SEO 博客', brief: '瞄准一个用户真实会搜的长尾关键词', phase: '第 2 周 · 内容放量' },
    { day: 17, time: '14:00', title: '编写「关于我们」页', brief: '创始人故事 + 产品理念，建立信任', phase: '第 3 周 · 互动与转化' },
    { day: 19, time: '10:00', title: '建设内链与交换 3 条外链', brief: '博客互链 + 找相关站点交换外链', phase: '第 3 周 · 互动与转化' },
    { day: 22, time: '14:00', title: '新增社会证明区', brief: '用户证言、数据、媒体报道放到首屏下方', phase: '第 4 周 · 冲刺与沉淀' },
    { day: 26, time: '14:00', title: '用真实数据更新落地页', brief: '把占位文案换成真实用户数与证言', phase: '第 4 周 · 冲刺与沉淀' },
    { day: 29, time: '14:00', title: '发布博客版 30 天复盘长文', brief: '沉淀成 SEO 长文，持续带来搜索流量', phase: '第 4 周 · 冲刺与沉淀' },
  ],
};

const GENERIC_PATTERN = [
  { day: 2, time: '10:00', title: '完成账号 / 阵地搭建', brief: '资料、简介、头图全部对齐定位', phase: '第 1 周 · 定位与开张' },
  { day: 5, time: '10:00', title: '发布第一篇内容', brief: '自我介绍 + 你在解决的问题', phase: '第 1 周 · 定位与开张' },
  { day: 9, time: '10:00', title: '发布干货内容', brief: '解决目标用户一个具体痛点', phase: '第 2 周 · 内容放量' },
  { day: 13, time: '10:00', title: '发布产品故事', brief: '产品背后的决策与取舍', phase: '第 2 周 · 内容放量' },
  { day: 17, time: '10:00', title: '写投票/征集反馈帖草稿', brief: '完整可发布正文：一个具体问题 + 2–3 个选项或追问', phase: '第 3 周 · 互动与转化' },
  { day: 21, time: '10:00', title: '发布用户案例', brief: '真实使用场景与结果', phase: '第 3 周 · 互动与转化' },
  { day: 25, time: '10:00', title: '发布冲刺活动', brief: '限时福利拉新', phase: '第 4 周 · 冲刺与沉淀' },
  { day: 29, time: '10:00', title: '发布 30 天复盘', brief: '数据与方法全公开', phase: '第 4 周 · 冲刺与沉淀' },
];

function channelMarketInfo(channelId: string): { market: string; audience: string } {
  const def = getChannelDefinition(channelId);
  const locales = def?.locales ?? ['zh'];
  const enOnly = locales.length === 1 && locales[0] === 'en';
  const zhOnly = locales.length === 1 && locales[0] === 'zh';
  return {
    market: enOnly ? 'United States' : zhOnly ? '中国大陆' : '中国大陆 / United States',
    audience: enOnly
      ? 'Indie hackers and solo founders shipping side projects'
      : '正在做 side project 的独立开发者与一人公司创始人',
  };
}

export async function mockChannelTodos(input: {
  channelId: string;
  windowStartDay?: number;
  windowEndDay?: number;
}): Promise<ChannelTodosResponse> {
  await delay(1800);
  const pattern = TODO_PATTERNS[input.channelId] ?? GENERIC_PATTERN;
  const startDay = input.windowStartDay ?? 1;
  const endDay = input.windowEndDay ?? Math.min(30, startDay + 6);
  const definition = getChannelDefinition(input.channelId);
  const { market, audience } = channelMarketInfo(input.channelId);
  return {
    todos: pattern
      .filter((p) => p.day >= startDay && p.day <= endDay)
      .map((p) => ({
      dayIndex: p.day,
      title: p.title,
      brief: p.brief,
      time: p.time,
      phase: p.phase,
      market,
      audience,
      purpose: p.phase,
      pillar: p.phase,
      taskType: definition?.defaultTaskTypes[0] ?? 'content',
        launchStatus: 'draft',
      })),
  };
}

export async function mockChannelWrite(input: {
  title: string;
  brief: string;
  channelId: string;
}): Promise<ChannelWriteResponse> {
  await delay(1500);
  const drafted = {
    title: input.title.replace(/^发布/, '').replace(/帖$/, ''),
    body: `【安全演示草稿 · 发布前请补充真实细节】

主题：${input.title}

核心方向：${input.brief}

这里需要补充一项可验证的真实材料，例如产品截图、官网公开能力、Founder 的真实观察或已有用户反馈。没有证据时，不加入数字、客户案例、效果承诺或个人经历。

补充材料后，再按当前渠道的原生格式完成开头、正文和行动邀请。`,
  };
  return clampChannelContent(input.channelId, drafted);
}

export async function mockChannelChat(input: {
  message: string;
  todoTitle: string;
  currentBody?: string;
  channelId?: string;
}): Promise<ChannelChatResponse> {
  await delay(1200);
  const msg = input.message;

  if (/(整个|全部|30\s*天|计划|方向|重排)/.test(msg)) {
    const { market, audience } = channelMarketInfo(input.channelId ?? '');
    return {
      reply:
        '明白，我把这个渠道整个 30 天的 To-Do 方向重新排了一版：前两周更侧重你刚才说的方向，后两周保持转化节奏。新的计划已经更新到日历里，你可以随时再叫我调整。',
      rewritePlan: GENERIC_PATTERN.map((p) => ({
        dayIndex: p.day,
        title: p.title,
        brief: `${p.brief}（已按你的反馈调整方向）`,
        time: p.time,
        phase: p.phase,
        market,
        audience,
        purpose: p.phase,
        pillar: p.phase,
        taskType: 'content',
        launchStatus: p.day <= 7 ? 'draft' : 'planned',
      })),
    };
  }

  if (/(改|重写|语气|口吻|短|长|不满意|换)/.test(msg)) {
    const durable = /(以后|后续|所有|始终|都这样)/.test(msg);
    return {
      reply: durable
        ? '收到，我按你的意见改了当前内容，并把它作为这个渠道未来未发布内容的长期偏好。'
        : '收到，我只按你的意见修改了当前内容，没有改变其他任务或长期语气。',
      rewriteContent: {
        title: input.todoTitle.replace(/^发布/, ''),
        body: `${(input.currentBody ?? '').split('\n')[0] || '这条内容我重写了一版。'}

按你说的，这版我做了三个调整：

- 开头直接进入正题，砍掉了铺垫
- 把套话换成了你的真实经历
- 结尾的行动引导更自然，不硬转

${input.message.slice(0, 60)}

${durable ? '这项要求会用于本渠道未来未发布内容。' : '这项要求只用于当前这条内容。'}`,
      },
    };
  }

  return {
    reply:
      '这条内容的思路是：用你的真实经历做钩子，把产品包在故事里说。如果你想让我改内容，直接告诉我哪里不对味（比如「太官方了」「开头太啰嗦」）；如果想调整这个渠道整个 30 天的方向，也可以直接说，我可以整体重排。',
  };
}
