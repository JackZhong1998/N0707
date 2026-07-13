import { NextResponse } from 'next/server';
import { getAllPlaybookDisplays, getAllGingirisSkills } from '@/lib/agents/skills/registry';

export async function GET() {
  const gingirisSkills = getAllGingirisSkills();
  return NextResponse.json({
    playbooks: getAllPlaybookDisplays(),
    gingirisSkillCount: gingirisSkills.length,
    gingirisSkills,
  });
}
