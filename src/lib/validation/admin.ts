import { z } from 'zod';
import { ORDER_STATUSES } from '@/lib/commerce/types';

export const updateOrderStatusSchema = z.object({
  orderId: z.uuid(),
  status: z.enum(ORDER_STATUSES),
});

export const updateVariantSchema = z
  .object({
    variantId: z.uuid(),
    // Price arrives from the admin table in whole rupees; stored as paisa.
    priceCents: z.coerce.number().int().min(0).max(100_000_000).optional(),
    stock: z.coerce.number().int().min(0).max(100_000).optional(),
  })
  .refine((v) => v.priceCents !== undefined || v.stock !== undefined, {
    message: 'Nothing to update.',
  });

export const setPublishedSchema = z.object({
  productId: z.uuid(),
  published: z.boolean(),
});

export const loginSchema = z.object({
  password: z.string().min(1, 'Incorrect password.'),
});
