export interface SkillTemplate {
  id: string;
  taskType: string;
  name: string;
  description: string;
}

/** 展示给用户的方法论摘要，用于建立信任（不暴露来源名称） */
export interface SkillPlaybook {
  /** 一句话来源背书，如"源自 30+ 次日榜第一发布的实战复盘" */
  credibility: string;
  /** 3-5 条核心原则 */
  principles: string[];
  /** 预期节奏与信号 */
  expectation: string;
}

export interface ChannelSkill {
  channelId: string;
  skillId: string;
  name: string;
  nameEn: string;
  description: string;
  locales: string[];
  tier: 'mvp' | 'p1' | 'p2' | 'extended' | 'phase0';
  postsPerWeek: number;
  campaignDays: number;
  defaultTaskTypes: string[];
  methodology: string;
  reference: string;
  playbook: SkillPlaybook;
  templates: SkillTemplate[];
}
