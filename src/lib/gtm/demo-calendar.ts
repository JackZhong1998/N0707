/**
 * 模拟"每日行动日历"数据 — 预先写好的通用 30 天冷启动示例。
 * 用途：新用户进入产品内页时展示最终效果（蒙版 + 支付墙之下），并非真实生成。
 */

import type { Todo } from './types';
import { addDays, startOfWeek, todayStr } from './dates';

interface DemoSeed {
  dayIndex: number;
  channelId: string;
  channelName: string;
  time: string;
  title: string;
  brief: string;
  phase: string;
}

const SEEDS: DemoSeed[] = [
  // ===== 第 1 周 · 定位与开张 =====
  { dayIndex: 1, channelId: 'xiaohongshu', channelName: '小红书', time: '09:00', title: '发布创始人自我介绍帖', brief: '讲清楚你是谁、为什么做这个产品、你看到的问题', phase: '第 1 周 · 定位与开张' },
  { dayIndex: 1, channelId: 'website_copy', channelName: '官网 / 落地页', time: '14:00', title: '重写落地页 Hero 首屏文案', brief: '一句话说清给谁解决什么问题，替换所有形容词为具体结果', phase: '第 1 周 · 定位与开张' },
  { dayIndex: 2, channelId: 'xiaohongshu', channelName: '小红书', time: '10:00', title: '发布「我为什么离开大厂做独立开发」', brief: '个人故事切入，结尾埋产品钩子', phase: '第 1 周 · 定位与开张' },
  { dayIndex: 2, channelId: 'user_outreach', channelName: '私域 / 朋友圈', time: '19:00', title: '朋友圈官宣产品启动', brief: '附产品截图 + 一句真诚的请求：帮我转给需要的人', phase: '第 1 周 · 定位与开张' },
  { dayIndex: 3, channelId: 'xiaohongshu', channelName: '小红书', time: '09:30', title: '发布行业痛点观察帖', brief: '列出目标用户最疼的 3 个问题，先共鸣不卖货', phase: '第 1 周 · 定位与开张' },
  { dayIndex: 3, channelId: 'twitter_x', channelName: 'Twitter / X', time: '21:00', title: 'Build in public 第 1 帖：晒出 MVP', brief: '一张产品图 + 数据基线（0 用户开始），立 flag', phase: '第 1 周 · 定位与开张' },
  { dayIndex: 4, channelId: 'user_outreach', channelName: '私域 / 朋友圈', time: '11:00', title: '私信 10 位潜在种子用户', brief: '不发广告，问一个真问题：你现在怎么解决 X？', phase: '第 1 周 · 定位与开张' },
  { dayIndex: 5, channelId: 'xiaohongshu', channelName: '小红书', time: '12:00', title: '发布「30 天冷启动实验」开篇', brief: '公开承诺连续 30 天更新，制造追更预期', phase: '第 1 周 · 定位与开张' },
  { dayIndex: 5, channelId: 'twitter_x', channelName: 'Twitter / X', time: '20:00', title: '回复 5 条同领域大 V 的推文', brief: '带观点的评论，不带链接，先混脸熟', phase: '第 1 周 · 定位与开张' },
  { dayIndex: 6, channelId: 'xiaohongshu', channelName: '小红书', time: '10:00', title: '发布干货帖：解决痛点的 3 个方法', brief: '其中一个方法自然引出你的产品', phase: '第 1 周 · 定位与开张' },
  { dayIndex: 7, channelId: 'user_outreach', channelName: '私域 / 朋友圈', time: '18:00', title: '整理首周反馈发朋友圈复盘', brief: '晒出第一批对话截图（打码），感谢帮忙的朋友', phase: '第 1 周 · 定位与开张' },

  // ===== 第 2 周 · 内容放量 =====
  { dayIndex: 8, channelId: 'xiaohongshu', channelName: '小红书', time: '09:00', title: '发布用户案例故事（第 1 个）', brief: '哪怕是免费用户：他遇到什么问题、怎么被解决', phase: '第 2 周 · 内容放量' },
  { dayIndex: 9, channelId: 'twitter_x', channelName: 'Twitter / X', time: '21:00', title: '发布第 1 周数据复盘 thread', brief: '真实数字：曝光、私信数、注册数，透明是最大的钩子', phase: '第 2 周 · 内容放量' },
  { dayIndex: 10, channelId: 'xiaohongshu', channelName: '小红书', time: '10:00', title: '发布「踩坑帖」：我做错的 3 件事', brief: '自嘲式干货，评论区引导讨论', phase: '第 2 周 · 内容放量' },
  { dayIndex: 11, channelId: 'user_outreach', channelName: '私域 / 朋友圈', time: '14:00', title: '回访第一批 10 位私信对象', brief: '给上次聊过的人发产品更新，附专属体验码', phase: '第 2 周 · 内容放量' },
  { dayIndex: 12, channelId: 'xiaohongshu', channelName: '小红书', time: '09:30', title: '发布对比帖：手动做 vs 用工具做', brief: '用时间账算给用户看，数字要具体', phase: '第 2 周 · 内容放量' },
  { dayIndex: 13, channelId: 'twitter_x', channelName: 'Twitter / X', time: '20:00', title: '发布产品演示短视频', brief: '30 秒屏录 + 字幕，展示从问题到解决的完整链路', phase: '第 2 周 · 内容放量' },
  { dayIndex: 14, channelId: 'xiaohongshu', channelName: '小红书', time: '11:00', title: '发布半月复盘：数据全公开', brief: '涨了多少粉、来了多少注册，下周计划', phase: '第 2 周 · 内容放量' },

  // ===== 第 3 周 · 互动与转化 =====
  { dayIndex: 15, channelId: 'xiaohongshu', channelName: '小红书', time: '09:00', title: '发起评论区提问活动', brief: '「你最头疼的 X 问题是什么？」，抽 3 人送 1 对 1 咨询', phase: '第 3 周 · 互动与转化' },
  { dayIndex: 16, channelId: 'user_outreach', channelName: '私域 / 朋友圈', time: '19:00', title: '建立种子用户微信群', brief: '拉进前 20 位活跃用户，定群规：只聊真问题', phase: '第 3 周 · 互动与转化' },
  { dayIndex: 17, channelId: 'xiaohongshu', channelName: '小红书', time: '10:00', title: '发布长文：我的完整方法论', brief: '把前两周的干货串成体系，结尾放产品入口', phase: '第 3 周 · 互动与转化' },
  { dayIndex: 18, channelId: 'twitter_x', channelName: 'Twitter / X', time: '21:00', title: '邀请 3 位用户公开反馈', brief: '转发用户的好评推文并认真回复', phase: '第 3 周 · 互动与转化' },
  { dayIndex: 19, channelId: 'xiaohongshu', channelName: '小红书', time: '12:00', title: '发布「一天使用流程」实拍帖', brief: '真实工作流截图，让用户想象拥有后的样子', phase: '第 3 周 · 互动与转化' },
  { dayIndex: 20, channelId: 'user_outreach', channelName: '私域 / 朋友圈', time: '15:00', title: '群内发起第 1 次主题讨论', brief: '抛一个有争议的行业话题，收集用户语言', phase: '第 3 周 · 互动与转化' },
  { dayIndex: 21, channelId: 'xiaohongshu', channelName: '小红书', time: '10:30', title: '发布第 3 周复盘 + 用户证言合集', brief: '3 张聊天记录截图 + 1 句话总结', phase: '第 3 周 · 互动与转化' },

  // ===== 第 4 周 · 冲刺与沉淀 =====
  { dayIndex: 22, channelId: 'xiaohongshu', channelName: '小红书', time: '09:00', title: '发布限时活动帖', brief: '30 天实验收官福利：前 50 名注册送 XX', phase: '第 4 周 · 冲刺与沉淀' },
  { dayIndex: 23, channelId: 'twitter_x', channelName: 'Twitter / X', time: '20:00', title: '发布 30 天完整数据 thread 预告', brief: '预告收官复盘，请大家提想看的问题', phase: '第 4 周 · 冲刺与沉淀' },
  { dayIndex: 24, channelId: 'user_outreach', channelName: '私域 / 朋友圈', time: '11:00', title: '一对一回访 5 位深度用户', brief: '30 分钟访谈：为什么留下来 / 差点离开的瞬间', phase: '第 4 周 · 冲刺与沉淀' },
  { dayIndex: 25, channelId: 'xiaohongshu', channelName: '小红书', time: '10:00', title: '发布「用户教我的 5 件事」', brief: '把访谈精华写成帖子，@参与的用户', phase: '第 4 周 · 冲刺与沉淀' },
  { dayIndex: 26, channelId: 'twitter_x', channelName: 'Twitter / X', time: '21:00', title: '发布产品迭代路线图', brief: '根据 30 天反馈公布下一步，邀请投票', phase: '第 4 周 · 冲刺与沉淀' },
  { dayIndex: 27, channelId: 'xiaohongshu', channelName: '小红书', time: '09:30', title: '发布收官倒计时干货帖', brief: '30 天里最有效的 1 个增长动作，完整拆解', phase: '第 4 周 · 冲刺与沉淀' },
  { dayIndex: 28, channelId: 'user_outreach', channelName: '私域 / 朋友圈', time: '18:00', title: '朋友圈发布 30 天成绩单', brief: '一张图讲完：内容数、粉丝数、注册数、付费数', phase: '第 4 周 · 冲刺与沉淀' },
  { dayIndex: 29, channelId: 'xiaohongshu', channelName: '小红书', time: '10:00', title: '发布 30 天冷启动完整复盘', brief: '实验收官长文：数据、方法、踩坑、下一步', phase: '第 4 周 · 冲刺与沉淀' },
  { dayIndex: 30, channelId: 'twitter_x', channelName: 'Twitter / X', time: '20:00', title: '发布收官 thread + 致谢名单', brief: '@每一位帮助过你的人，宣布下一个 30 天目标', phase: '第 4 周 · 冲刺与沉淀' },
];

/**
 * 生成模拟日历：以本周一为 Day 1，保证用户进来当周视图是满的。
 */
export function buildDemoTodos(): Todo[] {
  const base = startOfWeek(todayStr());
  return SEEDS.map((seed, i) => ({
    id: `demo-${i}`,
    channelId: seed.channelId,
    channelName: seed.channelName,
    dayIndex: seed.dayIndex,
    date: addDays(base, seed.dayIndex - 1),
    time: seed.time,
    title: seed.title,
    brief: seed.brief,
    phase: seed.phase,
    status: seed.dayIndex <= 2 ? 'done' : 'pending',
    contentStatus: 'none',
  }));
}

export function demoStartDate(): string {
  return startOfWeek(todayStr());
}
