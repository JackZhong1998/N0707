'use client';

import { Suspense, useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { Link } from '@/i18n/navigation';
import {
  detectPublisherExtension,
  type PublisherAvailability,
} from '@/lib/gtm/publisher-extension';
import {
  isOlderExtensionVersion,
  PUBLISHER_EXTENSION_RELEASE_NOTES,
  PUBLISHER_EXTENSION_VERSION,
  publisherExtensionDownloadUrl,
} from '@/lib/gtm/publisher-extension-version';
import { CONFIGURED_DIRECTORY_COUNT } from '@/lib/directories/automation';
import {
  capabilityLabels,
  CHANNEL_CAPABILITIES,
} from '@/lib/gtm/channel-capabilities';

const STABLE_CHANNEL_COUNT = CHANNEL_CAPABILITIES.filter(
  (item) => item.extensionSupport === 'stable'
).length;
const BETA_CHANNEL_COUNT = CHANNEL_CAPABILITIES.filter(
  (item) => item.extensionSupport === 'beta'
).length;

function DownloadIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v12m0 0l4.5-4.5M12 15l-4.5-4.5M4.5 19.5h15" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

function PublisherExtensionPageContent() {
  const locale = useLocale();
  const isZh = locale !== 'en';
  const searchParams = useSearchParams();
  const requestedReturnTo = searchParams.get('returnTo') ?? '';
  const returnTo = /^\/app\/calendar\/task\/[a-zA-Z0-9_-]+$/.test(requestedReturnTo)
    ? requestedReturnTo
    : '/app/calendar';
  const returningToTask = returnTo !== '/app/calendar';
  const [publisher, setPublisher] = useState<PublisherAvailability | null>(null);
  const [checking, setChecking] = useState(true);

  const checkExtension = async () => {
    setChecking(true);
    setPublisher(await detectPublisherExtension());
    setChecking(false);
  };

  useEffect(() => {
    void checkExtension();
  }, []);

  const needsUpgrade =
    publisher?.installed === true &&
    isOlderExtensionVersion(publisher.version, PUBLISHER_EXTENSION_VERSION);
  const releaseNotes =
    PUBLISHER_EXTENSION_RELEASE_NOTES[PUBLISHER_EXTENSION_VERSION] ??
    PUBLISHER_EXTENSION_RELEASE_NOTES['0.2.4'];
  const downloadUrl = publisherExtensionDownloadUrl(PUBLISHER_EXTENSION_VERSION);

  const steps = isZh
    ? [
        ['下载并解压插件', '点击下方按钮下载 ZIP，下载完成后双击解压。后续要选择解压后的 browser-extension 文件夹，不要选择 ZIP 文件。'],
        ['打开 Chrome 扩展程序', '在 Chrome 地址栏输入 chrome://extensions → 按回车 → 在页面右上角打开“开发者模式”开关。'],
        needsUpgrade
          ? ['替换旧版本', '删除或覆盖原来的 browser-extension 文件夹，保留 Chrome 里已加载的扩展条目。']
          : ['加载插件文件夹', '点击页面左上角“加载已解压的扩展程序”，选择刚才解压出的 browser-extension 文件夹。'],
        needsUpgrade
          ? ['重新加载插件', '在 chrome://extensions 中点击插件卡片上的“重新加载”，然后刷新 NowBuild 页面。']
          : ['刷新 NowBuild', '回到内容页面并刷新；其他平台可先在插件执行测试台中逐个 Dry Run。'],
      ]
    : [
        ['Download and unzip', 'Download the ZIP and unzip it. In the next step, select the extracted browser-extension folder—not the ZIP file.'],
        ['Open Chrome extensions', 'Enter chrome://extensions in the address bar, press Enter, then enable Developer mode in the top-right corner.'],
        needsUpgrade
          ? ['Replace the old folder', 'Delete or overwrite the previous browser-extension folder while keeping the loaded extension entry.']
          : ['Load the extension folder', 'Choose “Load unpacked” in the top-left corner and select the extracted browser-extension folder.'],
        needsUpgrade
          ? ['Reload the extension', 'Click Reload on the extension card in chrome://extensions, then refresh NowBuild.']
          : ['Refresh NowBuild', 'Return to your content and refresh the page to start publishing.'],
      ];

  return (
    <div className="min-h-full bg-paper-dim p-3 sm:p-6">
      <div className="mx-auto max-w-4xl">
        <Link
          href={returnTo}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-ink"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          {returningToTask
            ? isZh
              ? '返回当前任务'
              : 'Back to current task'
            : isZh
              ? '返回 Launch Calendar'
              : 'Back to calendar'}
        </Link>

        <section className="mt-4 overflow-hidden rounded-3xl bg-white shadow-[0_2px_16px_rgba(0,0,0,0.04)]">
          <div className="p-6 sm:p-9">
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div className="max-w-2xl">
                <span className="inline-flex rounded-full bg-paper-dim px-3 py-1 text-[11px] font-medium text-ink">
                  {isZh ? 'Chrome 开发预览版' : 'Chrome developer preview'}
                </span>
                <h1 className="mt-4 font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight text-ink sm:text-3xl">
                  {isZh ? '安装 NowBuild 发布插件' : 'Install NowBuild Publisher'}
                </h1>
                <p className="mt-3 text-sm leading-relaxed text-zinc-500 sm:text-[15px]">
                  {isZh
                    ? `安装后，插件会使用浏览器已有登录状态操作真实平台页面。现有 ${STABLE_CHANNEL_COUNT} 个稳定内容适配器、${BETA_CHANNEL_COUNT} 个 Beta 内容适配器和 ${CONFIGURED_DIRECTORY_COUNT} 个产品目录自动提交流程。插件不保存账号密码；遇到验证码、付费或平台要求确认时会交还给你。`
                    : `The extension uses your existing browser sessions on real platform pages. It currently has ${STABLE_CHANNEL_COUNT} stable content adapters, ${BETA_CHANNEL_COUNT} beta adapters, and automated submission flows for ${CONFIGURED_DIRECTORY_COUNT} directories. It stores no passwords and hands control back for CAPTCHAs, payments, or platform-required confirmation.`}
                </p>
              </div>

              <div
                className={`flex items-center gap-2 rounded-full px-3 py-2 text-xs font-medium ${
                  publisher?.installed && !needsUpgrade
                    ? 'bg-ink text-white'
                    : needsUpgrade
                      ? 'bg-amber-50 text-amber-700'
                      : 'bg-paper-dim text-ink-soft'
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    checking
                      ? 'animate-pulse bg-zinc-300'
                      : publisher?.installed && !needsUpgrade
                        ? 'bg-emerald-400'
                        : needsUpgrade
                          ? 'bg-amber-400'
                          : 'bg-zinc-300'
                  }`}
                />
                {checking
                  ? isZh
                    ? '正在检测…'
                    : 'Checking…'
                  : publisher?.installed && !needsUpgrade
                    ? isZh
                      ? `已安装 · v${publisher.version ?? ''}`
                      : `Installed · v${publisher.version ?? ''}`
                    : needsUpgrade
                      ? isZh
                        ? `有新版本 · 当前 v${publisher?.version ?? ''}`
                        : `Update available · v${publisher?.version ?? ''}`
                      : isZh
                        ? '尚未安装'
                        : 'Not installed'}
              </div>
            </div>

            {needsUpgrade && (
              <div className="mt-7 overflow-hidden rounded-2xl border border-amber-200 bg-amber-50">
                <div className="border-b border-amber-200 px-5 py-4">
                  <p className="text-sm font-semibold text-amber-900">
                    {isZh
                      ? `发现新版本 v${PUBLISHER_EXTENSION_VERSION}`
                      : `New version available: v${PUBLISHER_EXTENSION_VERSION}`}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-amber-800">
                    {isZh
                      ? `你当前安装的是 v${publisher?.version ?? '未知'}。请下载并重新加载插件，以修复小红书数据采集等问题。`
                      : `You are on v${publisher?.version ?? 'unknown'}. Download and reload the extension to get Xiaohongshu metrics fixes and other updates.`}
                  </p>
                </div>
                {releaseNotes && (
                  <ul className="space-y-2 px-5 py-4 text-xs leading-relaxed text-amber-900">
                    {(isZh ? releaseNotes.zh : releaseNotes.en).map((item) => (
                      <li key={item} className="flex gap-2">
                        <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-amber-500" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {publisher?.installed && !needsUpgrade ? (
              <div className="mt-7 rounded-2xl bg-paper-dim p-5">
                <div className="flex items-start gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink text-white">
                    <CheckIcon />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-ink">
                      {isZh ? '发布插件已经可以使用' : 'Publisher is ready'}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                      {isZh
                        ? `当前版本 v${publisher.version ?? PUBLISHER_EXTENSION_VERSION} 已是最新。返回任意小红书或 X 内容，点击“准备发布”即可开始。`
                        : `You are on the latest version v${publisher.version ?? PUBLISHER_EXTENSION_VERSION}. Return to any Xiaohongshu or X content and choose “Prepare to publish”.`}
                    </p>
                    <Link
                      href={returnTo}
                      className="mt-3 inline-flex h-10 items-center rounded-full bg-ink px-5 text-sm font-semibold text-white hover:bg-zinc-800"
                    >
                      {returningToTask
                        ? isZh
                          ? '返回当前任务并继续发布'
                          : 'Return to the task and continue'
                        : isZh
                          ? '返回 Launch Calendar'
                          : 'Return to calendar'}
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <div className={needsUpgrade ? 'mt-5' : 'mt-7'}>
                <div className="flex flex-wrap items-center gap-3">
                  <a
                    href={downloadUrl}
                    download
                    className="inline-flex h-11 items-center gap-2 rounded-full bg-ink px-6 text-sm font-semibold text-white hover:bg-zinc-800"
                  >
                    <DownloadIcon />
                    {needsUpgrade
                      ? isZh
                        ? `下载 v${PUBLISHER_EXTENSION_VERSION} 更新`
                        : `Download v${PUBLISHER_EXTENSION_VERSION} update`
                      : isZh
                        ? '下载 Chrome 插件'
                        : 'Download Chrome extension'}
                  </a>
                  <button
                    onClick={() => void checkExtension()}
                    disabled={checking}
                    className="h-11 rounded-full bg-paper-dim px-5 text-sm font-medium text-ink-soft hover:bg-zinc-200 disabled:text-zinc-300"
                  >
                    {isZh ? '我已安装，重新检测' : 'I installed it — check again'}
                  </button>
                  <span className="text-xs text-zinc-400">
                    {isZh
                      ? `最新版本 ${PUBLISHER_EXTENSION_VERSION} · 仅支持桌面版 Chrome`
                      : `Latest version ${PUBLISHER_EXTENSION_VERSION} · Desktop Chrome only`}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-zinc-100 p-6 sm:p-9">
            <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-ink">
              {needsUpgrade
                ? isZh
                  ? '4 步完成更新'
                  : 'Update in four steps'
                : isZh
                  ? '4 步完成安装'
                  : 'Install in four steps'}
            </h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {steps.map(([title, description], index) => (
                <div key={title} className="rounded-2xl bg-paper-dim p-4">
                  <div className="flex items-start gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-xs font-semibold text-ink shadow-[0_1px_5px_rgba(0,0,0,0.05)]">
                      {index + 1}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-ink">{title}</p>
                      <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                        {description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-zinc-100 p-6 sm:p-9">
            <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-ink">
              {isZh ? '内容平台能力矩阵' : 'Content platform capability matrix'}
            </h2>
            <p className="mt-2 text-xs leading-5 text-zinc-500">
              {isZh
                ? '“能规划”不等于“能自动发布”。X 与小红书是稳定适配器；其余平台为辅助填充 Beta，最终发布始终由你确认。'
                : 'Planning a channel is different from automating its publishing. X and Xiaohongshu are stable; the other adapters are assisted-fill betas, and you always confirm publishing.'}
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {CHANNEL_CAPABILITIES.filter(
                (item) => item.extensionSupport !== 'none'
              ).map((item) => (
                <div key={item.channelId} className="rounded-2xl bg-paper-dim p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-ink">
                      {isZh ? item.name : item.nameEn}
                    </p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase ${
                        item.extensionSupport === 'stable'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {item.extensionSupport}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {capabilityLabels(item, isZh).map((label) => (
                      <span
                        key={label}
                        className="rounded-full bg-white px-2 py-1 text-[10px] text-zinc-500"
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                  {!item.planned && (
                    <p className="mt-2 text-[10px] text-zinc-400">
                      {isZh
                        ? '插件支持辅助填充，但当前不是独立 Channel Agent。'
                        : 'Assisted fill is available, but this is not currently a standalone Channel Agent.'}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-zinc-100 p-6 sm:p-9">
            <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-ink">
              {isZh ? '插件会做什么' : 'What the extension can do'}
            </h2>
            <div className="mt-4 grid gap-3 text-xs leading-relaxed text-zinc-500 sm:grid-cols-3">
              <div className="rounded-2xl bg-paper-dim p-4">
                <p className="font-semibold text-ink">{isZh ? '按平台独立适配' : 'Platform-specific adapters'}</p>
                <p className="mt-1">
                  {isZh ? `稳定支持 X、小红书，并提供 ${BETA_CHANNEL_COUNT} 个 Beta 内容平台与 ${CONFIGURED_DIRECTORY_COUNT} 个目录自动提交流程。` : `Stable on X and Xiaohongshu, with ${BETA_CHANNEL_COUNT} beta content platforms and automated submission flows for ${CONFIGURED_DIRECTORY_COUNT} directories.`}
                </p>
              </div>
              <div className="rounded-2xl bg-paper-dim p-4">
                <p className="font-semibold text-ink">{isZh ? '不保存登录信息' : 'No login storage'}</p>
                <p className="mt-1">
                  {isZh ? '直接使用你浏览器中已有的平台登录状态。' : 'Uses the sessions already present in your browser.'}
                </p>
              </div>
              <div className="rounded-2xl bg-paper-dim p-4">
                <p className="font-semibold text-ink">{isZh ? '不自动点击发布' : 'You confirm publishing'}</p>
                <p className="mt-1">
                  {isZh ? '插件填写内容，最终发布按钮由你点击。' : 'The extension fills content; you click the final button.'}
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default function PublisherExtensionPage() {
  return (
    <Suspense fallback={<div className="min-h-full bg-paper-dim" />}>
      <PublisherExtensionPageContent />
    </Suspense>
  );
}
