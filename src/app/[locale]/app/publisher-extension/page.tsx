'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import {
  detectPublisherExtension,
  type PublisherAvailability,
} from '@/lib/gtm/publisher-extension';

const CURRENT_EXTENSION_VERSION = '0.2.1';
const DOWNLOAD_URL = `/downloads/nowbuild-publisher-extension-${CURRENT_EXTENSION_VERSION}.zip`;

function isOlderExtensionVersion(version?: string): boolean {
  if (!version) return true;
  const installed = version.split('.').map((part) => Number(part));
  const current = CURRENT_EXTENSION_VERSION.split('.').map((part) => Number(part));

  for (let index = 0; index < Math.max(installed.length, current.length); index += 1) {
    const installedPart = installed[index] ?? 0;
    const currentPart = current[index] ?? 0;
    if (installedPart < currentPart) return true;
    if (installedPart > currentPart) return false;
  }
  return false;
}

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

export default function PublisherExtensionPage() {
  const locale = useLocale();
  const isZh = locale !== 'en';
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
    publisher?.installed === true && isOlderExtensionVersion(publisher.version);

  const steps = isZh
    ? [
        ['下载并解压插件', '点击下方按钮下载 ZIP，下载完成后双击解压。'],
        ['打开 Chrome 扩展程序', '在地址栏输入 chrome://extensions，然后打开“开发者模式”。'],
        ['加载插件文件夹', '点击“加载已解压的扩展程序”，选择解压后的 browser-extension 文件夹。'],
        ['刷新 NowBuild', '回到内容页面并刷新，之后即可自动填写小红书和 X 发布页面。'],
      ]
    : [
        ['Download and unzip', 'Download the ZIP below, then unzip it on your computer.'],
        ['Open Chrome extensions', 'Enter chrome://extensions and enable Developer mode.'],
        ['Load the extension folder', 'Choose “Load unpacked” and select the extracted browser-extension folder.'],
        ['Refresh NowBuild', 'Return to your content and refresh the page to start publishing.'],
      ];

  return (
    <div className="min-h-full bg-paper-dim p-3 sm:p-6">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/app/calendar"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-ink"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          {isZh ? '返回行动日历' : 'Back to calendar'}
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
                    ? '安装后，NowBuild 可以在你已经登录的小红书和 X 页面中填写内容。插件不保存账号密码，也不会调用 AI。最终发布仍由你确认。'
                    : 'The extension fills Xiaohongshu and X using your existing browser sessions. It stores no passwords, calls no AI, and leaves the final publish action to you.'}
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
                        ? `需要更新 · v${publisher?.version ?? ''}`
                        : `Update needed · v${publisher?.version ?? ''}`
                    : isZh
                      ? '尚未安装'
                      : 'Not installed'}
              </div>
            </div>

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
                        ? '返回任意小红书或 X 内容，点击“准备发布”即可开始。'
                        : 'Return to any Xiaohongshu or X content and choose “Prepare to publish”.'}
                    </p>
                    <Link
                      href="/app/calendar"
                      className="mt-3 inline-flex h-10 items-center rounded-full bg-ink px-5 text-sm font-semibold text-white hover:bg-zinc-800"
                    >
                      {isZh ? '返回行动日历' : 'Return to calendar'}
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-7">
                {needsUpgrade && (
                  <div className="mb-4 rounded-2xl bg-amber-50 p-4 text-xs leading-relaxed text-amber-800">
                    {isZh
                      ? '你安装的是旧版本。请下载 0.2.1，替换原插件文件夹后，在 chrome://extensions 中点击插件的“重新加载”，最后刷新 NowBuild 页面。'
                      : 'Your extension is outdated. Download 0.2.1, replace the old extension folder, click Reload in chrome://extensions, then refresh NowBuild.'}
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-3">
                  <a
                    href={DOWNLOAD_URL}
                    download
                    className="inline-flex h-11 items-center gap-2 rounded-full bg-ink px-6 text-sm font-semibold text-white hover:bg-zinc-800"
                  >
                    <DownloadIcon />
                    {needsUpgrade
                      ? isZh
                        ? '下载插件更新'
                        : 'Download update'
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
                      ? `版本 ${CURRENT_EXTENSION_VERSION} · 仅支持桌面版 Chrome`
                      : `Version ${CURRENT_EXTENSION_VERSION} · Desktop Chrome only`}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-zinc-100 p-6 sm:p-9">
            <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-ink">
              {isZh ? '4 步完成安装' : 'Install in four steps'}
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
              {isZh ? '插件会做什么' : 'What the extension can do'}
            </h2>
            <div className="mt-4 grid gap-3 text-xs leading-relaxed text-zinc-500 sm:grid-cols-3">
              <div className="rounded-2xl bg-paper-dim p-4">
                <p className="font-semibold text-ink">{isZh ? '只操作两个渠道' : 'Two channels only'}</p>
                <p className="mt-1">
                  {isZh ? '仅在小红书、X 和 NowBuild 页面运行。' : 'Runs only on Xiaohongshu, X, and NowBuild.'}
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
