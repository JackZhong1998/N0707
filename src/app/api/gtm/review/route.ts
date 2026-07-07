import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { runWeeklyReview } from '@/lib/agents/reviewer';
import type { UnifiedDayPlan, TaskFeedback } from '@/lib/gtm/types';

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { dayIndex, calendar, feedbacks } = body as {
      dayIndex: number;
      calendar: UnifiedDayPlan[];
      feedbacks: Record<string, TaskFeedback>;
    };

    const review = await runWeeklyReview(dayIndex, calendar, feedbacks);
    return NextResponse.json({ review });
  } catch (error) {
    console.error('Review error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Review failed' },
      { status: 500 }
    );
  }
}
