export interface SkillTemplate {
  id: string;
  taskType: string;
  name: string;
  description: string;
}

/** 展示给用户的方法论摘要（从 Gingiris SKILL.md frontmatter 提取，非改写正文） */
export interface SkillPlaybook {
  credibility: string;
  principles: string[];
  expectation: string;
}

export interface ChannelSkill {
  channelId: string;
  /** 主 Gingiris skillId */
  skillId: string;
  /** 挂载的全部 skillId（含主 + 辅助） */
  skillIds: string[];
  name: string;
  nameEn: string;
  description: string;
  locales: string[];
  tier: 'mvp' | 'p1' | 'p2' | 'extended' | 'phase0';
  postsPerWeek: number;
  campaignDays: number;
  defaultTaskTypes: string[];
  /** SKILL.md 原文（含 references），直接注入 Agent */
  fullContent: string;
  playbook: SkillPlaybook;
  templates: SkillTemplate[];
}

export interface GingirisSkillMeta {
  skillId: string;
  name?: string;
  description?: string;
  onWebsite?: boolean;
}
