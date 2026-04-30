export interface PageInfo {
  limit: number;
  hasNextPage: boolean;
  nextCursor: string | null;
}

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;

const asNumber = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const asText = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim() : null);

export const normalizePageInfo = (value: unknown): PageInfo | null => {
  const record = asRecord(value);
  if (!record) return null;

  return {
    limit: Math.max(1, Math.floor(asNumber(record.limit) ?? 25)),
    hasNextPage: Boolean(record.hasNextPage),
    nextCursor: asText(record.nextCursor),
  };
};
