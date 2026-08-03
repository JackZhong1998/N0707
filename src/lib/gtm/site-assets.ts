import type { DirectoryLaunchKit } from './types';

export type WebsiteAsset = DirectoryLaunchKit['assets'][number];
export type WebsiteSocialLinks = Partial<
  Pick<
    DirectoryLaunchKit,
    'twitterUrl' | 'linkedinUrl' | 'githubUrl' | 'discordUrl' | 'youtubeUrl'
  >
>;

type CollectedWebsiteAsset = Omit<WebsiteAsset, 'id'>;

export async function collectSiteAssetsFromServer(
  productUrl: string
): Promise<{ assets: CollectedWebsiteAsset[]; socialLinks: WebsiteSocialLinks }> {
  const response = await fetch('/api/site-assets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productUrl }),
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
    };
    throw new Error(payload.error || `Asset collection failed: ${response.status}`);
  }
  return response.json() as Promise<{
    assets: CollectedWebsiteAsset[];
    socialLinks: WebsiteSocialLinks;
  }>;
}

export function mergeWebsiteSocialLinks(
  kit: DirectoryLaunchKit,
  discovered: WebsiteSocialLinks | undefined
): DirectoryLaunchKit {
  return {
    ...kit,
    twitterUrl: kit.twitterUrl || discovered?.twitterUrl || '',
    linkedinUrl: kit.linkedinUrl || discovered?.linkedinUrl || '',
    githubUrl: kit.githubUrl || discovered?.githubUrl || '',
    discordUrl: kit.discordUrl || discovered?.discordUrl || '',
    youtubeUrl: kit.youtubeUrl || discovered?.youtubeUrl || '',
  };
}

export function mergeWebsiteAssets(
  current: WebsiteAsset[],
  incoming: Array<Omit<WebsiteAsset, 'id'> | WebsiteAsset>
): WebsiteAsset[] {
  const manual = current.filter(
    (asset) => asset.source === 'manual' || !asset.source
  );
  const seen = new Set(
    manual.map((asset) => asset.sourceUrl || `${asset.kind}:${asset.name}`)
  );
  const collected = incoming
    .filter((asset) => {
      const key = asset.sourceUrl || `${asset.kind}:${asset.name}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((asset) => ({
      ...asset,
      id: 'id' in asset && asset.id ? asset.id : crypto.randomUUID(),
    }));
  return [...manual, ...collected].slice(0, 6);
}
