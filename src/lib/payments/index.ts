import 'server-only';
import { mockProvider } from './mock';
import { stripeProvider } from './stripe';
import { stripeConfigured, type PaymentProvider } from './provider';

export const payments: PaymentProvider = stripeConfigured() ? stripeProvider : mockProvider;

export const paymentMode = payments.mode;

export * from './provider';
