export type LaunchAgentId =
  | 'launch_partner'
  | 'research'
  | 'context'
  | 'strategy'
  | 'repurposing'
  | 'channel'
  | 'content'
  | 'publishing'
  | 'directory'
  | 'review';

export interface LaunchAgentDefinition {
  id: LaunchAgentId;
  role: string;
  userVisible: boolean;
  owns: string;
  reads: string[];
  writes: string[];
  confirmationBoundary: string;
}

/**
 * Runtime architecture contract for the PRD's one-partner/many-worker model.
 * Prompts describe task-specific behavior; this registry keeps ownership and
 * handoff boundaries explicit and reviewable in one place.
 */
export const LAUNCH_AGENT_ARCHITECTURE: LaunchAgentDefinition[] = [
  {
    id: 'launch_partner',
    role: 'Only user-visible orchestrator and scope owner',
    userVisible: true,
    owns: 'intent, routing, final explanation, confirmations, undo',
    reads: ['current request', 'ViewContext', 'campaign context', 'worker results'],
    writes: ['user reply', 'bounded worker actions'],
    confirmationBoundary: 'requests confirmation only for global/destructive or external side effects',
  },
  {
    id: 'research',
    role: 'Evidence collector and Launch Brief synthesizer',
    userVisible: false,
    owns: 'website/competitor evidence with provenance, and the first evidence-backed Launch Brief',
    reads: ['product URL', 'retrieved public sources'],
    writes: [
      'research sources',
      'Product Profile markdown',
      'competitor analysis',
      'Launch Brief (website/inferred labeled; never invents generic SaaS copy)',
    ],
    confirmationBoundary: 'read-only externally; synthesizes Brief from retrieved evidence only',
  },
  {
    id: 'context',
    role: 'Durable memory curator',
    userVisible: false,
    owns: 'facts, decisions, preferences, active commitments, scope',
    reads: ['recent conversation', 'current campaign context'],
    writes: ['bounded profiles', 'conversation summary', 'memory facts'],
    confirmationBoundary: 'never upgrades inference to confirmed fact',
  },
  {
    id: 'strategy',
    role: 'Campaign spine planner',
    userVisible: false,
    owns: 'one Blueprint, pillars, four-week narrative, channel roles',
    reads: ['Product Profile', 'Launch Brief', 'evidence', 'router Skills'],
    writes: ['Blueprint', 'channel-native role briefs'],
    confirmationBoundary: 'local reversible plans auto-continue; global resets require confirmation',
  },
  {
    id: 'repurposing',
    role: 'Content atom and cross-channel transformation planner',
    userVisible: false,
    owns: 'verified source ideas, truth boundaries, channel-native variant briefs',
    reads: ['Blueprint', 'evidence', 'performance signals', 'channel output contracts'],
    writes: ['core topics', 'channel variants', 'asset dependencies'],
    confirmationBoundary: 'plans reusable ideas only; cannot invent evidence or create external side effects',
  },
  {
    id: 'channel',
    role: 'One native specialist per supported channel',
    userVisible: false,
    owns: 'channel playbook, cadence, output mode, task skeleton',
    reads: ['shared Blueprint', 'scoped channel plan', 'channel Skills', 'variant brief'],
    writes: ['future channel tasks', 'channel plan revisions', 'deliverable contract'],
    confirmationBoundary: 'cannot publish, submit, pay, log in, or alter other channels',
  },
  {
    id: 'content',
    role: 'Deliverable producer for a scoped task',
    userVisible: false,
    owns: 'publish-ready text or explicitly labeled production package',
    reads: ['scoped task', 'Blueprint', 'channel Skill', 'confirmed facts', 'fresh research'],
    writes: ['draft', 'ready text', 'script', 'storyboard', 'visual brief', 'asset dependencies'],
    confirmationBoundary: 'prepares only; factual gaps stay marked for verification',
  },
  {
    id: 'publishing',
    role: 'External execution gate',
    userVisible: false,
    owns: 'publish readiness, side-effect boundary, proof capture',
    reads: ['ready content', 'account state', 'explicit user confirmation'],
    writes: ['published status', 'URL and proof'],
    confirmationBoundary: 'every external publish/send requires confirmation at execution time',
  },
  {
    id: 'directory',
    role: 'Persistent directory pipeline worker',
    userVisible: false,
    owns: 'discovery, matching, preparation, submission state, verification',
    reads: ['verified product facts', 'directory Skill', 'current listing evidence'],
    writes: ['directory workspace state', 'aggregated blocker/calendar tasks'],
    confirmationBoundary: 'submission, login, CAPTCHA, payment, or data transfer requires confirmation',
  },
  {
    id: 'review',
    role: 'Evidence-based weekly optimizer',
    userVisible: false,
    owns: 'observations, hypotheses, safe next-week adjustments',
    reads: ['published locks', 'performance evidence', 'campaign context'],
    writes: ['weekly review', 'safe future-task patches', 'risky proposals'],
    confirmationBoundary: 'safe reversible changes auto-apply; global/destructive changes wait',
  },
];

export function formatAgentArchitectureForPrompt(): string {
  return LAUNCH_AGENT_ARCHITECTURE.map(
    (agent) =>
      `- ${agent.id}: ${agent.role}; owns ${agent.owns}; confirmation: ${agent.confirmationBoundary}`
  ).join('\n');
}
