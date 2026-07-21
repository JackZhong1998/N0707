/** Keep in sync with browser-extension/manifest.json */
export const PUBLISHER_EXTENSION_VERSION = '0.2.4';

export const PUBLISHER_EXTENSION_RELEASE_NOTES: Record<
  string,
  { zh: string[]; en: string[] }
> = {
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
