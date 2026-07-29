import researchedProfilesJson from './researched-profiles.json';

export type DirectoryEvidenceLevel =
  | 'explicit'
  | 'inferred'
  | 'unverified'
  | 'catalog-inferred';

export type DirectoryFitProfile = {
  productTypes: string[];
  audiences: string[];
  stages: string[];
  goals: string[];
  markets: Array<'B2B' | 'B2C' | 'Developer'>;
  summary: { en: string; zh: string };
  evidenceLevel: DirectoryEvidenceLevel;
  confidence: 'high' | 'medium' | 'low';
  sourceUrl: string;
  lastVerified: string;
};

const checkedAt = '2026-07-28';

/**
 * Curated fit metadata is intentionally separate from the imported directory
 * inventory. Facts marked "explicit" come from the platform's own positioning
 * or listing guidance; "inferred" profiles are conservative classifications
 * based on the platform's stated category and current catalogue.
 */
export const directoryFitProfiles: Record<string, DirectoryFitProfile> = {
  'producthunt.com': {
    productTypes: ['SaaS', 'AI tool', 'Mobile app', 'Developer tool', 'Physical tech'],
    audiences: ['Early adopters', 'Makers', 'Product people', 'Tech users'],
    stages: ['Launched', 'Major update'],
    goals: ['Launch exposure', 'Early users', 'Feedback'],
    markets: ['B2B', 'B2C', 'Developer'],
    summary: {
      en: 'Best for launch-ready tech products that can mobilize makers and early adopters.',
      zh: '适合已准备好首发、希望触达科技用户和早期采用者的产品。',
    },
    evidenceLevel: 'explicit',
    confidence: 'high',
    sourceUrl: 'https://www.producthunt.com/launch',
    lastVerified: checkedAt,
  },
  'betalist.com': {
    productTypes: ['Internet startup', 'SaaS', 'Web app', 'Mobile app'],
    audiences: ['Early adopters', 'Startup users', 'Founders'],
    stages: ['Pre-launch', 'Beta', 'Recently launched'],
    goals: ['Beta users', 'Early feedback', 'Launch exposure'],
    markets: ['B2B', 'B2C', 'Developer'],
    summary: {
      en: 'Strong fit for upcoming or recently launched internet startups seeking early feedback.',
      zh: '适合尚未正式发布、Beta 阶段或刚上线并需要早期反馈的互联网创业产品。',
    },
    evidenceLevel: 'explicit',
    confidence: 'high',
    sourceUrl: 'https://betalist.com/support',
    lastVerified: checkedAt,
  },
  'alternativeto.net': {
    productTypes: ['Software', 'SaaS', 'Mobile app', 'Desktop app', 'Developer tool'],
    audiences: ['Software buyers', 'Consumers', 'Technical users'],
    stages: ['Launched', 'Established'],
    goals: ['Alternative discovery', 'Long-tail discovery', 'User recommendations'],
    markets: ['B2B', 'B2C', 'Developer'],
    summary: {
      en: 'Best for usable software with clear competitors and an established alternative category.',
      zh: '适合已经可用、具有明确竞品和替代关系的软件产品。',
    },
    evidenceLevel: 'inferred',
    confidence: 'high',
    sourceUrl: 'https://alternativeto.net/about/',
    lastVerified: checkedAt,
  },
  'g2.com': {
    productTypes: ['B2B software', 'SaaS', 'Business service'],
    audiences: ['Business software buyers', 'IT teams', 'Procurement teams'],
    stages: ['Launched', 'Established'],
    goals: ['Buyer discovery', 'Reviews', 'Trust'],
    markets: ['B2B'],
    summary: {
      en: 'Best for established B2B software that can collect authentic customer reviews.',
      zh: '适合已有客户、能够积累真实评价并面向企业采购者的 B2B 软件。',
    },
    evidenceLevel: 'explicit',
    confidence: 'high',
    sourceUrl: 'https://www.g2.com/',
    lastVerified: checkedAt,
  },
  'capterra.com': {
    productTypes: ['B2B software', 'SaaS', 'Business application'],
    audiences: ['Business software buyers', 'SMBs', 'Operations teams'],
    stages: ['Launched', 'Established'],
    goals: ['Buyer discovery', 'Reviews', 'Lead generation'],
    markets: ['B2B'],
    summary: {
      en: 'Best for commercially available B2B software that fits a recognized buyer category.',
      zh: '适合已商业化、能归入明确采购分类的 B2B 软件。',
    },
    evidenceLevel: 'explicit',
    confidence: 'high',
    sourceUrl: 'https://www.capterra.com/vendors/',
    lastVerified: checkedAt,
  },
  'saashub.com': {
    productTypes: ['Software', 'SaaS', 'Web app', 'Mobile app'],
    audiences: ['Software buyers', 'Founders', 'Business users'],
    stages: ['Launched', 'Established'],
    goals: ['Alternative discovery', 'SEO discovery', 'Vendor presence'],
    markets: ['B2B', 'B2C', 'Developer'],
    summary: {
      en: 'Good for launched software that belongs in comparison and alternatives pages.',
      zh: '适合已经上线、可以进入软件对比和替代品页面的产品。',
    },
    evidenceLevel: 'explicit',
    confidence: 'high',
    sourceUrl: 'https://www.saashub.com/about',
    lastVerified: checkedAt,
  },
  'sourceforge.net': {
    productTypes: ['Open source', 'Developer tool', 'Desktop software', 'Business software'],
    audiences: ['Developers', 'IT professionals', 'Software buyers'],
    stages: ['Launched', 'Established'],
    goals: ['Downloads', 'Developer discovery', 'Software listing'],
    markets: ['B2B', 'B2C', 'Developer'],
    summary: {
      en: 'Strongest for downloadable, open-source, developer, and IT-oriented software.',
      zh: '更适合可下载软件、开源项目、开发者工具和 IT 类产品。',
    },
    evidenceLevel: 'inferred',
    confidence: 'high',
    sourceUrl: 'https://sourceforge.net/software/vendors/new',
    lastVerified: checkedAt,
  },
  'news.ycombinator.com': {
    productTypes: ['Developer tool', 'Open source', 'Technical product', 'Research project'],
    audiences: ['Developers', 'Technical founders', 'Startup community'],
    stages: ['Prototype', 'Launched'],
    goals: ['Technical feedback', 'Community discussion', 'Early users'],
    markets: ['B2B', 'B2C', 'Developer'],
    summary: {
      en: 'Best for technically interesting products with a credible builder story and working demo.',
      zh: '适合技术含量高、有真实构建故事并已有可用 Demo 的产品。',
    },
    evidenceLevel: 'inferred',
    confidence: 'medium',
    sourceUrl: 'https://news.ycombinator.com/showhn.html',
    lastVerified: checkedAt,
  },
  'indiehackers.com': {
    productTypes: ['Bootstrapped startup', 'SaaS', 'Creator business', 'Developer tool'],
    audiences: ['Independent founders', 'Bootstrappers', 'Developers'],
    stages: ['Building', 'Launched', 'Growing'],
    goals: ['Founder feedback', 'Build in public', 'Peer discovery'],
    markets: ['B2B', 'B2C', 'Developer'],
    summary: {
      en: 'Best for founder-led products with lessons, progress, or transparent business context to share.',
      zh: '适合创始人主导、愿意分享过程、经验或业务进展的产品。',
    },
    evidenceLevel: 'inferred',
    confidence: 'medium',
    sourceUrl: 'https://www.indiehackers.com/products',
    lastVerified: checkedAt,
  },
  'peerlist.io': {
    productTypes: ['Developer tool', 'Design tool', 'Open source', 'Tech product'],
    audiences: ['Developers', 'Designers', 'Tech professionals'],
    stages: ['Building', 'Launched'],
    goals: ['Professional community exposure', 'Feedback', 'Early users'],
    markets: ['B2B', 'B2C', 'Developer'],
    summary: {
      en: 'Good for products built by and for developers, designers, and tech professionals.',
      zh: '适合由开发者、设计师或科技从业者构建并面向这类人群的产品。',
    },
    evidenceLevel: 'inferred',
    confidence: 'medium',
    sourceUrl: 'https://peerlist.io/launchpad',
    lastVerified: checkedAt,
  },
  'devhunt.org': {
    productTypes: ['Developer tool', 'API', 'Open source', 'DevOps tool'],
    audiences: ['Developers', 'Technical founders'],
    stages: ['Launched', 'Major update'],
    goals: ['Developer exposure', 'Feedback', 'Launch ranking'],
    markets: ['Developer', 'B2B'],
    summary: {
      en: 'Purpose-built for developer tools, APIs, open-source projects, and technical products.',
      zh: '专门适合开发者工具、API、开源项目和技术型产品。',
    },
    evidenceLevel: 'inferred',
    confidence: 'high',
    sourceUrl: 'https://devhunt.org/',
    lastVerified: checkedAt,
  },
  'dang.ai': {
    productTypes: ['AI tool', 'AI agent', 'Generative AI product'],
    audiences: ['AI adopters', 'Professionals', 'Consumers'],
    stages: ['Launched'],
    goals: ['AI discovery', 'SEO discovery'],
    markets: ['B2B', 'B2C', 'Developer'],
    summary: {
      en: 'Suitable only for launched products whose core user value materially depends on AI.',
      zh: '只适合核心用户价值明确依赖 AI、且已经可以使用的产品。',
    },
    evidenceLevel: 'inferred',
    confidence: 'medium',
    sourceUrl: 'https://dang.ai/',
    lastVerified: checkedAt,
  },
  'hot100.ai': {
    productTypes: ['AI tool', 'AI agent', 'Generative AI product'],
    audiences: ['AI adopters', 'Tech users'],
    stages: ['Launched'],
    goals: ['AI discovery', 'Launch exposure'],
    markets: ['B2B', 'B2C', 'Developer'],
    summary: {
      en: 'For live AI-native tools seeking discovery among people actively browsing AI products.',
      zh: '适合已经上线、希望触达主动寻找 AI 产品用户的 AI 原生工具。',
    },
    evidenceLevel: 'inferred',
    confidence: 'medium',
    sourceUrl: 'https://www.hot100.ai/',
    lastVerified: checkedAt,
  },
  'twelve.tools': {
    productTypes: ['AI tool', 'Software tool', 'Productivity tool'],
    audiences: ['Tool buyers', 'AI adopters', 'Professionals'],
    stages: ['Launched'],
    goals: ['Tool discovery', 'SEO discovery'],
    markets: ['B2B', 'B2C', 'Developer'],
    summary: {
      en: 'For launched software and AI tools; submission conditions should be checked before prioritizing.',
      zh: '适合已上线的软件和 AI 工具；排序前应先核实反向链接等提交条件。',
    },
    evidenceLevel: 'inferred',
    confidence: 'medium',
    sourceUrl: 'https://twelve.tools/submit-your-tool',
    lastVerified: checkedAt,
  },
  'toolfio.com': {
    productTypes: ['AI tool', 'Software tool', 'SaaS'],
    audiences: ['Tool buyers', 'AI adopters', 'Business users'],
    stages: ['Launched'],
    goals: ['Tool discovery', 'SEO discovery'],
    markets: ['B2B', 'B2C', 'Developer'],
    summary: {
      en: 'For launched tools and SaaS; free-path backlink and site-authority requirements add friction.',
      zh: '适合已上线的工具和 SaaS，但免费路径的权重与反向链接要求会增加成本。',
    },
    evidenceLevel: 'inferred',
    confidence: 'medium',
    sourceUrl: 'https://toolfio.com/submit',
    lastVerified: checkedAt,
  },
  'earlyhunt.com': {
    productTypes: ['Startup', 'SaaS', 'AI tool', 'Web app'],
    audiences: ['Early adopters', 'Founders', 'Tech users'],
    stages: ['Beta', 'Recently launched'],
    goals: ['Launch exposure', 'Early feedback'],
    markets: ['B2B', 'B2C', 'Developer'],
    summary: {
      en: 'Good for early-stage digital products seeking an additional launch surface.',
      zh: '适合 Beta 或刚上线、希望增加首发曝光入口的数字产品。',
    },
    evidenceLevel: 'inferred',
    confidence: 'medium',
    sourceUrl: 'https://earlyhunt.com/submit',
    lastVerified: checkedAt,
  },
  'openhunts.com': {
    productTypes: ['Startup', 'SaaS', 'AI tool', 'Developer tool'],
    audiences: ['Early adopters', 'Makers', 'Tech users'],
    stages: ['Launched'],
    goals: ['Launch exposure', 'Feedback'],
    markets: ['B2B', 'B2C', 'Developer'],
    summary: {
      en: 'Broad launchpad for live tech products that have complete launch assets ready.',
      zh: '适合已经上线、并已准备完整介绍、Logo 和截图的科技产品。',
    },
    evidenceLevel: 'inferred',
    confidence: 'medium',
    sourceUrl: 'https://openhunts.com/projects/submit',
    lastVerified: checkedAt,
  },
  'fazier.com': {
    productTypes: ['Startup', 'SaaS', 'AI tool', 'Indie product'],
    audiences: ['Makers', 'Early adopters', 'Founders'],
    stages: ['Beta', 'Launched'],
    goals: ['Launch exposure', 'Maker feedback'],
    markets: ['B2B', 'B2C', 'Developer'],
    summary: {
      en: 'Good for indie and startup products seeking community launch exposure.',
      zh: '适合独立开发者和创业产品获得社区型首发曝光。',
    },
    evidenceLevel: 'inferred',
    confidence: 'medium',
    sourceUrl: 'https://fazier.com/',
    lastVerified: checkedAt,
  },
  'uneed.best': {
    productTypes: ['Startup', 'SaaS', 'AI tool', 'Web app', 'Mobile app'],
    audiences: ['Makers', 'Early adopters', 'Tool users'],
    stages: ['Launched'],
    goals: ['Launch exposure', 'Tool discovery', 'Feedback'],
    markets: ['B2B', 'B2C', 'Developer'],
    summary: {
      en: 'Broad fit for polished digital products ready for a community launch and voting cycle.',
      zh: '广泛适合资料完整、准备参与社区首发和投票的数字产品。',
    },
    evidenceLevel: 'inferred',
    confidence: 'medium',
    sourceUrl: 'https://www.uneed.best/submit-a-tool',
    lastVerified: checkedAt,
  },
  'startupstash.com': {
    productTypes: ['Startup resource', 'SaaS', 'Developer tool', 'Business tool'],
    audiences: ['Founders', 'Startup teams', 'Developers'],
    stages: ['Launched', 'Established'],
    goals: ['Evergreen discovery', 'Startup audience', 'SEO discovery'],
    markets: ['B2B', 'Developer'],
    summary: {
      en: 'Best for practical tools and resources used by founders and startup teams.',
      zh: '适合创始人和创业团队会长期使用的实用工具或资源。',
    },
    evidenceLevel: 'inferred',
    confidence: 'medium',
    sourceUrl: 'https://startupstash.com/',
    lastVerified: checkedAt,
  },
  'peerpush.net': {
    productTypes: ['Startup', 'SaaS', 'AI tool', 'Indie product'],
    audiences: ['Makers', 'Early adopters', 'Founders'],
    stages: ['Launched'],
    goals: ['Launch exposure', 'Community discovery'],
    markets: ['B2B', 'B2C', 'Developer'],
    summary: {
      en: 'Broad secondary launch surface for live indie and startup products.',
      zh: '适合已上线的独立产品和创业项目，作为补充首发曝光渠道。',
    },
    evidenceLevel: 'inferred',
    confidence: 'medium',
    sourceUrl: 'https://peerpush.net/',
    lastVerified: checkedAt,
  },
};

const researchedProfiles =
  researchedProfilesJson as Record<string, DirectoryFitProfile>;

type DirectoryInventoryItem = {
  name: string;
  url: string;
  domain: string;
  tags: string[];
};

const tagProfiles: Record<
  string,
  Pick<DirectoryFitProfile, 'productTypes' | 'audiences' | 'stages' | 'goals' | 'markets'>
> = {
  ai: {
    productTypes: ['AI tool', 'AI agent', 'Generative AI product'],
    audiences: ['AI adopters', 'Tech users'],
    stages: ['Launched'],
    goals: ['AI discovery', 'SEO discovery'],
    markets: ['B2B', 'B2C', 'Developer'],
  },
  tools: {
    productTypes: ['Software tool', 'SaaS', 'Web app'],
    audiences: ['Tool users', 'Business users'],
    stages: ['Launched'],
    goals: ['Tool discovery', 'SEO discovery'],
    markets: ['B2B', 'B2C', 'Developer'],
  },
  'software directory': {
    productTypes: ['Software', 'SaaS', 'Web app', 'Desktop app'],
    audiences: ['Software buyers', 'Business users'],
    stages: ['Launched', 'Established'],
    goals: ['Software discovery', 'SEO discovery'],
    markets: ['B2B', 'B2C', 'Developer'],
  },
  launchpad: {
    productTypes: ['Startup', 'SaaS', 'Web app', 'Mobile app'],
    audiences: ['Early adopters', 'Makers', 'Founders'],
    stages: ['Beta', 'Recently launched', 'Launched'],
    goals: ['Launch exposure', 'Early users', 'Feedback'],
    markets: ['B2B', 'B2C', 'Developer'],
  },
  community: {
    productTypes: ['Startup', 'Tech product', 'Software'],
    audiences: ['Community members', 'Early adopters'],
    stages: ['Building', 'Launched'],
    goals: ['Community discussion', 'Feedback', 'Awareness'],
    markets: ['B2B', 'B2C', 'Developer'],
  },
  deals: {
    productTypes: ['SaaS', 'Software', 'Digital product'],
    audiences: ['Deal seekers', 'Small businesses'],
    stages: ['Launched'],
    goals: ['Paid acquisition', 'Deal exposure', 'Early customers'],
    markets: ['B2B', 'B2C'],
  },
};

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

/**
 * Guarantees a profile for every inventory entry. Curated profiles win.
 * Remaining entries receive a conservative taxonomy-derived baseline so they
 * are matchable, but stay visibly low-confidence until their own site is
 * reviewed.
 */
export function getDirectoryFitProfile(
  directory: DirectoryInventoryItem
): DirectoryFitProfile {
  const curated = directoryFitProfiles[directory.domain];
  if (curated) return curated;
  const researched = researchedProfiles[directory.domain];
  if (researched) return researched;

  const components = directory.tags
    .map((tag) => tagProfiles[tag])
    .filter((profile): profile is NonNullable<typeof profile> => Boolean(profile));
  const fallback = components.length ? components : [tagProfiles.launchpad];

  return {
    productTypes: unique(fallback.flatMap((profile) => profile.productTypes)),
    audiences: unique(fallback.flatMap((profile) => profile.audiences)),
    stages: unique(fallback.flatMap((profile) => profile.stages)),
    goals: unique(fallback.flatMap((profile) => profile.goals)),
    markets: unique(fallback.flatMap((profile) => profile.markets)),
    summary: {
      en: `Candidate ${directory.tags.join(' / ') || 'launch'} platform. Product-level fit requires verification.`,
      zh: `候选${directory.tags.join(' / ') || '发布'}平台；具体产品适配性仍需逐站核实。`,
    },
    evidenceLevel: 'catalog-inferred',
    confidence: 'low',
    sourceUrl: directory.url,
    lastVerified: '',
  };
}
