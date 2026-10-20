import type { z } from "zod";

/**
 * `/api/v1` conventions (contracts/api-v1.md): JSON bodies, camelCase fields, money in minor units,
 * and errors shaped as `{ error: { code, message, details? } }`.
 */

export function apiError(status: number, code: string, message: string, details?: unknown) {
  return Response.json({ error: { code, message, ...(details ? { details } : {}) } }, { status });
}

/** Validates outgoing payloads against the contract schema, so drift fails loudly in tests. */
export function apiJson<T>(schema: z.ZodType<T>, data: T, init?: ResponseInit) {
  return Response.json(schema.parse(data), init);
}

export function searchParamsObject(url: string): Record<string, string> {
  return Object.fromEntries(new URL(url).searchParams);
}
