import { NextResponse } from 'next/server';
import { runChannelRecommender } from '@/lib/agents/channel-recommender';
import {
  loadMarketStrategyReport,
  saveMarketStrategyReportOnce,
} from '@/lib/gtm/database';
import { getSessionAccess } from '../_lib/auth';

export const maxDuration = 300;

function text(value: unknown, maxLength: number): string {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

export async function POST(request: Request) {
  const access = await getSessionAccess();
  if (!access.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const launchId = text(body.launchId, 180);
    const projectProfileDoc = text(body.projectProfileDoc, 40_000);
    const productName = text(body.productName, 200);
    const locale = body.locale === 'en' ? 'en' : 'zh';
    if (!launchId || !/^[a-zA-Z0-9_-]+$/.test(launchId)) {
      return NextResponse.json({ error: 'Invalid launch id' }, { status: 400 });
    }
    if (projectProfileDoc.length < 80) {
      return NextResponse.json(
        { error: 'Project document is too short' },
        { status: 400 }
      );
    }

    // Idempotency is checked before the model call and enforced again by the
    // unique database key. A refresh/retry never uploads a second report.
    if (access.userId) {
      const existing = await loadMarketStrategyReport(access.userId, launchId);
      if (existing) {
        return NextResponse.json({ report: existing, reused: true });
      }
    }

    const report = await runChannelRecommender({
      userProfileDoc: text(body.userProfileDoc, 8_000),
      projectProfileDoc,
      conversationDigest: text(body.conversationDigest, 8_000),
      campaignContext: text(body.campaignContext, 30_000),
      locale,
    });
    if (!access.userId) {
      // Local development demo has no durable user/project identity. Production
      // always persists before returning the report.
      return NextResponse.json({ report, reused: false, demo: true });
    }
    return NextResponse.json(
      await saveMarketStrategyReportOnce({
        clerkUserId: access.userId,
        launchId,
        locale,
        productName,
        report,
      })
    );
  } catch (error) {
    console.error('market strategy report error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Market strategy report failed',
      },
      { status: 500 }
    );
  }
}
