import { NextResponse } from 'next/server';
import { checkAuth } from '../_lib/auth';
import {
  generateDirectoryMaterials,
  type DirectoryMaterialGenerationInput,
} from '@/lib/agents/directory-materials';
import type { DirectoryMaterialKey } from '@/lib/gtm/types';

export const maxDuration = 90;

function text(value: unknown, limit: number): string {
  return typeof value === 'string' ? value.trim().slice(0, limit) : '';
}

function textList(value: unknown, limit: number): string[] {
  return Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim().slice(0, 300))
        .filter(Boolean)
        .slice(0, limit)
    : [];
}

export async function POST(request: Request) {
  if (!(await checkAuth())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const raw = (await request.json()) as Record<string, unknown>;
    const productName = text(raw.productName, 200);
    const productUrl = text(raw.productUrl, 2_000);
    if (!productName || !productUrl) {
      return NextResponse.json(
        { error: 'Product name and URL are required' },
        { status: 400 }
      );
    }
    const input: DirectoryMaterialGenerationInput = {
      productName,
      productUrl,
      productSummary: text(raw.productSummary, 4_000),
      positioning: text(raw.positioning, 2_000),
      sellingPoints: textList(raw.sellingPoints, 20),
      pricing: text(raw.pricing, 500),
      sourceMarkdown: text(raw.sourceMarkdown, 30_000),
      requestedFields: textList(raw.requestedFields, 20) as DirectoryMaterialKey[],
      locale: raw.locale === 'en' ? 'en' : 'zh',
    };
    return NextResponse.json(await generateDirectoryMaterials(input));
  } catch (error) {
    console.error('directory-materials agent error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Agent failed' },
      { status: 500 }
    );
  }
}
