'use client';

export type SupportedPublishChannel = 'twitter_x' | 'xiaohongshu';

export type PublisherStatus =
  | 'opening'
  | 'filling'
  | 'needs_user_action'
  | 'awaiting_user'
  | 'publishing'
  | 'published'
  | 'failed';

export interface PublisherContent {
  title: string;
  body: string;
  hashtags?: string[];
  media?: Array<{ url: string; type?: 'image' | 'video' }>;
}

export interface PublisherEvent {
  requestId: string;
  status: PublisherStatus;
  message?: string;
  postUrl?: string;
  error?: string;
}

export interface PublisherAvailability {
  installed: boolean;
  version?: string;
  supportedChannels: string[];
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
    }>('PING');
    return {
      installed: response.installed === true,
      version: response.version,
      supportedChannels: response.supportedChannels ?? [],
    };
  } catch {
    return { installed: false, supportedChannels: [] };
  }
}

export function publishWithExtension(
  channel: SupportedPublishChannel,
  content: PublisherContent,
  onEvent: (event: PublisherEvent) => void
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
      } else if (publisherEvent.status === 'failed') {
        settled = true;
        window.removeEventListener('message', onMessage);
        reject(new Error(publisherEvent.error || '发布没有完成'));
      }
    }

    window.addEventListener('message', onMessage);
    void sendCommand(
      'PUBLISH',
      {
        requestId,
        payload: { requestId, channel, content },
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
