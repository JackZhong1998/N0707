const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

const DEFAULT_FALLBACK_MODELS = [
  'deepseek/deepseek-chat',
  'google/gemini-2.5-flash-preview',
  'meta-llama/llama-3.3-70b-instruct',
  'qwen/qwen-2.5-72b-instruct',
] as const;

export interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenRouterOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
}

function getModelCandidates(preferred?: string): string[] {
  const primary =
    preferred ?? process.env.OPENROUTER_MODEL ?? 'deepseek/deepseek-chat';
  const fallbacks = (process.env.OPENROUTER_FALLBACK_MODELS ?? '')
    .split(',')
    .map((m) => m.trim())
    .filter(Boolean);
  const all = [primary, ...fallbacks, ...DEFAULT_FALLBACK_MODELS];
  return [...new Set(all)];
}

function isRetryableOpenRouterError(status: number, body: string): boolean {
  if (status === 404 || status === 429 || status === 502 || status === 503) {
    return true;
  }
  if (status === 403) {
    const lower = body.toLowerCase();
    return (
      lower.includes('terms of service') ||
      lower.includes('no endpoints found') ||
      lower.includes('moderation')
    );
  }
  return false;
}

function formatOpenRouterError(status: number, body: string): string {
  const lower = body.toLowerCase();
  if (status === 403 && lower.includes('terms of service')) {
    return (
      'OpenRouter 403：当前模型提供商未授权。请到 https://openrouter.ai/settings/privacy 开启对应 Provider，' +
      '或将 OPENROUTER_MODEL 改为 deepseek/deepseek-chat。' +
      ` 原始错误：${body}`
    );
  }
  return `OpenRouter API error: ${status} ${body}`;
}

export async function callOpenRouter(
  messages: OpenRouterMessage[],
  options: OpenRouterOptions = {}
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not configured');
  }

  const models = getModelCandidates(options.model);
  let lastError = 'No models available';

  for (const model of models) {
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
        'X-Title': process.env.NEXT_PUBLIC_APP_NAME ?? 'NowBuild',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 4096,
        ...(options.jsonMode ? { response_format: { type: 'json_object' } } : {}),
      }),
    });

    if (response.ok) {
      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        lastError = `OpenRouter (${model}) returned empty response`;
        continue;
      }
      return content;
    }

    const errorText = await response.text();
    lastError = formatOpenRouterError(response.status, errorText);

    if (!isRetryableOpenRouterError(response.status, errorText)) {
      throw new Error(lastError);
    }
  }

  throw new Error(lastError);
}

/** 提取文本中第一个完整 JSON 值的边界（{...} 或 [...]） */
function extractJsonBounds(text: string): string {
  const firstObj = text.indexOf('{');
  const firstArr = text.indexOf('[');
  let start = -1;
  if (firstObj === -1) start = firstArr;
  else if (firstArr === -1) start = firstObj;
  else start = Math.min(firstObj, firstArr);
  if (start === -1) return text;

  const open = text[start];
  const close = open === '{' ? '}' : ']';
  const end = text.lastIndexOf(close);
  if (end <= start) return text;
  return text.slice(start, end + 1);
}

/** 修复字符串值内未转义的控制字符（LLM 生成长文本 JSON 的常见问题） */
function repairControlChars(input: string): string {
  let out = '';
  let inString = false;
  let escaped = false;
  for (const ch of input) {
    if (inString) {
      if (escaped) {
        out += ch;
        escaped = false;
        continue;
      }
      if (ch === '\\') {
        out += ch;
        escaped = true;
        continue;
      }
      if (ch === '"') {
        inString = false;
        out += ch;
        continue;
      }
      if (ch === '\n') {
        out += '\\n';
        continue;
      }
      if (ch === '\r') {
        out += '\\r';
        continue;
      }
      if (ch === '\t') {
        out += '\\t';
        continue;
      }
      out += ch;
    } else {
      if (ch === '"') inString = true;
      out += ch;
    }
  }
  return out;
}

export function parseJsonFromLlm<T>(text: string): T {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const base = fenced ? fenced[1].trim() : trimmed;

  const candidates = [
    base,
    extractJsonBounds(base),
    repairControlChars(extractJsonBounds(base)),
    // 最后再尝试去除对象/数组结尾前的多余逗号
    repairControlChars(extractJsonBounds(base)).replace(/,\s*([}\]])/g, '$1'),
  ];

  let lastError: unknown;
  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate) as T;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Invalid JSON from LLM');
}

const JSON_RETRY_NUDGE =
  '你上一次的输出不是合法 JSON，解析失败了。请重新输出：只输出一个合法的 JSON（不要 markdown 代码块、不要任何解释文字），字符串内部的换行必须写成 \\n，引号必须转义，不要在结尾留多余逗号。';

/**
 * 调用 LLM 并解析 JSON；解析失败自动带纠错提示重试。
 * 所有需要结构化输出的 Agent 都应使用此函数。
 */
export async function callOpenRouterJson<T>(
  messages: OpenRouterMessage[],
  options: OpenRouterOptions = {},
  maxAttempts = 3
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const attemptMessages =
      attempt === 0
        ? messages
        : [...messages, { role: 'user' as const, content: JSON_RETRY_NUDGE }];
    const raw = await callOpenRouter(attemptMessages, { ...options, jsonMode: true });
    try {
      return parseJsonFromLlm<T>(raw);
    } catch (err) {
      lastError = err;
      console.warn(
        `LLM JSON parse failed (attempt ${attempt + 1}/${maxAttempts}):`,
        err instanceof Error ? err.message : err
      );
    }
  }
  throw new Error(
    `AI 返回的内容无法解析为 JSON（已重试 ${maxAttempts} 次）：${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`
  );
}
