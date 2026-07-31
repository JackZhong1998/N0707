import type { DirectorAction, GtmStore } from './types';
import {
  channelHasCalendarTodos,
  filterCalendarChannelIds,
} from './channel-capabilities';
import { resolvePendingChannelPlanIds } from './launch';
import type { AgentWorkStepDraft } from './agent-work-jobs';

/** Expand Director actions into durable, preferably sub-5-minute steps. */
export function expandDirectorActionsToSteps(
  actions: DirectorAction[],
  store: GtmStore
): AgentWorkStepDraft[] {
  const steps: AgentWorkStepDraft[] = [];
  let order = 100;

  const push = (draft: Omit<AgentWorkStepDraft, 'sortOrder'>) => {
    steps.push({ ...draft, sortOrder: order });
    order += 10;
  };

  for (const [actionIndex, action] of actions.entries()) {
    const prefix = `a${actionIndex}`;

    switch (action.type) {
      case 'select_channels':
        push({
          stepKey: `${prefix}:select_channels`,
          stepType: 'select_channels',
          actionPayload: action as unknown as Record<string, unknown>,
        });
        break;

      case 'recommend_channels':
        push({
          stepKey: `${prefix}:recommend_channels`,
          stepType: 'recommend_channels',
          actionPayload: action as unknown as Record<string, unknown>,
        });
        break;

      case 'generate_channel_plans': {
        const pending = resolvePendingChannelPlanIds(store, action.channelIds, {
          force: action.force === true,
        });
        if (pending.length === 0) {
          push({
            stepKey: `${prefix}:channel_plans_noop`,
            stepType: 'noop',
            actionPayload: {
              reason: 'all_ready',
              channelIds: action.channelIds,
            },
          });
          break;
        }
        for (const channelId of pending) {
          push({
            stepKey: `${prefix}:channel_strategy:${channelId}`,
            stepType: 'channel_strategy',
            channelId,
            actionPayload: {
              type: 'generate_channel_plans',
              channelId,
              force: action.force === true,
            },
          });
        }
        push({
          stepKey: `${prefix}:channel_plans_finalize`,
          stepType: 'channel_plans_finalize',
          actionPayload: {
            type: 'generate_channel_plans',
            channelIds: pending,
          },
        });
        break;
      }

      case 'generate_strategy': {
        // Blueprint-sized overview first when missing, then per-channel.
        if (!store.strategy?.overviewMarkdown) {
          push({
            stepKey: `${prefix}:strategy_blueprint`,
            stepType: 'strategy_blueprint',
            actionPayload: action as unknown as Record<string, unknown>,
          });
        }
        for (const channelId of action.channelIds) {
          push({
            stepKey: `${prefix}:strategy_channel:${channelId}`,
            stepType: 'channel_strategy',
            channelId,
            actionPayload: {
              type: 'generate_strategy',
              channelId,
              feedback: action.feedback,
            },
          });
        }
        break;
      }

      case 'generate_todos': {
        const hasTodos = store.todos.length > 0;
        const requested =
          hasTodos && action.channelIds.length > 0
            ? action.channelIds
            : [...new Set([...action.channelIds, ...store.channels])];
        for (const channelId of filterCalendarChannelIds(requested)) {
          push({
            stepKey: `${prefix}:todos:${channelId}`,
            stepType: 'channel_todos',
            channelId,
            actionPayload: { type: 'generate_todos', channelId },
          });
        }
        if (requested.some((channelId) => !channelHasCalendarTodos(channelId))) {
          push({
            stepKey: `${prefix}:directory_pipeline`,
            stepType: 'directory_pipeline',
            channelId: 'directory',
            actionPayload: { type: 'generate_todos', channelId: 'directory' },
          });
        }
        break;
      }

      case 'generate_topics':
        push({
          stepKey: `${prefix}:generate_topics`,
          stepType: 'generate_topics',
          actionPayload: action as unknown as Record<string, unknown>,
        });
        break;

      case 'research_product':
        push({
          stepKey: `${prefix}:research_product`,
          stepType: 'research_product',
          actionPayload: action as unknown as Record<string, unknown>,
        });
        break;

      case 'generate_weekly_review':
        push({
          stepKey: `${prefix}:weekly_review`,
          stepType: 'weekly_review',
          actionPayload: action as unknown as Record<string, unknown>,
        });
        break;

      case 'generate_todo_content':
        push({
          stepKey: `${prefix}:todo_content:${action.todoId}`,
          stepType: 'todo_content',
          actionPayload: action as unknown as Record<string, unknown>,
        });
        break;

      case 'rewrite_todo_content':
        push({
          stepKey: `${prefix}:rewrite_todo:${action.todoId}`,
          stepType: 'rewrite_todo_content',
          actionPayload: action as unknown as Record<string, unknown>,
        });
        break;

      case 'optimize_plan': {
        for (const channelId of action.channelIds.length
          ? action.channelIds
          : store.channels) {
          push({
            stepKey: `${prefix}:optimize_strategy:${channelId}`,
            stepType: 'channel_strategy',
            channelId,
            actionPayload: {
              type: 'optimize_plan',
              channelId,
              feedback: action.feedback,
            },
          });
          if (!channelHasCalendarTodos(channelId)) continue;
          push({
            stepKey: `${prefix}:optimize_todos:${channelId}`,
            stepType: 'channel_todos',
            channelId,
            actionPayload: {
              type: 'optimize_plan',
              channelId,
              feedback: action.feedback,
              preservePublished: true,
            },
          });
        }
        break;
      }

      case 'update_launch_artifact':
        push({
          stepKey: `${prefix}:launch_patch`,
          stepType: 'launch_patch',
          channelId: action.entityId,
          actionPayload: action as unknown as Record<string, unknown>,
        });
        break;

      case 'schedule_topic_variant':
        push({
          stepKey: `${prefix}:schedule_topic`,
          stepType: 'schedule_topic_variant',
          actionPayload: action as unknown as Record<string, unknown>,
        });
        break;

      case 'revise_topic_variant':
        push({
          stepKey: `${prefix}:revise_topic`,
          stepType: 'revise_topic_variant',
          actionPayload: action as unknown as Record<string, unknown>,
        });
        break;

      case 'undo_launch_change':
        push({
          stepKey: `${prefix}:undo`,
          stepType: 'undo_launch_change',
          actionPayload: action as unknown as Record<string, unknown>,
        });
        break;

      default:
        push({
          stepKey: `${prefix}:unsupported`,
          stepType: 'noop',
          actionPayload: { unsupported: true },
        });
        break;
    }
  }

  return steps;
}

export function defaultWorkLabel(
  actions: DirectorAction[],
  isZh: boolean
): string {
  const types = actions.map((action) => action.type);
  if (types.includes('research_product')) {
    return isZh ? '正在研究产品…' : 'Researching your product…';
  }
  if (types.includes('recommend_channels')) {
    return isZh ? '正在推荐渠道…' : 'Recommending channels…';
  }
  if (types.includes('generate_channel_plans')) {
    return isZh ? '正在编写渠道计划…' : 'Writing channel plans…';
  }
  if (types.includes('generate_todos')) {
    return isZh ? '正在生成 Todo…' : 'Generating todos…';
  }
  if (types.includes('generate_topics')) {
    return isZh ? '正在生成选题…' : 'Generating topics…';
  }
  if (types.includes('generate_weekly_review')) {
    return isZh ? '正在生成周复盘…' : 'Writing weekly review…';
  }
  return isZh ? '后台任务进行中…' : 'Running background work…';
}
