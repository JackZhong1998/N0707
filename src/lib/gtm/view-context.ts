/** Lightweight reference to the object currently visible in the workspace. */
export interface ViewContext {
  view: string;
  path?: string;
  entityType?: string;
  entityId?: string;
  title?: string;
  channelId?: string;
  section?: string;
  selectedText?: string;
  revision?: string | number;
}

function optionalString(
  value: unknown,
  maxLength: number
): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : undefined;
}

/** Bounds browser-provided context before it reaches an Agent prompt. */
export function normalizeViewContext(value: unknown): ViewContext | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const raw = value as Record<string, unknown>;
  const view = optionalString(raw.view, 80);
  if (!view) return undefined;
  const revision =
    typeof raw.revision === 'number' && Number.isFinite(raw.revision)
      ? raw.revision
      : optionalString(raw.revision, 80);

  return {
    view,
    path: optionalString(raw.path, 300),
    entityType: optionalString(raw.entityType, 80),
    entityId: optionalString(raw.entityId, 160),
    title: optionalString(raw.title, 300),
    channelId: optionalString(raw.channelId, 80),
    section: optionalString(raw.section, 160),
    selectedText: optionalString(raw.selectedText, 2_000),
    revision,
  };
}
