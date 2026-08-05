'use client';

import { sanitizeDirectoryLaunchKitForExtension } from '@/lib/directories/materials';
import type {
  DirectoryAssetSpec,
  DirectoryLaunchKit,
  DirectoryMaterialRequirement,
} from './types';

export type SupportedPublishChannel =
  | 'twitter_x'
  | 'xiaohongshu'
  | 'hacker_news'
  | 'devto'
  | 'reddit'
  | 'linkedin'
  | 'medium'
  | 'hashnode'
  | 'indie_hackers';

export type PublisherStatus =
  | 'opening'
  | 'filling'
  | 'needs_user_action'
  | 'awaiting_user'
  | 'waiting_login'
  | 'publishing'
  | 'published'
  | 'blocked'
  | 'failed';

export interface PublisherContent {
  title: string;
  body: string;
  url?: string;
  hashtags?: string[];
  media?: Array<{ url: string; type?: 'image' | 'video' }>;
}

export interface PublisherEvent {
  requestId: string;
  status: PublisherStatus;
  message?: string;
  postUrl?: string;
  postUrlConfidence?: 'high' | 'low';
  error?: string;
}

export interface PublisherAvailability {
  installed: boolean;
  version?: string;
  supportedChannels: string[];
  supportedDirectories: Array<{
    id: string;
    name: string;
    pricing?: string;
    entryStage?: string;
    requirements?: DirectoryMaterialRequirement[];
    requirementsConfidence?: 'verified' | 'partial';
    assetSpecs?: Partial<
      Record<'logo' | 'screenshot', DirectoryAssetSpec>
    >;
    submissionPolicy?: 'prepare_only' | 'auto_submit_opt_in';
  }>;
}

export interface MetricsCollectionEvent {
  requestId: string;
  status: 'opening' | 'collecting' | 'collected' | 'failed';
  message?: string;
  metrics?: {
    impressions?: number;
    views?: number;
    likes?: number;
    comments?: number;
    shares?: number;
    saves?: number;
    clicks?: number;
    followersGained?: number;
  };
  error?: string;
}

export interface CollectedSiteAsset {
  kind: 'logo' | 'screenshot';
  name: string;
  dataUrl: string;
  sourceUrl?: string;
  source: 'metadata' | 'homepage_capture';
}

export interface ExtensionTaskEvent {
  requestId: string;
  status: string;
  message?: string;
  blocker?: string;
  postUrl?: string;
  error?: string;
  directoryResult?: {
    directoryId?: string;
    directoryName?: string;
    blocker?: string;
    blockerDetail?: string;
    missingRequired?: string[];
    filledFields?: string[];
    uploadedAssets?: Array<{ kind?: string; name?: string }>;
    pageUrl?: string;
    stage?: string;
  };
}

export interface ExtensionTaskState {
  requestId: string;
  kind?: string;
  directoryId?: string;
  lastStatus?: string;
  createdAt?: number;
  updatedAt?: number;
}

const COMMAND_TYPE = 'NOWBUILD_EXTENSION_COMMAND';
const EVENT_TYPE = 'NOWBUILD_EXTENSION_EVENT';

function sendCommand<T>(
  command: string,
  data: Record<string, unknown> = {},
  timeoutMs = 1800
): Promise<T> {
  const requestId =
    typeof data.requestId === 'string' ? data.requestId : crypto.randomUUID();
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      window.removeEventListener('message', onMessage);
      reject(new Error('NowBuild 发布插件未响应'));
    }, timeoutMs);

    function onMessage(event: MessageEvent) {
      if (event.source !== window || event.origin !== window.location.origin) return;
      const message = event.data;
      if (
        message?.source !== 'NOWBUILD_EXTENSION' ||
        message?.type !== EVENT_TYPE ||
        message?.requestId !== requestId ||
        !message.response
      ) {
        return;
      }
      window.clearTimeout(timeout);
      window.removeEventListener('message', onMessage);
      if (message.response.ok === false) {
        reject(new Error(message.response.error || '插件执行失败'));
        return;
      }
      resolve(message.response as T);
    }

    window.addEventListener('message', onMessage);
    window.postMessage(
      {
        source: 'NOWBUILD_WEB',
        type: COMMAND_TYPE,
        command,
        requestId,
        ...data,
      },
      window.location.origin
    );
  });
}

export async function detectPublisherExtension(): Promise<PublisherAvailability> {
  try {
    const response = await sendCommand<{
      installed: boolean;
      version?: string;
      supportedChannels?: string[];
      supportedDirectories?: PublisherAvailability['supportedDirectories'];
    }>('PING');
    return {
      installed: response.installed === true,
      version: response.version,
      supportedChannels: response.supportedChannels ?? [],
      supportedDirectories: response.supportedDirectories ?? [],
    };
  } catch {
    return { installed: false, supportedChannels: [], supportedDirectories: [] };
  }
}

export async function submitDirectoryWithExtension(
  directoryId: string,
  launchKit: DirectoryLaunchKit,
  options: { allowFinalSubmit?: boolean } = {}
): Promise<{ requestId: string }> {
  const requestId = crypto.randomUUID();
  const allowFinalSubmit = options.allowFinalSubmit === true;
  const sanitizedKit = sanitizeDirectoryLaunchKitForExtension(launchKit);
  await sendCommand(
    'DIRECTORY_SUBMIT',
    {
      requestId,
      payload: {
        requestId,
        directoryId,
        launchKit: sanitizedKit,
        options: {
          mode: allowFinalSubmit ? 'live' : 'dry_run',
          allowFinalSubmit,
        },
      },
    },
    5000
  );
  return { requestId };
}

export async function collectSiteAssetsWithExtension(
  productUrl: string
): Promise<{ assets: CollectedSiteAsset[] }> {
  return sendCommand<{ assets: CollectedSiteAsset[] }>(
    'COLLECT_SITE_ASSETS',
    { payload: { productUrl } },
    60000
  );
}

export async function resumeExtensionTask(requestId: string): Promise<void> {
  await sendCommand('RESUME_TASK', { requestId });
}

export async function focusExtensionTask(requestId: string): Promise<void> {
  await sendCommand('FOCUS_TASK', { requestId });
}

export async function getExtensionTaskStates(): Promise<ExtensionTaskState[]> {
  const response = await sendCommand<{ tasks?: ExtensionTaskState[] }>(
    'GET_TASK_STATE'
  );
  return response.tasks ?? [];
}

export function listenToExtensionTask(
  requestId: string,
  onEvent: (event: ExtensionTaskEvent) => void
): () => void {
  function listener(event: MessageEvent) {
    if (event.source !== window || event.origin !== window.location.origin) return;
    const message = event.data;
    if (
      message?.source === 'NOWBUILD_EXTENSION' &&
      message?.type === EVENT_TYPE &&
      message?.requestId === requestId &&
      message?.status
    ) {
      onEvent(message as ExtensionTaskEvent);
    }
  }
  window.addEventListener('message', listener);
  return () => window.removeEventListener('message', listener);
}

export function publishWithExtension(
  channel: SupportedPublishChannel,
  content: PublisherContent,
  onEvent: (event: PublisherEvent) => void,
  options: { community?: string } = {}
): { requestId: string; completion: Promise<PublisherEvent>; cancel: () => Promise<void> } {
  const requestId = crypto.randomUUID();
  let settled = false;

  const completion = new Promise<PublisherEvent>((resolve, reject) => {
    function onMessage(event: MessageEvent) {
      if (event.source !== window || event.origin !== window.location.origin) return;
      const message = event.data;
      if (
        message?.source !== 'NOWBUILD_EXTENSION' ||
        message?.type !== EVENT_TYPE ||
        message?.requestId !== requestId ||
        !message.status
      ) {
        return;
      }
      const publisherEvent = message as PublisherEvent;
      onEvent(publisherEvent);
      if (publisherEvent.status === 'published') {
        settled = true;
        window.removeEventListener('message', onMessage);
        resolve(publisherEvent);
      } else if (
        publisherEvent.status === 'failed' ||
        publisherEvent.status === 'blocked'
      ) {
        settled = true;
        window.removeEventListener('message', onMessage);
        reject(
          new Error(
            publisherEvent.error || publisherEvent.message || '发布没有完成'
          )
        );
      }
    }

    window.addEventListener('message', onMessage);
    void sendCommand(
      'PUBLISH',
      {
        requestId,
        payload: { requestId, channel, content, options },
      },
      5000
    ).catch((error) => {
      if (settled) return;
      settled = true;
      window.removeEventListener('message', onMessage);
      reject(error);
    });
  });

  return {
    requestId,
    completion,
    cancel: async () => {
      if (settled) return;
      await sendCommand('CANCEL', { requestId });
    },
  };
}

export function collectMetricsWithExtension(
  channel: SupportedPublishChannel,
  postUrl: string,
  onEvent: (event: MetricsCollectionEvent) => void
): { requestId: string; completion: Promise<MetricsCollectionEvent> } {
  const requestId = crypto.randomUUID();
  let settled = false;

  const completion = new Promise<MetricsCollectionEvent>((resolve, reject) => {
    function onMessage(event: MessageEvent) {
      if (event.source !== window || event.origin !== window.location.origin) return;
      const message = event.data;
      if (
        message?.source !== 'NOWBUILD_EXTENSION' ||
        message?.type !== EVENT_TYPE ||
        message?.requestId !== requestId ||
        !message.status
      ) {
        return;
      }
      const collectionEvent = message as MetricsCollectionEvent;
      onEvent(collectionEvent);
      if (collectionEvent.status === 'collected') {
        settled = true;
        window.removeEventListener('message', onMessage);
        resolve(collectionEvent);
      } else if (collectionEvent.status === 'failed') {
        settled = true;
        window.removeEventListener('message', onMessage);
        reject(new Error(collectionEvent.error || '数据采集失败'));
      }
    }

    window.addEventListener('message', onMessage);
    void sendCommand(
      'COLLECT_METRICS',
      {
        requestId,
        payload: { requestId, channel, postUrl },
      },
      5000
    ).catch((error) => {
      if (settled) return;
      settled = true;
      window.removeEventListener('message', onMessage);
      reject(error);
    });
  });

  return { requestId, completion };
}

const PUBLISHER_EXTENSION_GUIDE_KEY = 'nowbuild:publisher-extension-guide-seen';

/** Whether the first-time publish → install-plugin redirect has already run. */
export function hasSeenPublisherExtensionGuide(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return localStorage.getItem(PUBLISHER_EXTENSION_GUIDE_KEY) === '1';
  } catch {
    return true;
  }
}

export function markPublisherExtensionGuideSeen(): void {
  try {
    localStorage.setItem(PUBLISHER_EXTENSION_GUIDE_KEY, '1');
  } catch {
    // Private mode / quota — treat as best-effort.
  }
}
