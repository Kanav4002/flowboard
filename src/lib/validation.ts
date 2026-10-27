import { z } from "zod";
import { PRIORITIES, STATUSES } from "./types";

export const MAX_TAGS = 8;
export const MAX_TAG_LENGTH = 24;

/** Trims, de-duplicates (case-insensitive) and caps a list of tags. */
export function normalizeTags(tags: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const raw of tags) {
    const tag = raw.trim().replace(/\s+/g, " ").slice(0, MAX_TAG_LENGTH);
    if (!tag) continue;
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(tag);
    if (result.length === MAX_TAGS) break;
  }

  return result;
}

const isoDay = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use the YYYY-MM-DD format")
  .refine((value) => {
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
  }, "That date does not exist");

export const taskCreateSchema = z.object({
  title: z
    .string({ required_error: "Title is required" })
    .trim()
    .min(1, "Title is required")
    .max(120, "Keep the title under 120 characters"),
  description: z
    .string()
    .trim()
    .max(2000, "Keep the description under 2000 characters")
    .optional(),
  status: z.enum(STATUSES).optional(),
  priority: z.enum(PRIORITIES).optional(),
  tags: z
    .array(z.string().trim().min(1).max(MAX_TAG_LENGTH))
    .max(MAX_TAGS, `Use at most ${MAX_TAGS} tags`)
    .optional(),
  dueDate: isoDay.nullable().optional(),
});

export const taskUpdateSchema = taskCreateSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Provide at least one field to update",
  });

export const reorderSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().min(1).max(64),
        status: z.enum(STATUSES),
        position: z.number().int().min(0).max(10_000),
      }),
    )
    .min(1, "Nothing to reorder")
    .max(1000, "Too many items in one reorder"),
});

export type TaskCreatePayload = z.infer<typeof taskCreateSchema>;
export type TaskUpdatePayload = z.infer<typeof taskUpdateSchema>;

export function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Invalid request";
}
