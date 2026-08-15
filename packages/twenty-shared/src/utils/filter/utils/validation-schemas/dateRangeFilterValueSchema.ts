import { Temporal } from 'temporal-polyfill';
import { z } from 'zod';

const isoPlainDate = z.string().refine((value) => {
  try {
    Temporal.PlainDate.from(value);

    return true;
  } catch {
    return false;
  }
}, 'Expected an ISO date, e.g. "2026-01-31"');

export const dateRangeFilterValueSchemaObject = z
  .object({
    start: isoPlainDate,
    end: isoPlainDate,
  })
  .refine(
    ({ start, end }) =>
      Temporal.PlainDate.compare(
        Temporal.PlainDate.from(start),
        Temporal.PlainDate.from(end),
      ) <= 0,
    'Expected start to be on or before end',
  );

export type DateRangeFilterValue = z.infer<
  typeof dateRangeFilterValueSchemaObject
>;

export const dateRangeFilterValueSchema = z
  .string()
  .transform((value, ctx) => {
    try {
      return JSON.parse(value);
    } catch (error) {
      ctx.addIssue({
        code: 'custom',
        message: (error as Error).message,
      });

      return z.NEVER;
    }
  })
  .pipe(dateRangeFilterValueSchemaObject);
