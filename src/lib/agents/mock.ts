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
import { channelName } from './catalog';

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
  channels: string[];
}): Promise<DirectorResponse> {
  await delay(700);
  const assistantTurns = input.history.filter((m) => m.role === 'assistant').length;
  const msg = input.message;

  // 已有策略：确认后派发渠道专员生成 To-Do
  if (input.hasStrategy && !input.hasTodos) {
    if (/(确认|没问题|可以|开始|生成|ok|好的|同意)/i.test(msg)) {
      return {
        reply:
          '收到，策略正式生效。我现在把各渠道的渠道专员叫起来，让他们按这份策略排出未来 30 天每天要做的事。排完之后你在「每日行动日历」里就能看到了 — 我们真正的 Go-to-Market 从今天开始。',
        actions: [{ type: 'generate_todos', channelIds: input.channels }],
      };
    }
    return {
      reply:
        '策略我已经放到「市场策略」页面了，你可以先过一遍。有任何想调整的直接告诉我（比如你的个人背景、想强调的方向），我让策略组改。如果没问题，回复「确认」，我就安排各渠道专员去排 30 天的执行计划。',
    };
  }

  // 已有完整计划：陪伴执行 + 支持新增渠道 / 调整
  if (input.hasStrategy && input.hasTodos) {
    const addChannel = matchChannel(msg);
    if (addChannel && !input.channels.includes(addChannel)) {
      return {
        reply: `好眼光，${channelName(addChannel)} 值得一做。我让策略组针对这个渠道补一份方向文档，完成后会出现在市场策略页，对应的渠道专员也会把 30 天的 To-Do 排进你的日历。`,
        actions: [
          { type: 'generate_strategy', channelIds: [addChannel] },
          { type: 'generate_todos', channelIds: [addChannel] },
        ],
      };
    }
    if (/(今天|今日|待办|做什么|任务)/.test(msg)) {
      return {
        reply:
          '我看了你今天的日历（见下方）。挑一条先做起来，做内容的部分点进详情页，渠道专员已经把初稿准备好了 — 你只需要过一遍、改成你的语气，然后发布。完成后记得勾掉，我在看着你呢。',
      };
    }
    if (/(改|调整|不满意|重新)/.test(msg)) {
      return {
        reply:
          '可以。策略层面的调整告诉我，我让策略组重写对应渠道的方向文档；单条内容的调整你直接在那条 To-Do 的详情页跟渠道专员说，那边改起来更快。你想动哪一部分？',
      };
    }
    return {
      reply:
        '计划在正常推进。记住我们的节奏：每天完成日历上的事，不需要完美，需要持续。有卡住的地方随时叫我 — 你不是一个人在 go to market。',
    };
  }

  // 冷启动问询阶段（按轮次推进）
  if (assistantTurns === 0) {
    return {
      reply:
        '你好，我是你的市场总监。接下来 30 天，我会带着你把产品真正推向市场 — 你负责做产品，市场的事有我。\n\n先让我认识一下你的产品：它是什么？解决了什么问题？目前是还在规划中，还是已经上线了？',
    };
  }

  if (assistantTurns === 1) {
    return {
      reply:
        '明白了，这个方向有戏。再往深挖一层：你觉得最需要这个产品的是哪一类人？如果只能用一句话说服他们，你会说什么（也就是你的核心价值）？',
    };
  }

  if (assistantTurns === 2) {
    return {
      reply: '很好，画像清楚了。接下来是市场偏好 — 直接勾选就行：',
      optionCard: {
        question: '你的目标市场主要在哪里？',
        multi: false,
        options: [
          { id: 'cn', label: '国内市场', description: '小红书、公众号、私域为主' },
          { id: 'global', label: '海外市场', description: 'Twitter/X、Product Hunt、Reddit 为主' },
          { id: 'both', label: '国内外都要', description: '双线并行，节奏略慢但覆盖广' },
        ],
      },
    };
  }

  if (assistantTurns === 3) {
    return {
      reply: '收到。基于你的产品和市场，我建议优先做这几个渠道 — 选出你愿意投入的（可多选）：',
      optionCard: {
        question: '首发渠道选哪些？',
        multi: true,
        options: [
          { id: 'xiaohongshu', label: '小红书', description: '公域种草，适合冷启动讲故事' },
          { id: 'user_outreach', label: '私域 / 朋友圈', description: '转化路径最短的渠道' },
          { id: 'twitter_x', label: 'Twitter / X', description: 'Build in public，海外主阵地' },
          { id: 'wechat_official', label: '微信公众号', description: '长文深度内容沉淀' },
          { id: 'reddit', label: 'Reddit', description: '海外社区渗透' },
          { id: 'linkedin', label: 'LinkedIn', description: 'B2B 决策者触达' },
        ],
      },
    };
  }

  if (assistantTurns === 4) {
    return {
      reply: '好，渠道定了。最后一个问题 — 你的冷启动更想以什么方式打？',
      optionCard: {
        question: '冷启动方式偏好',
        multi: false,
        options: [
          { id: 'founder', label: '创始人个人号', description: '以你本人的故事和视角输出（推荐）' },
          { id: 'brand', label: '品牌官方号', description: '以产品品牌的身份运营' },
          { id: 'mixed', label: '两者结合', description: '个人号讲故事，官方号做承接' },
        ],
      },
    };
  }

  // 信息足够 → 调用策略生成 Agent
  const channels = input.channels.length > 0 ? input.channels : ['xiaohongshu', 'user_outreach'];
  return {
    reply:
      '信息足够了。我现在把策略组（策略生成 Agent）叫起来，基于我们刚才聊的这些，给你产出一份 30 天冷启动市场策略：包含总体方向、每个渠道的账号定位和内容规划。生成需要一点时间，完成后我会用卡片的形式给你，稍等。',
    actions: [{ type: 'generate_strategy', channelIds: channels }],
  };
}

function matchChannel(msg: string): string | null {
  const pairs: Array<[RegExp, string]> = [
    [/小红书/, 'xiaohongshu'],
    [/(朋友圈|私域|微信群)/, 'user_outreach'],
    [/(twitter|推特|x\s)/i, 'twitter_x'],
    [/公众号/, 'wechat_official'],
    [/reddit/i, 'reddit'],
    [/linkedin|领英/i, 'linkedin'],
    [/product\s*hunt/i, 'product_hunt'],
    [/github/i, 'github_growth'],
  ];
  for (const [re, id] of pairs) {
    if (re.test(msg)) return id;
  }
  return null;
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
    direction: '以公开数据和真实进展为核心内容，参与社区讨论建立存在感，用 thread 做深度输出',
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
    goal: '30 天内获得第一批 100 位真实用户，验证核心价值主张',
    overviewMarkdown: `# 30 天冷启动市场策略

## 总体判断

你的产品处于冷启动阶段，此时最重要的不是规模化投放，而是**用创始人的真实视角换取第一批用户的信任**。我们把 30 天分成四个阶段：${feedbackNote}

| 阶段 | 主题 | 核心动作 |
| --- | --- | --- |
| 第 1 周 | 定位与开张 | 立住账号人设，讲清楚你是谁、在解决什么问题 |
| 第 2 周 | 内容放量 | 干货 + 故事双线输出，测试哪类内容有共鸣 |
| 第 3 周 | 互动与转化 | 把观众变成对话，把对话变成种子用户 |
| 第 4 周 | 冲刺与沉淀 | 数据复盘公开化，沉淀方法论与用户资产 |

## 方向原则

1. **人比品牌先行**：冷启动期所有内容以创始人第一人称输出
2. **透明是最大的钩子**：公开数据、公开踩坑、公开决策
3. **每天一件事**：不追求爆款，追求 30 天不断更
4. **所有渠道服务一个转化点**：把流量导向你的产品或私域

## 成功信号

- 第 1 周：完成全部账号搭建，发出前 5 篇内容
- 第 2 周：出现第一批主动评论 / 私信
- 第 3 周：拿到 20+ 有效对话，转化第一批种子用户
- 第 4 周：100 位真实用户，形成可复盘的增长认知`,
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
}): Promise<ContextResponse> {
  await delay(400);
  const userLines = input.recentMessages
    .filter((m) => m.role === 'user')
    .map((m) => `- ${m.content.slice(0, 80)}`)
    .slice(0, 4);

  const userDoc =
    input.userProfileDoc ||
    `# 用户个人档案\n\n## 身份背景\n\n- 独立开发者 / 一人公司创始人\n\n## 对话中提到\n`;
  const projectDoc =
    input.projectProfileDoc ||
    `# 项目档案\n\n## 产品概况\n\n（随对话持续累积）\n\n## 关键信息\n`;

  return {
    userProfileDoc: `${userDoc}\n${userLines.join('\n')}`.slice(0, 6000),
    projectProfileDoc: `${projectDoc}\n${userLines.join('\n')}`.slice(0, 6000),
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
    { day: 16, time: '09:00', title: '发起评论区提问活动', brief: '「你最头疼的问题是什么？」抽 3 人送咨询', phase: '第 3 周 · 互动与转化' },
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
    { day: 19, time: '15:00', title: '群内发起主题讨论', brief: '抛一个行业话题，收集用户语言', phase: '第 3 周 · 互动与转化' },
    { day: 24, time: '11:00', title: '一对一回访 5 位深度用户', brief: '30 分钟访谈：为什么留下来', phase: '第 4 周 · 冲刺与沉淀' },
    { day: 28, time: '18:00', title: '朋友圈发 30 天成绩单', brief: '一张图讲完全部数据', phase: '第 4 周 · 冲刺与沉淀' },
  ],
  twitter_x: [
    { day: 1, time: '21:00', title: 'Build in public 第 1 帖', brief: '晒 MVP + 数据基线，立 30 天 flag', phase: '第 1 周 · 定位与开张' },
    { day: 3, time: '20:00', title: '回复 5 条同领域大 V 推文', brief: '带观点评论，不带链接', phase: '第 1 周 · 定位与开张' },
    { day: 5, time: '21:00', title: '发布产品背后的 why', brief: '为什么这个问题值得解决', phase: '第 1 周 · 定位与开张' },
    { day: 8, time: '21:00', title: '发布第 1 周数据复盘 thread', brief: '真实数字：曝光、私信、注册', phase: '第 2 周 · 内容放量' },
    { day: 11, time: '20:00', title: '发布产品演示短视频', brief: '30 秒屏录 + 字幕', phase: '第 2 周 · 内容放量' },
    { day: 14, time: '21:00', title: '发布半月里程碑', brief: '关键数据 + 学到的一件事', phase: '第 2 周 · 内容放量' },
    { day: 17, time: '21:00', title: '邀请用户公开反馈', brief: '转发好评并认真回复', phase: '第 3 周 · 互动与转化' },
    { day: 21, time: '20:00', title: '发布行业观点 thread', brief: '一个有争议的判断 + 论据', phase: '第 3 周 · 互动与转化' },
    { day: 25, time: '21:00', title: '发布产品迭代路线图', brief: '根据反馈公布下一步，邀请投票', phase: '第 4 周 · 冲刺与沉淀' },
    { day: 30, time: '20:00', title: '发布收官 thread + 致谢', brief: '@帮助过你的人，宣布下个目标', phase: '第 4 周 · 冲刺与沉淀' },
  ],
};

const GENERIC_PATTERN = [
  { day: 2, time: '10:00', title: '完成账号 / 阵地搭建', brief: '资料、简介、头图全部对齐定位', phase: '第 1 周 · 定位与开张' },
  { day: 5, time: '10:00', title: '发布第一篇内容', brief: '自我介绍 + 你在解决的问题', phase: '第 1 周 · 定位与开张' },
  { day: 9, time: '10:00', title: '发布干货内容', brief: '解决目标用户一个具体痛点', phase: '第 2 周 · 内容放量' },
  { day: 13, time: '10:00', title: '发布产品故事', brief: '产品背后的决策与取舍', phase: '第 2 周 · 内容放量' },
  { day: 17, time: '10:00', title: '发起互动', brief: '提问 / 投票 / 征集反馈', phase: '第 3 周 · 互动与转化' },
  { day: 21, time: '10:00', title: '发布用户案例', brief: '真实使用场景与结果', phase: '第 3 周 · 互动与转化' },
  { day: 25, time: '10:00', title: '发布冲刺活动', brief: '限时福利拉新', phase: '第 4 周 · 冲刺与沉淀' },
  { day: 29, time: '10:00', title: '发布 30 天复盘', brief: '数据与方法全公开', phase: '第 4 周 · 冲刺与沉淀' },
];

export async function mockChannelTodos(input: {
  channelId: string;
}): Promise<ChannelTodosResponse> {
  await delay(1800);
  const pattern = TODO_PATTERNS[input.channelId] ?? GENERIC_PATTERN;
  return {
    todos: pattern.map((p) => ({
      dayIndex: p.day,
      title: p.title,
      brief: p.brief,
      time: p.time,
      phase: p.phase,
    })),
  };
}

export async function mockChannelWrite(input: {
  title: string;
  brief: string;
  channelId: string;
}): Promise<ChannelWriteResponse> {
  await delay(1500);
  return {
    title: input.title.replace(/^发布/, '').replace(/帖$/, ''),
    body: `说实话，写这条之前我犹豫了很久要不要发。

${input.brief}——这件事我最近想了很多。做产品的这段时间，我发现大多数人卡住的地方其实不是「不会做」，而是「不知道自己做的东西有没有人要」。

我自己也一样。所以我决定把过程摊开来讲：

1. 我看到的问题是什么
2. 我试过哪些解法（包括失败的）
3. 现在的产品是怎么一步步长出来的

不装专家，只说我真实踩过的坑和验证过的东西。

如果你也在经历类似的阶段，评论区聊聊——我会认真回每一条。

（这是我 30 天冷启动实验的一部分，全程公开数据，欢迎围观。）`,
  };
}

export async function mockChannelChat(input: {
  message: string;
  todoTitle: string;
  currentBody?: string;
}): Promise<ChannelChatResponse> {
  await delay(1200);
  const msg = input.message;

  if (/(整个|全部|30\s*天|计划|方向|重排)/.test(msg)) {
    return {
      reply:
        '明白，我把这个渠道整个 30 天的 To-Do 方向重新排了一版：前两周更侧重你刚才说的方向，后两周保持转化节奏。新的计划已经更新到日历里，你可以随时再叫我调整。',
      rewritePlan: GENERIC_PATTERN.map((p) => ({
        dayIndex: p.day,
        title: p.title,
        brief: `${p.brief}（已按你的反馈调整方向）`,
        time: p.time,
        phase: p.phase,
      })),
    };
  }

  if (/(改|重写|语气|口吻|短|长|不满意|换)/.test(msg)) {
    return {
      reply: '收到，我按你的意见改了一版，语气更贴近你平时说话的样子。内容区已经更新，你看看这版感觉对不对。',
      rewriteContent: {
        title: input.todoTitle.replace(/^发布/, ''),
        body: `${(input.currentBody ?? '').split('\n')[0] || '这条内容我重写了一版。'}

按你说的，这版我做了三个调整：

- 开头直接进入正题，砍掉了铺垫
- 把套话换成了你的真实经历
- 结尾的行动引导更自然，不硬转

${input.message.slice(0, 60)}——这个方向我记住了，后面写内容都会带上。

如果还有不对味的地方直接说，我再改。`,
      },
    };
  }

  return {
    reply:
      '这条内容的思路是：用你的真实经历做钩子，把产品包在故事里说。如果你想让我改内容，直接告诉我哪里不对味（比如「太官方了」「开头太啰嗦」）；如果想调整这个渠道整个 30 天的方向，也可以直接说，我可以整体重排。',
  };
}
