import { callOpenRouterJson, type OpenRouterMessage } from '@/lib/openrouter';
import type { DirectoryLaunchKit, DirectoryMaterialKey } from '@/lib/gtm/types';

export interface DirectoryMaterialGenerationInput {
  productName: string;
  productUrl: string;
  productSummary: string;
  positioning: string;
  sellingPoints: string[];
  pricing: string;
  sourceMarkdown: string;
  requestedFields: DirectoryMaterialKey[];
  locale: 'en' | 'zh';
}

export type GeneratedDirectoryMaterials = Partial<
  Pick<
    DirectoryLaunchKit,
    'tagline' | 'shortDescription' | 'longDescription' | 'categories' | 'tags'
  >
>;

function cleanList(value: unknown, limit: number): string[] {
  return Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, limit)
    : [];
}

function cleanText(value: unknown, limit: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const result = value.trim().slice(0, limit);
  return result || undefined;
}

export async function generateDirectoryMaterials(
  input: DirectoryMaterialGenerationInput
): Promise<GeneratedDirectoryMaterials> {
  const allowed = new Set([
    'tagline',
    'shortDescription',
    'longDescription',
    'categories',
    'tags',
  ]);
  const requested = input.requestedFields.filter((field) => allowed.has(field));
  if (!requested.length) return {};

  const system = `You prepare factual product-directory submission materials.
Return only JSON and only the requested fields.
Never invent customers, revenue, funding, usage numbers, awards, integrations, founder identity, or legal claims.
Use the supplied product facts. Keep product facts consistent across all fields.
tagline: one sentence, maximum 120 characters.
shortDescription: 30-280 characters.
longDescription: 120-1200 words when enough source material exists; otherwise use a shorter factual description.
categories: 1-5 concise software categories.
tags: 3-10 concise discovery tags.
Write in ${input.locale === 'zh' ? 'Simplified Chinese' : 'English'}.`;

  const messages: OpenRouterMessage[] = [
    { role: 'system', content: system },
    {
      role: 'user',
      content: `Requested fields: ${requested.join(', ')}

Product name: ${input.productName}
Product URL: ${input.productUrl}
Known summary: ${input.productSummary}
Positioning: ${input.positioning}
Selling points: ${input.sellingPoints.join('; ')}
Known pricing: ${input.pricing}

Source material:
${input.sourceMarkdown.slice(0, 20_000)}

Output shape:
{"tagline":"...","shortDescription":"...","longDescription":"...","categories":["..."],"tags":["..."]}`,
    },
  ];
  const raw = await callOpenRouterJson<Record<string, unknown>>(messages, {
    temperature: 0.3,
    maxTokens: 3000,
  });
  const output: GeneratedDirectoryMaterials = {};
  if (requested.includes('tagline')) {
    output.tagline = cleanText(raw.tagline, 120);
  }
  if (requested.includes('shortDescription')) {
    output.shortDescription = cleanText(raw.shortDescription, 500);
  }
  if (requested.includes('longDescription')) {
    output.longDescription = cleanText(raw.longDescription, 12_000);
  }
  if (requested.includes('categories')) {
    output.categories = cleanList(raw.categories, 5);
  }
  if (requested.includes('tags')) {
    output.tags = cleanList(raw.tags, 10);
  }
  return output;
}
