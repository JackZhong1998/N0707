'use client';

import { ChangeEvent, useMemo, useState } from 'react';
import { useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useGtm } from '@/lib/gtm/store';
import { collectSiteAssetsWithExtension } from '@/lib/gtm/publisher-extension';
import {
  collectSiteAssetsFromServer,
  mergeWebsiteAssets,
  mergeWebsiteSocialLinks,
} from '@/lib/gtm/site-assets';
import type { DirectoryLaunchKit } from '@/lib/gtm/types';

const emptyContact = {
  founderName: '',
  founderBio: '',
  founderEmail: '',
  founderUrl: '',
  twitterUrl: '',
  linkedinUrl: '',
  githubUrl: '',
  discordUrl: '',
  youtubeUrl: '',
  demoUrl: '',
};

export default function LaunchKitPage() {
  const gtm = useGtm();
  const isZh = useLocale() !== 'en';
  const launch = gtm.store.launch;
  const initial = useMemo<DirectoryLaunchKit | null>(() => {
    if (!launch) return null;
    return launch.directoryLaunchKit ?? {
      productName: launch.project.productName,
      productUrl: launch.project.productUrl,
      tagline: launch.brief?.positioning.statement ?? '',
      shortDescription: launch.brief?.product.summary ?? '',
      longDescription:
        launch.brief?.sourceMarkdown ?? launch.brief?.product.summary ?? '',
      categories: [],
      tags: launch.brief?.positioning.sellingPoints ?? [],
      companyName: launch.project.productName,
      featureHighlights: launch.brief?.positioning.sellingPoints ?? [],
      supportedPlatforms: [],
      integrations: [],
      techStack: [],
      productStage: '',
      apiAvailability: '',
      communityAvailability: '',
      backlinkUrl: '',
      pricing: launch.brief?.product.pricing ?? '',
      ...emptyContact,
      demoUrl: launch.project.productUrl,
      launchDate: launch.project.startDate,
      assets: [],
    };
  }, [launch]);
  const [kit, setKit] = useState<DirectoryLaunchKit | null>(initial);
  const [message, setMessage] = useState('');
  const [collectingAssets, setCollectingAssets] = useState(false);
  const missingForCurrentBatch = useMemo(() => {
    const missing = (launch?.directoryJobs ?? [])
      .filter((job) => job.status === 'needs_materials')
      .flatMap((job) =>
        job.preflight.checks
          .filter((check) => check.status !== 'ready')
          .map((check) => ({
            key: `${check.key}:${check.detail ?? ''}`,
            label: check.label,
            detail: check.detail,
          }))
      );
    return [...new Map(missing.map((item) => [item.key, item])).values()];
  }, [launch?.directoryJobs]);

  if (!launch || !kit) {
    return (
      <div className="flex h-full items-center justify-center">
        <Link href="/app" className="text-sm text-zinc-400">
          {isZh ? '先建立你的冷启动 →' : 'Build your launch first →'}
        </Link>
      </div>
    );
  }

  const setText = (key: keyof DirectoryLaunchKit, value: string) =>
    setKit((current) => current ? { ...current, [key]: value } : current);

  const addAssets = (kind: 'logo' | 'screenshot') =>
    (event: ChangeEvent<HTMLInputElement>) => {
      const files = [...(event.target.files ?? [])];
      if (!files.length) return;
      if (files.some((file) => file.size > 1_500_000)) {
        setMessage(isZh ? '每张图片需小于 1.5MB。' : 'Each image must be under 1.5MB.');
        return;
      }
      for (const file of files) {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result !== 'string') return;
          setKit((current) => {
            if (!current) return current;
            const withoutLogo =
              kind === 'logo'
                ? current.assets.filter((asset) => asset.kind !== 'logo')
                : current.assets;
            return {
              ...current,
              assets: [
                ...withoutLogo,
                {
                  id: crypto.randomUUID(),
                  kind,
                  name: file.name,
                  dataUrl: reader.result as string,
                  source: 'manual' as const,
                },
              ].slice(0, 6),
            };
          });
        };
        reader.readAsDataURL(file);
      }
      event.target.value = '';
    };

  const save = () => {
    const required = [kit.productName, kit.productUrl, kit.tagline, kit.shortDescription];
    if (required.some((value) => !value.trim())) {
      setMessage(
        isZh
          ? '请至少填写产品名称、网址、Slogan 和简短介绍。'
          : 'Add a product name, URL, tagline, and short description.'
      );
      return;
    }
    gtm.update({
      launch: {
        ...launch,
        directoryLaunchKit: { ...kit, confirmedAt: Date.now() },
        project: { ...launch.project, updatedAt: Date.now() },
      },
    });
    setMessage(isZh ? 'Launch Kit 已保存，可用于目录自动提交。' : 'Launch Kit saved for automated directory submission.');
  };

  const collectWebsiteAssets = async () => {
    setCollectingAssets(true);
    setMessage(isZh ? '正在读取官网公开素材…' : 'Reading public website assets…');
    try {
      const serverResult = await collectSiteAssetsFromServer(kit.productUrl);
      let incoming = serverResult.assets;
      try {
        const extensionResult = await collectSiteAssetsWithExtension(kit.productUrl);
        incoming = [...incoming, ...extensionResult.assets];
      } catch {
        // The extension is optional; server-collected public assets are enough.
      }
      setKit((current) => current ? {
        ...mergeWebsiteSocialLinks(current, serverResult.socialLinks),
        assets: mergeWebsiteAssets(current.assets, incoming),
      } : current);
      setMessage(
        isZh
          ? `已采集 ${incoming.length} 张素材，请确认后保存。`
          : `Collected ${incoming.length} assets. Review and save them.`
      );
    } catch (error) {
      try {
        const extensionResult = await collectSiteAssetsWithExtension(kit.productUrl);
        setKit((current) => current ? {
          ...current,
          assets: mergeWebsiteAssets(current.assets, extensionResult.assets),
        } : current);
        setMessage(isZh ? `已通过浏览器采集 ${extensionResult.assets.length} 张素材。` : `Collected ${extensionResult.assets.length} assets through the browser.`);
      } catch {
        setMessage(
          error instanceof Error
            ? error.message
            : isZh ? '官网素材采集失败，请手动上传。' : 'Asset collection failed; upload manually.'
        );
      }
    } finally {
      setCollectingAssets(false);
    }
  };

  const fields: Array<[keyof DirectoryLaunchKit, string, string]> = [
    ['productName', isZh ? '产品名称' : 'Product name', 'text'],
    ['productUrl', isZh ? '产品网址' : 'Product URL', 'url'],
    ['tagline', 'Slogan', 'text'],
    ['shortDescription', isZh ? '简短介绍' : 'Short description', 'text'],
    ['pricing', isZh ? '定价方式' : 'Pricing', 'text'],
    ['companyName', isZh ? '公司名称' : 'Company name', 'text'],
    ['productStage', isZh ? '产品阶段' : 'Product stage', 'text'],
    ['apiAvailability', isZh ? 'API 可用性' : 'API availability', 'text'],
    ['communityAvailability', isZh ? '社区可用性' : 'Community availability', 'text'],
    ['backlinkUrl', isZh ? '反向链接页面' : 'Backlink page', 'url'],
    ['founderName', isZh ? '创始人姓名' : 'Founder name', 'text'],
    ['founderBio', isZh ? '创始人简介' : 'Founder bio', 'text'],
    ['founderEmail', isZh ? '联系邮箱' : 'Contact email', 'email'],
    ['founderUrl', isZh ? '创始人主页' : 'Founder URL', 'url'],
    ['twitterUrl', 'X / Twitter URL', 'url'],
    ['linkedinUrl', 'LinkedIn URL', 'url'],
    ['githubUrl', 'GitHub URL', 'url'],
    ['discordUrl', 'Discord URL', 'url'],
    ['youtubeUrl', 'YouTube URL', 'url'],
    ['demoUrl', isZh ? '演示网址' : 'Demo URL', 'url'],
    ['launchDate', isZh ? '发布日期' : 'Launch date', 'date'],
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-7 sm:px-8 sm:py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-brand-300">
            Directory Submission
          </p>
          <h1 className="mt-2 text-3xl font-black text-white">
            {isZh ? '目录提交资料' : 'Directory submission materials'}
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            {isZh
              ? '检查自动整理的资料，补充空白内容，并确认插件可使用的图片。'
              : 'Review detected details, fill any gaps, and confirm images the extension may use.'}
          </p>
        </div>
        <Link href="/app/directories" className="text-xs text-zinc-400 hover:text-white">
          {isZh ? '返回目录 →' : 'Back to directories →'}
        </Link>
      </header>

      {missingForCurrentBatch.length > 0 && (
        <section className="mt-5 rounded-3xl border border-amber-300/20 bg-amber-300/[0.04] p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-200">
            {isZh ? '当前批次还需要' : 'Needed for the current batch'}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {missingForCurrentBatch.map((item) => (
              <span
                key={item.key}
                className="rounded-full bg-amber-200/10 px-3 py-1.5 text-xs text-amber-100"
              >
                {item.label}
                {item.detail ? ` · ${item.detail}` : ''}
              </span>
            ))}
          </div>
        </section>
      )}

      <section className="mt-7 grid gap-4 rounded-3xl border border-white/[0.08] bg-white/[0.025] p-6 md:grid-cols-2">
        {fields.map(([key, label, type]) => (
          <label key={key} className={key === 'shortDescription' ? 'md:col-span-2' : ''}>
            <span className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">{label}</span>
            {key === 'shortDescription' ? (
              <textarea
                value={String(kit[key] ?? '')}
                onChange={(event) => setText(key, event.target.value)}
                rows={4}
                className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white"
              />
            ) : (
              <input
                type={type}
                value={String(kit[key] ?? '')}
                onChange={(event) => setText(key, event.target.value)}
                className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white"
              />
            )}
          </label>
        ))}
        <label className="md:col-span-2">
          <span className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">
            {isZh ? '完整介绍' : 'Long description'}
          </span>
          <textarea
            value={kit.longDescription}
            onChange={(event) => setText('longDescription', event.target.value)}
            rows={8}
            className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white"
          />
        </label>
        <label>
          <span className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">
            {isZh ? '分类（逗号分隔）' : 'Categories (comma separated)'}
          </span>
          <input
            value={kit.categories.join(', ')}
            onChange={(event) =>
              setKit({ ...kit, categories: event.target.value.split(',').map((v) => v.trim()).filter(Boolean).slice(0, 5) })
            }
            className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white"
          />
        </label>
        <label>
          <span className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">
            {isZh ? '标签（逗号分隔）' : 'Tags (comma separated)'}
          </span>
          <input
            value={kit.tags.join(', ')}
            onChange={(event) =>
              setKit({ ...kit, tags: event.target.value.split(',').map((v) => v.trim()).filter(Boolean).slice(0, 10) })
            }
            className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white"
          />
        </label>
        {([
          ['featureHighlights', isZh ? '核心功能（逗号分隔）' : 'Feature highlights (comma separated)'],
          ['supportedPlatforms', isZh ? '支持平台（逗号分隔）' : 'Supported platforms (comma separated)'],
          ['integrations', isZh ? '集成服务（逗号分隔）' : 'Integrations (comma separated)'],
          ['techStack', isZh ? '技术栈（逗号分隔）' : 'Tech stack (comma separated)'],
        ] as const).map(([key, label]) => (
          <label key={key}>
            <span className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">{label}</span>
            <input
              value={kit[key].join(', ')}
              onChange={(event) =>
                setKit({
                  ...kit,
                  [key]: event.target.value
                    .split(/[,，]/)
                    .map((value) => value.trim())
                    .filter(Boolean)
                    .slice(0, 10),
                })
              }
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white"
            />
          </label>
        ))}
      </section>

      <section className="mt-4 rounded-3xl border border-white/[0.08] p-6">
        <h2 className="text-lg font-bold text-white">{isZh ? 'Logo 与产品截图' : 'Logo and screenshots'}</h2>
        <p className="mt-1 text-xs text-zinc-500">
          {isZh ? 'Logo 1 张、截图最多 5 张；每张小于 1.5MB。' : 'One logo and up to five screenshots; each under 1.5MB.'}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={collectWebsiteAssets}
            disabled={collectingAssets || !kit.productUrl.trim()}
            className="rounded-full bg-brand-300 px-4 py-2 text-xs font-semibold text-black disabled:opacity-50"
          >
            {collectingAssets
              ? (isZh ? '正在采集…' : 'Collecting…')
              : (isZh ? '从官网自动采集' : 'Collect from website')}
          </button>
          <label className="cursor-pointer rounded-full bg-white px-4 py-2 text-xs font-semibold text-black">
            {kit.assets.some((asset) => asset.kind === 'logo') ? (isZh ? '替换 Logo' : 'Replace logo') : (isZh ? '上传 Logo' : 'Upload logo')}
            <input type="file" accept="image/*" className="hidden" onChange={addAssets('logo')} />
          </label>
          <label className="cursor-pointer rounded-full border border-white/10 px-4 py-2 text-xs text-zinc-300">
            {isZh ? '添加截图' : 'Add screenshots'}
            <input type="file" accept="image/*" multiple className="hidden" onChange={addAssets('screenshot')} />
          </label>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {kit.assets.map((asset) => (
            <div key={asset.id} className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/20">
              <img src={asset.dataUrl} alt={asset.name} className="aspect-video w-full object-contain" />
              <button
                onClick={() => setKit({ ...kit, assets: kit.assets.filter((item) => item.id !== asset.id) })}
                className="absolute right-2 top-2 rounded-full bg-black/70 px-2 py-1 text-[10px] text-white"
              >
                {isZh ? '移除' : 'Remove'}
              </button>
              <p className="truncate px-3 py-2 text-[10px] text-zinc-500">
                {asset.kind} · {asset.name} · {asset.source ?? 'manual'}
              </p>
            </div>
          ))}
          {!kit.assets.length && (
            <div className="col-span-full rounded-2xl border border-dashed border-white/10 p-8 text-center text-xs text-zinc-600">
              {isZh ? '尚未添加图片；需要图片的目录会要求你先补充。' : 'No images yet. Directories that require them will ask you to add them first.'}
            </div>
          )}
        </div>
      </section>

      <div className="mt-5 flex items-center justify-between gap-4">
        <p className="text-xs text-emerald-300">{message}</p>
        <button onClick={save} className="rounded-full bg-white px-5 py-2.5 text-xs font-bold text-black">
          {isZh ? '确认并保存' : 'Confirm and save'}
        </button>
      </div>
    </div>
  );
}
