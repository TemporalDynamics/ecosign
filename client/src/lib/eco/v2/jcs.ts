// RFC 8785 (JCS) canonical JSON serialization.

const isJsonPrimitive = (value: unknown): value is string | number | boolean | null =>
  value === null || ['string', 'number', 'boolean'].includes(typeof value);

const numberToString = (value: number): string => {
  if (!Number.isFinite(value)) {
    throw new TypeError('JCS does not support non-finite numbers');
  }
  if (Object.is(value, -0)) {
    return '0';
  }
  return value.toString();
};

const serialize = (value: unknown): string => {
  if (value && typeof value === 'object' && typeof (value as { toJSON?: () => unknown }).toJSON === 'function') {
    return serialize((value as { toJSON: () => unknown }).toJSON());
  }

  if (isJsonPrimitive(value)) {
    if (typeof value === 'number') {
      return numberToString(value);
    }
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    const items = value.map((item) => {
      if (typeof item === 'undefined' || typeof item === 'function' || typeof item === 'symbol') {
        return 'null';
      }
      return serialize(item);
    });
    return `[${items.join(',')}]`;
  }

  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    const parts: string[] = [];
    for (const key of keys) {
      const entry = obj[key];
      if (typeof entry === 'undefined' || typeof entry === 'function' || typeof entry === 'symbol') {
        continue;
      }
      parts.push(`${JSON.stringify(key)}:${serialize(entry)}`);
    }
    return `{${parts.join(',')}}`;
  }

  throw new TypeError('JCS does not support this value type');
};

export const jcsCanonicalize = (value: unknown): string => serialize(value);
