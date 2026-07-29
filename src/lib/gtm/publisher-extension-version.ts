/** Keep in sync with browser-extension/manifest.json */
export const PUBLISHER_EXTENSION_VERSION = '0.9.13';

export const PUBLISHER_EXTENSION_RELEASE_NOTES: Record<
  string,
  { zh: string[]; en: string[] }
> = {
  '0.9.13': {
    zh: [
      '全部目录使用统一素材要求清单，检查结果包含图片尺寸、格式与大小限制',
      '上传时在内存中自动裁切、转码并压缩 Logo 和截图',
      '新增用户明确授权的免费目录安全白名单自动提交，并校验平台成功回执',
    ],
    en: [
      'Use one material requirement schema across the full directory catalog, including image constraints',
      'Crop, convert, and compress logos and screenshots in memory during upload',
      'Add explicit opt-in final submission for a free-directory safe list with receipt verification',
    ],
  },
  '0.9.12': {
    zh: [
      '目录提交任务默认在后台标签页运行，不再连续抢占当前页面',
      'Directory 页面读取已安装插件的真实支持清单，并按队列逐个平台处理',
      '资料检查、AI 补全结果和用户阻塞状态可持久保存并续跑',
    ],
    en: [
      'Run directory preparation in background tabs without repeatedly taking focus',
      'Use the installed extension’s live directory catalog and process submissions as a queue',
      'Persist material checks, AI preparation results, and user blockers for resuming',
    ],
  },
  '0.9.11': {
    zh: [
      '登录验证、2FA、验证码和首次 Profile 阶段同时发送桌面通知与站内提醒',
      '用户接管完成后可从原任务位置继续填写和录制',
      '接管原因和任务状态同步保存到 Directory Pipeline',
    ],
    en: [
      'Show desktop and in-app handoff alerts for login verification, 2FA, CAPTCHAs, and first-time profiles',
      'Resume filling and recording from the same task after the user completes a handoff',
      'Persist handoff reasons and task status in the Directory Pipeline',
    ],
  },
  '0.9.10': {
    zh: [
      '内容平台登录完成后自动返回编辑器并续接原发布任务',
      '7 个 Beta 平台按原帖路径校验公开 URL，低置信度地址不再自动进入追踪',
      '发布完成后自动返回 NowBuild；缺少链接时保留“待补链接”状态',
    ],
    en: [
      'Resume the original publishing task automatically after platform login',
      'Validate public post paths on seven beta adapters instead of trusting generic destination pages',
      'Return to NowBuild after publishing and preserve a “Post URL needed” state when necessary',
    ],
  },
  '0.9.9': {
    zh: [
      '修复 Typeform 单字段页面被错误判定为尚未加载的问题',
      '补齐 Launchy、IndieHub、Stellar Launch 的截图控件和 ConfettiSaaS 图片规格',
      '登录完成后可自动进入明确的 Add/Submit 表单入口，但仍停在最终提交前',
    ],
    en: [
      'Fix Typeform single-field pages being mistaken for incomplete page loads',
      'Add explicit screenshot controls for Launchy, IndieHub, and Stellar Launch plus ConfettiSaaS image sizing',
      'Enter unambiguous Add/Submit form surfaces after login while still stopping before final submission',
    ],
  },
  '0.9.8': {
    zh: [
      '补齐 ToolPilot Jotform 的真实字段映射、定价与平台选项',
      '通过受限 iframe 桥接把 Launch Kit 中的 Logo 与标签直接注入跨域控件',
      'Logo 在内存中裁切为 500×500 JPEG，不读取用户本地文件路径',
    ],
    en: [
      'Map the real ToolPilot Jotform fields, pricing, and platform options',
      'Transfer Launch Kit logos and tags directly into cross-origin widgets through a restricted iframe bridge',
      'Crop the logo to a 500×500 JPEG in memory without reading a local file path',
    ],
  },
  '0.9.7': {
    zh: [
      '把剩余目录站点全部注册到插件 Catalog，使录制器和内存图片注入能在真实提交页加载',
      '目录任务触发 Google 登录后，自动选择浏览器默认账号、确认授权并回到提交页续跑',
      '遇到密码复验或两步验证时暂停并通知用户，不读取密码或验证码',
    ],
    en: [
      'Register the remaining directory destinations so the recorder and in-memory asset injection load on their real forms',
      'Automatically choose the browser default Google account, confirm OAuth, and resume the directory task after redirect',
      'Pause for password reauthentication or two-factor verification without reading credentials or codes',
    ],
  },
  '0.9.6': {
    zh: [
      '自动完成可用站点的 Google 登录并继续记录登录后的真实提交表单',
      '新增 HUNT0 与 SaaSGrow 目录适配器，并记录 IndieHub、Stellar Launch、Launchy 等多步表单',
      '遇到首次账号资料、邮箱验证、付款、验证码或官网徽章时暂停并保留续跑位置',
    ],
    en: [
      'Complete supported Google sign-ins and continue recording the real authenticated submission forms',
      'Add HUNT0 and SaaSGrow adapters and record multi-step flows for IndieHub, Stellar Launch, Launchy, and more',
      'Pause and preserve resume points at profile setup, email verification, payment, CAPTCHA, or website-badge boundaries',
    ],
  },
  '0.9.5': {
    zh: [
      '完成 123 个目录站点的首轮真实入口核验，并区分可配置、需续录、登录边界、访问阻塞和非目录站点',
      '新增 LLM Relevance、Made with Bolt 和 Made with Lovable 单页目录适配器',
      '目录任务继续使用 Launch Kit 内存素材，并始终停在付款、验证码和最终提交之前',
    ],
    en: [
      'Audit the real entry points of all 123 directory candidates and classify configurable, partial, login-gated, blocked, and non-directory destinations',
      'Add single-page adapters for LLM Relevance, Made with Bolt, and Made with Lovable',
      'Continue using in-memory Launch Kit assets and stop before payments, CAPTCHAs, and final submission',
    ],
  },
  '0.7.4': {
    zh: [
      '目录草稿页使用动态 ID 时按通用路径保存流程，可跨用户和不同草稿重放',
      '按录制顺序重放 Tab 切换、普通交互和保存动作，同时仍跳过登录与最终发布',
      '识别 Uneed 免费账号已有 waiting-line 产品的阻塞状态并给出明确提示',
    ],
    en: [
      'Normalize dynamic draft IDs so learned flows can replay across users and submissions',
      'Replay tabs, safe interactions, and save actions in order while continuing to skip login and final publishing',
      'Report Uneed’s existing waiting-line product limit as an explicit blocker',
    ],
  },
  '0.7.3': {
    zh: [
      '支持同一页面连续执行多个步骤，不再错误合并相同按钮的重复点击',
      '修复 Uneed 首次点击生成 slug、再次点击进入抓取阶段的录制与重放',
      '将 I already have an account 识别为用户登录接管点',
    ],
    en: [
      'Replay multiple actions on the same page in order without deduplicating repeated button clicks',
      'Support Uneed’s two-step slug generation and preview flow',
      'Recognize I already have an account as a user login handoff',
    ],
  },
  '0.7.2': {
    zh: [
      '修正 Uneed 登录前后的第一阶段按钮：Preview my product 与 Submit your product 均作为进入详情页的导航动作，而不是最终提交',
    ],
    en: [
      'Treat Uneed’s pre-login Preview my product and post-login Submit your product buttons as navigation into the details stage rather than final submission',
    ],
  },
  '0.7.1': {
    zh: [
      '录制模式可直接把 Launch Kit 中已上传的 Logo 和截图注入第三方表单，不再打开或查找用户本地文件',
      '修复第三方页面中 NowBuild Flow Recorder 图标无法显示的问题',
    ],
    en: [
      'Let recording mode inject Logo and screenshots already stored in the Launch Kit without opening or locating local files',
      'Fix the NowBuild Flow Recorder icon on third-party pages',
    ],
  },
  '0.7.0': {
    zh: [
      '新增目录流程录制器：用户自行登录并示范一次，插件只保存字段语义、页面阶段和操作定位，不保存密码或输入值',
      '支持多页面目录表单按阶段恢复、预填和安全进入下一页，并始终停在最终提交按钮前',
      '内置 NowBuild Logo 作为目录图片上传测试素材，并统一替换浏览器插件图标',
    ],
    en: [
      'Add a directory flow recorder that learns field meaning, page stages, and element locations without storing passwords or typed values',
      'Resume and prefill multi-page directory forms stage by stage, while always stopping before final submission',
      'Bundle the NowBuild logo as an upload test asset and use it consistently as the browser extension icon',
    ],
  },
  '0.6.1': {
    zh: [
      '修复 Hashnode 已失效的 /draft/new 入口：自动从 Feed 点击 Write 创建草稿并继续填写',
      '支持 Hashnode 自定义域名的公开数据回收，并修复 Indie Hackers 发帖入口、账号权限阻塞和互动数据识别',
      '插件名称与简介改为英文；插件创建的发布、采集和目录页面自动加入 NowBuild Chrome 标签组',
    ],
    en: [
      'Replace the retired Hashnode /draft/new route by creating a draft through Write and continuing automatically',
      'Support public metrics on Hashnode custom domains and fix Indie Hackers routing, account blockers, and engagement metrics',
      'Use English extension metadata and group extension-created publishing, metrics, and directory tabs under NowBuild',
    ],
  },
  '0.6.0': {
    zh: [
      '新增 Product Launch Kit：统一保存目录提交所需的产品文案、分类、创始人资料和素材',
      '新增 Uneed、PeerPush、OpenHunts、Toolfio、EarlyHunt、Twelve Tools 六个目录 Beta 适配器',
      '支持 Logo/截图上传、登录后续跑、必填项检查，以及登录、CAPTCHA、付费和反向徽章阻塞报告',
    ],
    en: [
      'Add a reusable Product Launch Kit for directory copy, categories, founder details, and assets',
      'Add beta adapters for Uneed, PeerPush, OpenHunts, Toolfio, EarlyHunt, and Twelve Tools',
      'Support image upload, resume after login, required-field checks, and explicit login, CAPTCHA, payment, and backlink blockers',
    ],
  },
  '0.5.0': {
    zh: [
      '新增 Hacker News、DEV、Reddit、LinkedIn、Medium、Hashnode、Indie Hackers Beta 适配器',
      '新增产品 URL、Reddit 社区参数、平台示例内容与独立 Dry Run 诊断',
      '所有新增平台只填写真实编辑器并停在最终发布前，不保存登录信息',
    ],
    en: [
      'Add beta adapters for Hacker News, DEV, Reddit, LinkedIn, Medium, Hashnode, and Indie Hackers',
      'Add product URLs, Reddit community routing, platform samples, and standalone dry-run diagnostics',
      'Fill real editors and stop before final publishing without storing login data',
    ],
  },
  '0.3.3': {
    zh: [
      'X 普通账号自动按加权字符限制拆分 Thread，Premium 账号可保持长帖',
      '新增独立执行测试台，支持 Dry Run、Live Test、指标回收和诊断导出',
      '发布仍由用户在平台页面最终确认，插件不保存账号密码或 Cookie',
    ],
    en: [
      'Split X drafts into weighted-length threads for standard accounts while preserving long posts for Premium',
      'Add a standalone execution console for dry runs, live tests, metric collection, and diagnostics',
      'Keep final publishing under user confirmation without storing passwords or cookies',
    ],
  },
  '0.2.4': {
    zh: [
      '修复数据采集报错「window is not defined」，恢复推特和小红书抓取',
      '采集时在后台打开帖子页面，不再把你从 NowBuild 页面切走',
      '采集完成后自动回到 NowBuild 标签页',
    ],
    en: [
      'Fix the “window is not defined” metrics error for X and Xiaohongshu',
      'Open post pages in background tabs without leaving NowBuild',
      'Return focus to NowBuild after each collection finishes',
    ],
  },
  '0.2.3': {
    zh: [
      '修复小红书笔记数据采集：适配新版互动栏 DOM',
      '0 互动的新笔记现在会正确显示为 0，而不是报错',
      '采集时会切到前台标签页，确保页面完整渲染',
      '支持 xhslink.com 短链',
    ],
    en: [
      'Fix Xiaohongshu metrics collection for the new interaction bar DOM',
      'New posts with zero engagement now report 0 instead of failing',
      'Collection activates the tab so the page renders fully',
      'Support xhslink.com short links',
    ],
  },
};

export function publisherExtensionDownloadUrl(
  version = PUBLISHER_EXTENSION_VERSION
): string {
  return `/downloads/nowbuild-publisher-extension-${version}.zip`;
}

export function isOlderExtensionVersion(
  installed?: string,
  current = PUBLISHER_EXTENSION_VERSION
): boolean {
  if (!installed) return true;
  const installedParts = installed.split('.').map((part) => Number(part));
  const currentParts = current.split('.').map((part) => Number(part));

  for (
    let index = 0;
    index < Math.max(installedParts.length, currentParts.length);
    index += 1
  ) {
    const installedPart = installedParts[index] ?? 0;
    const currentPart = currentParts[index] ?? 0;
    if (installedPart < currentPart) return true;
    if (installedPart > currentPart) return false;
  }
  return false;
}
