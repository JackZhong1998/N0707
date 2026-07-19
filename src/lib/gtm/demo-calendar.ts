/**
 * 模拟"每日行动日历"数据 — 预先写好的 30 天冷启动示例。
 * 用途：新用户进入产品内页时展示最终效果（蒙版 + 支付墙之下），以及官网落地页的日历一瞥。
 *
 * 中英差异化：
 * - 中文用户：中国渠道 + 海外渠道混排（很多人在做出海）
 * - 英文用户：只给海外渠道
 * 所有任务都是「发布内容 / 新增内容 / 建设动作」——回复评论这类维护动作由渠道专员自动处理，不占日历。
 */

import type { Todo } from './types';
import { addDays, startOfWeek, todayStr } from './dates';

interface DemoSeed {
  dayIndex: number;
  channelId: string;
  time: string;
  title: string;
  brief: string;
}

/** 渠道显示名 */
const CHANNEL_NAMES_ZH: Record<string, string> = {
  xiaohongshu: '小红书',
  user_outreach: '私域 / 朋友圈',
  wechat_official: '微信公众号',
  website_copy: '官网 / 落地页',
  twitter_x: 'Twitter / X',
  product_hunt: 'Product Hunt',
  reddit: 'Reddit',
  linkedin: 'LinkedIn',
  github_growth: 'GitHub',
};

const CHANNEL_NAMES_EN: Record<string, string> = {
  user_outreach: 'DM Outreach',
  website_copy: 'Website',
  twitter_x: 'Twitter / X',
  product_hunt: 'Product Hunt',
  reddit: 'Reddit',
  linkedin: 'LinkedIn',
  github_growth: 'GitHub',
};

const PHASES_ZH = ['第 1 周 · 定位与开张', '第 2 周 · 内容放量', '第 3 周 · 互动与转化', '第 4 周 · 发布与冲刺'];
const PHASES_EN = ['Week 1 · Positioning', 'Week 2 · Content ramp-up', 'Week 3 · Engage & convert', 'Week 4 · Launch & sprint'];

/** 中文市场：中外渠道混排（面向出海的一人公司） */
const SEEDS_ZH: DemoSeed[] = [
  // ===== 第 1 周 =====
  { dayIndex: 1, channelId: 'xiaohongshu', time: '09:00', title: '发布创始人自我介绍帖', brief: '讲清楚你是谁、为什么做这个产品、你看到的问题' },
  { dayIndex: 1, channelId: 'website_copy', time: '14:00', title: '设计落地页 Hero 区', brief: '一句话说清给谁解决什么问题，配一张产品实拍图' },
  { dayIndex: 1, channelId: 'twitter_x', time: '21:00', title: 'Build in public 第 1 帖：晒出 MVP', brief: '一张产品图 + 数据基线（0 用户开始），立 flag' },
  { dayIndex: 2, channelId: 'xiaohongshu', time: '10:00', title: '发布「我为什么做这个产品」', brief: '个人故事切入，结尾埋产品钩子' },
  { dayIndex: 2, channelId: 'user_outreach', time: '19:00', title: '朋友圈官宣产品启动', brief: '附产品截图 + 一句真诚的请求：帮我转给需要的人' },
  { dayIndex: 2, channelId: 'website_copy', time: '15:00', title: '编写落地页功能区文案', brief: '3 个核心功能各配一句结果导向的描述' },
  { dayIndex: 3, channelId: 'xiaohongshu', time: '09:30', title: '发布行业痛点观察帖', brief: '列出目标用户最疼的 3 个问题，先共鸣不卖货' },
  { dayIndex: 3, channelId: 'twitter_x', time: '21:00', title: '发布产品背后的 why', brief: '为什么这个问题值得解决，一条真诚的推文' },
  { dayIndex: 3, channelId: 'reddit', time: '20:00', title: '在 r/SideProject 发布产品介绍帖', brief: '以社区成员姿态分享，重故事轻推销' },
  { dayIndex: 4, channelId: 'user_outreach', time: '11:00', title: '私信 10 位潜在种子用户', brief: '不发广告，问一个真问题：你现在怎么解决 X？' },
  { dayIndex: 4, channelId: 'website_copy', time: '14:00', title: '编写 SEO 标题与 meta 描述', brief: '为首页与核心页面写好搜索引擎可读的标题与描述' },
  { dayIndex: 4, channelId: 'xiaohongshu', time: '16:00', title: '发布产品使用场景图文', brief: '一个真实使用瞬间，让用户想象拥有后的样子' },
  { dayIndex: 5, channelId: 'xiaohongshu', time: '12:00', title: '发布「30 天冷启动实验」开篇', brief: '公开承诺连续 30 天更新，制造追更预期' },
  { dayIndex: 5, channelId: 'twitter_x', time: '20:00', title: '引用转发 1 条大 V 热帖并附观点', brief: '带你自己的判断，不带链接，先混脸熟' },
  { dayIndex: 5, channelId: 'product_hunt', time: '22:00', title: '创建 PH 产品页并加入 Upcoming', brief: '写好 tagline 与首图，开始蓄水' },
  { dayIndex: 6, channelId: 'xiaohongshu', time: '10:00', title: '发布干货帖：解决痛点的 3 个方法', brief: '其中一个方法自然引出你的产品' },
  { dayIndex: 6, channelId: 'website_copy', time: '15:00', title: '新增 FAQ 模块并编写 6 条问答', brief: '把私信里被问最多的问题沉淀到落地页' },
  { dayIndex: 6, channelId: 'twitter_x', time: '21:00', title: '发布本周产品进展短推', brief: '一张截图 + 本周 ship 了什么' },
  { dayIndex: 7, channelId: 'xiaohongshu', time: '11:00', title: '发布首周数据复盘帖', brief: '真实数字：曝光、私信数、注册数，透明是最大的钩子' },
  { dayIndex: 7, channelId: 'user_outreach', time: '18:00', title: '朋友圈发布首周复盘', brief: '晒出第一批对话截图（打码），感谢帮忙的朋友' },
  { dayIndex: 7, channelId: 'reddit', time: '20:00', title: '在细分 subreddit 发布经验帖', brief: '写一篇「我如何解决 X」的干货，文末轻提产品' },

  // ===== 第 2 周 =====
  { dayIndex: 8, channelId: 'xiaohongshu', time: '09:00', title: '发布用户案例故事（第 1 个）', brief: '哪怕是免费用户：他遇到什么问题、怎么被解决' },
  { dayIndex: 8, channelId: 'twitter_x', time: '21:00', title: '发布第 1 周数据复盘 thread', brief: '真实数字：曝光、私信数、注册数' },
  { dayIndex: 9, channelId: 'website_copy', time: '10:00', title: '提交站点到 5 个产品目录站', brief: '外链建设：BetaList、AlternativeTo 等目录逐个提交' },
  { dayIndex: 9, channelId: 'xiaohongshu', time: '15:00', title: '发布「踩坑帖」：我做错的 3 件事', brief: '自嘲式干货，评论区引导讨论' },
  { dayIndex: 10, channelId: 'twitter_x', time: '20:00', title: '发布 30 秒产品演示视频', brief: '屏录 + 字幕，展示从问题到解决的完整链路' },
  { dayIndex: 10, channelId: 'user_outreach', time: '14:00', title: '向种子用户发送产品更新', brief: '给聊过的人发新版本亮点，附专属体验码' },
  { dayIndex: 11, channelId: 'xiaohongshu', time: '09:30', title: '发布对比帖：手动做 vs 用工具做', brief: '用时间账算给用户看，数字要具体' },
  { dayIndex: 11, channelId: 'reddit', time: '20:00', title: '发布「我如何解决 X」干货帖', brief: '选一个高频问题，给出完整解法' },
  { dayIndex: 12, channelId: 'website_copy', time: '14:00', title: '新增用户案例页', brief: '把第 1 个用户故事做成独立页面，配数据与截图' },
  { dayIndex: 12, channelId: 'twitter_x', time: '21:00', title: '发布功能预告短推', brief: '下一个大功能的一张预览图，收集期待' },
  { dayIndex: 13, channelId: 'xiaohongshu', time: '10:00', title: '把高赞选题改编成新帖', brief: '把表现最好的一篇换角度重写，复用流量密码' },
  { dayIndex: 13, channelId: 'product_hunt', time: '22:00', title: '发布 PH Teaser 并邀请 20 位关注', brief: '给愿意支持的朋友逐个发 upcoming 链接' },
  { dayIndex: 14, channelId: 'xiaohongshu', time: '11:00', title: '发布半月复盘：数据全公开', brief: '涨了多少粉、来了多少注册，下周计划' },
  { dayIndex: 14, channelId: 'user_outreach', time: '19:00', title: '朋友圈发布半月成绩单', brief: '一张图讲完：内容数、粉丝数、注册数' },

  // ===== 第 3 周 =====
  { dayIndex: 15, channelId: 'xiaohongshu', time: '09:00', title: '发起评论区提问活动帖', brief: '「你最头疼的 X 问题是什么？」抽 3 人送 1 对 1 咨询' },
  { dayIndex: 15, channelId: 'twitter_x', time: '21:00', title: '发布行业观点 thread', brief: '一个有争议的判断 + 论据，引发讨论' },
  { dayIndex: 16, channelId: 'user_outreach', time: '19:00', title: '建立种子用户微信群', brief: '拉进前 20 位活跃用户，定群规：只聊真问题' },
  { dayIndex: 16, channelId: 'website_copy', time: '14:00', title: '编写「关于我们」页', brief: '创始人故事 + 产品理念，建立信任' },
  { dayIndex: 17, channelId: 'xiaohongshu', time: '10:00', title: '发布长文：我的完整方法论', brief: '把前两周的干货串成体系，结尾放产品入口' },
  { dayIndex: 17, channelId: 'reddit', time: '20:00', title: '在目标 subreddit 发起 AMA', brief: '以「做了 X 的独立开发者」身份开放问答' },
  { dayIndex: 18, channelId: 'twitter_x', time: '21:00', title: '发布用户证言合集推文', brief: '3 张好评截图 + 1 句话总结' },
  { dayIndex: 18, channelId: 'xiaohongshu', time: '15:00', title: '发布用户证言图文', brief: '聊天记录截图（打码）+ 使用前后对比' },
  { dayIndex: 19, channelId: 'website_copy', time: '10:00', title: '给核心页面建设内链与外链', brief: '博客互链 + 找 3 个相关站点交换外链' },
  { dayIndex: 19, channelId: 'xiaohongshu', time: '16:00', title: '发布「一天使用流程」实拍帖', brief: '真实工作流截图，让用户想象拥有后的样子' },
  { dayIndex: 20, channelId: 'user_outreach', time: '15:00', title: '群内发起第 1 次主题讨论', brief: '抛一个有争议的行业话题，收集用户语言' },
  { dayIndex: 20, channelId: 'twitter_x', time: '21:00', title: '发布 build in public 进展', brief: '本周数据 + 学到的一件事' },
  { dayIndex: 21, channelId: 'xiaohongshu', time: '10:30', title: '发布第 3 周复盘 + 证言合集', brief: '3 张聊天记录截图 + 1 句话总结' },
  { dayIndex: 21, channelId: 'product_hunt', time: '22:00', title: '确定 PH 发布日并备齐物料', brief: '首图、Gallery、maker comment 全部定稿' },

  // ===== 第 4 周 =====
  { dayIndex: 22, channelId: 'xiaohongshu', time: '09:00', title: '发布限时活动帖', brief: '30 天实验收官福利：前 50 名注册送 XX' },
  { dayIndex: 22, channelId: 'twitter_x', time: '20:00', title: '发布 PH 发布预告推文', brief: '公布发布日，请大家当天来支持' },
  { dayIndex: 23, channelId: 'product_hunt', time: '08:00', title: 'PH 发布日：正式上线', brief: '发 maker comment，全渠道同步宣发' },
  { dayIndex: 23, channelId: 'user_outreach', time: '09:00', title: '朋友圈同步 PH 发布', brief: '附投票链接与一句真诚请求' },
  { dayIndex: 24, channelId: 'twitter_x', time: '21:00', title: '发布 PH 发布复盘 thread', brief: '排名、流量、注册转化全公开' },
  { dayIndex: 24, channelId: 'website_copy', time: '14:00', title: '新增 PH 徽章与媒体报道区', brief: '把发布成绩沉淀到落地页做社会证明' },
  { dayIndex: 25, channelId: 'xiaohongshu', time: '10:00', title: '发布「用户教我的 5 件事」', brief: '把访谈精华写成帖子，@参与的用户' },
  { dayIndex: 25, channelId: 'user_outreach', time: '11:00', title: '一对一回访 5 位深度用户', brief: '30 分钟访谈：为什么留下来 / 差点离开的瞬间' },
  { dayIndex: 26, channelId: 'twitter_x', time: '21:00', title: '发布产品迭代路线图', brief: '根据 30 天反馈公布下一步，邀请投票' },
  { dayIndex: 26, channelId: 'xiaohongshu', time: '15:00', title: '发布产品更新日志帖', brief: '这 30 天上线的功能一览，感谢提建议的用户' },
  { dayIndex: 27, channelId: 'xiaohongshu', time: '09:30', title: '发布收官倒计时干货帖', brief: '30 天里最有效的 1 个增长动作，完整拆解' },
  { dayIndex: 27, channelId: 'website_copy', time: '14:00', title: '用真实数据更新落地页', brief: '把「0 用户」文案换成真实用户数与证言' },
  { dayIndex: 28, channelId: 'user_outreach', time: '18:00', title: '朋友圈发布 30 天成绩单', brief: '一张图讲完：内容数、粉丝数、注册数、付费数' },
  { dayIndex: 28, channelId: 'twitter_x', time: '20:00', title: '发布 30 天数据预告', brief: '预告收官复盘，请大家提想看的问题' },
  { dayIndex: 29, channelId: 'xiaohongshu', time: '10:00', title: '发布 30 天冷启动完整复盘', brief: '实验收官长文：数据、方法、踩坑、下一步' },
  { dayIndex: 29, channelId: 'reddit', time: '20:00', title: '发布 30 天复盘长帖', brief: '在创业类 subreddit 分享完整数据与方法' },
  { dayIndex: 30, channelId: 'twitter_x', time: '20:00', title: '发布收官 thread + 致谢名单', brief: '@每一位帮助过你的人，宣布下一个 30 天目标' },
  { dayIndex: 30, channelId: 'website_copy', time: '15:00', title: '发布博客版 30 天复盘长文', brief: '沉淀成 SEO 长文，持续带来搜索流量' },
];

/** 英文市场：只给海外渠道 */
const SEEDS_EN: DemoSeed[] = [
  // ===== Week 1 =====
  { dayIndex: 1, channelId: 'twitter_x', time: '09:00', title: 'Build in public #1: ship the MVP', brief: 'One product shot + your baseline metrics (starting from zero)' },
  { dayIndex: 1, channelId: 'website_copy', time: '14:00', title: 'Design the landing page hero', brief: 'One sentence on who it is for and what it fixes, plus a real product shot' },
  { dayIndex: 1, channelId: 'linkedin', time: '17:00', title: 'Post your founder intro', brief: 'Who you are, what you left behind, what you are building' },
  { dayIndex: 2, channelId: 'twitter_x', time: '10:00', title: 'Post the "why" behind the product', brief: 'The moment you decided this problem was worth solving' },
  { dayIndex: 2, channelId: 'reddit', time: '20:00', title: 'Intro post in r/SideProject', brief: 'Community-member tone: story first, product second' },
  { dayIndex: 2, channelId: 'website_copy', time: '15:00', title: 'Write the hero CTA & benefits copy', brief: 'Three outcome-driven bullets, zero adjectives' },
  { dayIndex: 3, channelId: 'twitter_x', time: '21:00', title: 'Product walkthrough thread', brief: 'Screenshots from problem to solution in 5 tweets' },
  { dayIndex: 3, channelId: 'linkedin', time: '12:00', title: 'Publish a problem-focused post', brief: 'The 3 pains your audience feels — resonate before you sell' },
  { dayIndex: 3, channelId: 'user_outreach', time: '16:00', title: 'DM 10 potential seed users', brief: 'No pitch. Ask one real question: how do you solve X today?' },
  { dayIndex: 4, channelId: 'website_copy', time: '10:00', title: 'Write SEO titles & meta descriptions', brief: 'Home + core pages, one target keyword each' },
  { dayIndex: 4, channelId: 'twitter_x', time: '20:00', title: 'Quote a big builder’s post with your take', brief: 'Add a real opinion, no links — earn familiarity first' },
  { dayIndex: 4, channelId: 'github_growth', time: '15:00', title: 'Publish README + public roadmap', brief: 'Clear value prop, quickstart, and a roadmap people can star' },
  { dayIndex: 5, channelId: 'twitter_x', time: '09:00', title: 'Kick off the 30-day launch experiment', brief: 'Public commitment: daily updates for 30 days' },
  { dayIndex: 5, channelId: 'product_hunt', time: '22:00', title: 'Create your PH page & join Upcoming', brief: 'Nail the tagline and first image, start collecting followers' },
  { dayIndex: 5, channelId: 'reddit', time: '20:00', title: 'Value post in your niche subreddit', brief: 'Teach one thing well; mention the product only in comments if asked' },
  { dayIndex: 6, channelId: 'website_copy', time: '14:00', title: 'Add an FAQ section (6 Q&As)', brief: 'Turn the questions from your DMs into landing page copy' },
  { dayIndex: 6, channelId: 'twitter_x', time: '21:00', title: 'Ship-of-the-week update', brief: 'One screenshot + what you shipped this week' },
  { dayIndex: 6, channelId: 'linkedin', time: '12:00', title: 'Post a practical how-to', brief: 'A 5-step guide your B2B audience can use today' },
  { dayIndex: 7, channelId: 'twitter_x', time: '21:00', title: 'Week-1 numbers recap thread', brief: 'Real numbers: impressions, DMs, signups. Transparency is the hook' },
  { dayIndex: 7, channelId: 'user_outreach', time: '18:00', title: 'Send week-1 update to seed users', brief: 'What changed since you talked, plus an early-access code' },
  { dayIndex: 7, channelId: 'reddit', time: '20:00', title: 'Share week-1 learnings', brief: '"What I learned launching to zero users" — honest and specific' },

  // ===== Week 2 =====
  { dayIndex: 8, channelId: 'twitter_x', time: '21:00', title: 'Post user story #1', brief: 'Even a free user: the problem they had, how it got solved' },
  { dayIndex: 8, channelId: 'website_copy', time: '10:00', title: 'Submit to 5 startup directories', brief: 'Backlink building: BetaList, AlternativeTo, and friends' },
  { dayIndex: 9, channelId: 'reddit', time: '20:00', title: 'Publish a "How I solved X" write-up', brief: 'Pick a frequent pain, give the complete solution' },
  { dayIndex: 9, channelId: 'twitter_x', time: '20:00', title: 'Post a feature teaser', brief: 'One preview shot of what is coming, collect anticipation' },
  { dayIndex: 10, channelId: 'linkedin', time: '12:00', title: 'Publish a mini case study', brief: 'Before/after numbers from your first user' },
  { dayIndex: 10, channelId: 'user_outreach', time: '14:00', title: 'Follow up with your first 10 DMs', brief: 'Share the update, attach a personal access code' },
  { dayIndex: 11, channelId: 'twitter_x', time: '20:00', title: 'Post a 30-second demo video', brief: 'Screen recording + captions, problem to solution' },
  { dayIndex: 11, channelId: 'github_growth', time: '15:00', title: 'Cut a release + changelog', brief: 'Tag a version, write human-readable release notes' },
  { dayIndex: 12, channelId: 'website_copy', time: '14:00', title: 'Add a customer-story page', brief: 'Turn user story #1 into a dedicated page with real numbers' },
  { dayIndex: 12, channelId: 'twitter_x', time: '21:00', title: 'Post a hot take on your industry', brief: 'A defensible contrarian view + your reasoning' },
  { dayIndex: 13, channelId: 'product_hunt', time: '22:00', title: 'Post PH teaser & invite 20 supporters', brief: 'DM the upcoming link to friends who said they would help' },
  { dayIndex: 13, channelId: 'reddit', time: '20:00', title: 'Second value post in a new subreddit', brief: 'Repurpose your best content for an adjacent community' },
  { dayIndex: 14, channelId: 'twitter_x', time: '21:00', title: 'Mid-month numbers thread', brief: 'Followers, signups, revenue — all public, plus next week’s plan' },
  { dayIndex: 14, channelId: 'linkedin', time: '12:00', title: 'Post a halfway recap', brief: 'Two weeks of building in public: what worked, what flopped' },

  // ===== Week 3 =====
  { dayIndex: 15, channelId: 'twitter_x', time: '21:00', title: 'Publish an opinion thread', brief: 'A strong claim + evidence, engineered for discussion' },
  { dayIndex: 15, channelId: 'website_copy', time: '10:00', title: 'Publish an SEO blog post', brief: 'Target one long-tail keyword your users actually search' },
  { dayIndex: 16, channelId: 'user_outreach', time: '19:00', title: 'Start a private beta group', brief: 'Invite your 20 most active users, set one rule: real problems only' },
  { dayIndex: 16, channelId: 'linkedin', time: '12:00', title: 'Post lessons learned so far', brief: '3 mistakes you made and what each one cost you' },
  { dayIndex: 17, channelId: 'reddit', time: '20:00', title: 'Host an AMA in your niche', brief: '"I built X as a solo founder — ask me anything"' },
  { dayIndex: 17, channelId: 'twitter_x', time: '21:00', title: 'Build-in-public progress update', brief: 'This week’s numbers + one thing you learned' },
  { dayIndex: 18, channelId: 'twitter_x', time: '21:00', title: 'Post a testimonial roundup', brief: '3 screenshots of user love + one-line summary' },
  { dayIndex: 18, channelId: 'website_copy', time: '14:00', title: 'Add a social-proof strip', brief: 'Logos, quotes and numbers above the fold' },
  { dayIndex: 19, channelId: 'github_growth', time: '15:00', title: 'Run a good-first-issue drive', brief: 'Label 5 issues, write a contributing guide, invite newcomers' },
  { dayIndex: 19, channelId: 'twitter_x', time: '20:00', title: 'Post a progress screenshot', brief: 'One image that shows momentum, no caption longer than 2 lines' },
  { dayIndex: 20, channelId: 'linkedin', time: '12:00', title: 'Publish a B2B use-case post', brief: 'How a team would use this, written for the buyer' },
  { dayIndex: 20, channelId: 'user_outreach', time: '15:00', title: 'Invite 5 power users to a feedback call', brief: '30 minutes each: why they stayed, what almost lost them' },
  { dayIndex: 21, channelId: 'twitter_x', time: '21:00', title: 'Week-3 recap thread', brief: 'Numbers + the single biggest lesson of the week' },
  { dayIndex: 21, channelId: 'product_hunt', time: '22:00', title: 'Lock the launch date & prep assets', brief: 'Gallery, first comment, hunter outreach — all finalized' },

  // ===== Week 4 =====
  { dayIndex: 22, channelId: 'twitter_x', time: '20:00', title: 'Announce the PH launch date', brief: 'Tell everyone when, ask them to show up' },
  { dayIndex: 22, channelId: 'reddit', time: '20:00', title: 'Pre-launch value post', brief: 'One last helpful post so your name rings a bell on launch day' },
  { dayIndex: 23, channelId: 'product_hunt', time: '08:00', title: 'Launch day: go live on PH', brief: 'Post the maker comment, push on every channel at once' },
  { dayIndex: 23, channelId: 'linkedin', time: '09:00', title: 'Publish your launch-day post', brief: 'The story so far + the ask, with the PH link' },
  { dayIndex: 24, channelId: 'twitter_x', time: '21:00', title: 'Launch retro thread', brief: 'Rank, traffic, conversion — everything public' },
  { dayIndex: 24, channelId: 'website_copy', time: '14:00', title: 'Add PH badge & press mentions', brief: 'Bake the launch results into the landing page as social proof' },
  { dayIndex: 25, channelId: 'twitter_x', time: '20:00', title: 'Post a roadmap vote', brief: 'Let users vote on what you build next' },
  { dayIndex: 25, channelId: 'user_outreach', time: '11:00', title: 'Send thank-you notes to first users', brief: 'Personal messages to everyone who helped the launch' },
  { dayIndex: 26, channelId: 'linkedin', time: '12:00', title: 'Post "what the launch taught me"', brief: 'The honest version — including what you would do differently' },
  { dayIndex: 26, channelId: 'twitter_x', time: '21:00', title: 'Post the changelog', brief: 'Everything you shipped in 30 days, thank the requesters' },
  { dayIndex: 27, channelId: 'website_copy', time: '14:00', title: 'Refresh the landing page with real numbers', brief: 'Swap placeholder claims for real users and testimonials' },
  { dayIndex: 27, channelId: 'reddit', time: '20:00', title: 'Post your launch learnings', brief: 'A give-back post: exact steps, numbers and mistakes' },
  { dayIndex: 28, channelId: 'twitter_x', time: '20:00', title: 'Tease the 30-day report', brief: 'Ask what people want to see in the final recap' },
  { dayIndex: 28, channelId: 'user_outreach', time: '18:00', title: 'Share the 30-day report with your beta group', brief: 'Full numbers first to the people who helped most' },
  { dayIndex: 29, channelId: 'twitter_x', time: '21:00', title: 'Full 30-day retro thread', brief: 'Data, methods, mistakes, and what is next' },
  { dayIndex: 29, channelId: 'website_copy', time: '15:00', title: 'Publish the 30-day retro as a blog post', brief: 'Turn the thread into an SEO article that keeps working' },
  { dayIndex: 30, channelId: 'twitter_x', time: '20:00', title: 'Closing thread + thank-you list', brief: 'Tag everyone who helped, announce the next 30-day goal' },
  { dayIndex: 30, channelId: 'linkedin', time: '12:00', title: 'Post the 30-day journey', brief: 'The professional-audience version of your retro' },
];

function phaseFor(dayIndex: number, isZh: boolean): string {
  const phases = isZh ? PHASES_ZH : PHASES_EN;
  if (dayIndex <= 7) return phases[0];
  if (dayIndex <= 14) return phases[1];
  if (dayIndex <= 21) return phases[2];
  return phases[3];
}

function marketFor(channelId: string, isZh: boolean): string {
  if (!isZh) return 'United States';
  return ['twitter_x', 'product_hunt', 'reddit', 'linkedin', 'github_growth'].includes(channelId)
    ? 'United States'
    : '中国大陆';
}

/**
 * 生成模拟日历：以本周一为 Day 1，保证用户进来当周视图是满的。
 */
export function buildDemoTodos(locale: string = 'zh'): Todo[] {
  const isZh = locale !== 'en';
  const seeds = isZh ? SEEDS_ZH : SEEDS_EN;
  const names = isZh ? CHANNEL_NAMES_ZH : CHANNEL_NAMES_EN;
  const base = startOfWeek(todayStr());
  return seeds.map((seed, i) => ({
    id: `demo-${i}`,
    channelId: seed.channelId,
    channelName: names[seed.channelId] ?? seed.channelId,
    dayIndex: seed.dayIndex,
    date: addDays(base, seed.dayIndex - 1),
    time: seed.time,
    title: seed.title,
    brief: seed.brief,
    phase: phaseFor(seed.dayIndex, isZh),
    market: marketFor(seed.channelId, isZh),
    audience: isZh
      ? '正在做 side project 的独立开发者'
      : 'Indie hackers building in public',
    status: seed.dayIndex <= 2 ? 'done' : 'pending',
    contentStatus: 'none',
  }));
}

export function demoStartDate(): string {
  return startOfWeek(todayStr());
}
