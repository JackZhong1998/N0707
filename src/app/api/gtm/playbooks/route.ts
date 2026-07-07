import { NextResponse } from 'next/server';
import { getAllPlaybookDisplays } from '@/lib/agents/skills/registry';

export async function GET() {
  return NextResponse.json({ playbooks: getAllPlaybookDisplays() });
}
