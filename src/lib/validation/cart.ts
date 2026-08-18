import { z } from 'zod';

/** PRD 10 - quantity is an integer, clamped against live stock server-side. */
export const addToCartSchema = z.object({
  variantId: z.uuid({ message: 'Something went wrong. Please try again.' }),
  quantity: z.coerce.number().int().min(1).max(99),
});

export const updateLineSchema = z.object({
  lineId: z.uuid({ message: 'Something went wrong. Please try again.' }),
  quantity: z.coerce.number().int().min(0).max(99),
});

export const removeLineSchema = z.object({
  lineId: z.uuid({ message: 'Something went wrong. Please try again.' }),
});
