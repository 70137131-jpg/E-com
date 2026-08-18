import { z } from 'zod';
import { SHIPPING_METHOD_KEYS, SUPPORTED_COUNTRIES } from '@/lib/shipping';

/**
 * PRD 10. Every string here is the exact error copy from PRD 8.3 - these
 * messages are rendered verbatim, so do not paraphrase them.
 *
 * Client-side validation is a convenience layer; this schema is the authority
 * and runs server-side on every submission.
 */
const REQUIRED = 'This field is required.';

const countryCodes = SUPPORTED_COUNTRIES.map((c) => c.code) as [string, ...string[]];

export const addressSchema = z.object({
  name: z.string().trim().min(2, REQUIRED).max(100, REQUIRED),
  phone: z
    .string()
    .trim()
    .min(7, 'Enter a valid phone number.')
    .max(20, 'Enter a valid phone number.')
    .regex(/^[0-9+\-() ]+$/, 'Enter a valid phone number.'),
  line1: z.string().trim().min(3, REQUIRED).max(200, REQUIRED),
  line2: z.string().trim().max(200).optional().or(z.literal('')),
  city: z.string().trim().min(2, REQUIRED).max(100, REQUIRED),
  postalCode: z.string().trim().max(20).optional().or(z.literal('')),
  country: z.enum(countryCodes, { message: REQUIRED }),
});

export const checkoutSchema = z.object({
  email: z.email({ message: 'Enter a valid email address.' }).max(254),
  address: addressSchema,
  shippingMethod: z.enum(SHIPPING_METHOD_KEYS as [string, ...string[]], {
    message: 'Select a shipping method.',
  }),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;

/** Flatten a ZodError into the { field, message } list the checkout UI renders. */
export function fieldErrors(error: z.ZodError): Array<{ field: string; message: string }> {
  return error.issues.map((issue) => ({
    field: issue.path.join('.'),
    message: issue.message,
  }));
}
