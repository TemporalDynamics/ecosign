import { z } from 'https://esm.sh/zod@3.23.8';

export type ValidationResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; details?: string[] };

export async function parseJsonBody<T>(
  req: Request,
  schema: z.ZodSchema<T>
): Promise<ValidationResult<T>> {
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return { ok: false, error: 'Invalid JSON body' };
  }

  const result = schema.safeParse(payload);
  if (!result.success) {
    const details = result.error.issues.map((issue) => {
      const path = issue.path.length ? issue.path.join('.') : 'body';
      return `${path}: ${issue.message}`;
    });
    return { ok: false, error: 'Invalid request payload', details };
  }

  return { ok: true, data: result.data };
}
