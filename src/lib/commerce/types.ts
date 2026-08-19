/**
 * The commerce boundary — PRD §15.1.
 *
 * Nothing outside src/lib/commerce/ imports Drizzle. Everything above this line
 * talks in these shapes, which is what turns a Shopify migration into writing
 * one adapter instead of rewriting the UI.
 */
import type { Address } from '@/lib/db/schema';
import type { ShippingMethodKey } from '@/lib/shipping';

export type { Address };

export type SortKey = 'featured' | 'price-asc' | 'price-desc' | 'newest';

export const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'featured', label: 'Featured' },
  { key: 'price-asc', label: 'Price: low to high' },
  { key: 'price-desc', label: 'Price: high to low' },
  { key: 'newest', label: 'Newest' },
];

export function isSortKey(value: string | undefined): value is SortKey {
  return !!value && SORT_OPTIONS.some((o) => o.key === value);
}

export type Variant = {
  id: string;
  sku: string;
  title: string;
  optionValues: Record<string, string>;
  priceCents: number;
  compareAtCents: number | null;
  stock: number;
  position: number;
};

export type Product = {
  id: string;
  slug: string;
  title: string;
  description: string;
  collection: string;
  images: string[];
  optionTypes: string[];
  published: boolean;
  featured: boolean;
  createdAt: Date;
  variants: Variant[];
  /** Lowest variant price — what the card and listing sort on. */
  minPriceCents: number;
  maxPriceCents: number;
  /** Lowest-priced variant's compare-at, if any, for the sale pill. */
  compareAtCents: number | null;
  totalStock: number;
};

export type Collection = {
  slug: string;
  title: string;
  description: string;
  image: string;
  productCount: number;
};

export type CartLine = {
  id: string;
  variantId: string;
  quantity: number;
  productSlug: string;
  productTitle: string;
  variantTitle: string;
  sku: string;
  imageUrl: string;
  unitPriceCents: number;
  lineTotalCents: number;
  availableStock: number;
};

export type Cart = {
  id: string;
  token: string;
  lines: CartLine[];
  subtotalCents: number;
  itemCount: number;
};

export const ORDER_STATUSES = ['pending', 'paid', 'fulfilled', 'cancelled'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export function isOrderStatus(value: string): value is OrderStatus {
  return (ORDER_STATUSES as readonly string[]).includes(value);
}

export type OrderItem = {
  id: string;
  variantId: string;
  productTitle: string;
  variantTitle: string;
  sku: string;
  imageUrl: string;
  unitPriceCents: number;
  quantity: number;
  lineTotalCents: number;
};

export type Order = {
  id: string;
  orderNumber: string;
  email: string;
  status: OrderStatus;
  shippingAddress: Address;
  shippingMethod: ShippingMethodKey;
  shippingCents: number;
  subtotalCents: number;
  totalCents: number;
  currency: string;
  paymentIntentId: string | null;
  stockConflict: boolean;
  createdAt: Date;
  items: OrderItem[];
};

export type CreateOrderInput = {
  cartToken: string;
  email: string;
  address: Address;
  shippingMethod: ShippingMethodKey;
  paymentIntentId: string;
};

export type LowStockRow = {
  sku: string;
  productTitle: string;
  variantTitle: string;
  stock: number;
};

export type DashboardStats = {
  ordersToday: number;
  revenueTodayCents: number;
  awaitingFulfilment: number;
};

export interface CommerceProvider {
  getCollections(): Promise<Collection[]>;
  getCollection(slug: string): Promise<Collection | null>;
  getProducts(opts?: {
    collection?: string;
    sort?: SortKey;
    limit?: number;
    featured?: boolean;
    includeUnpublished?: boolean;
  }): Promise<Product[]>;
  getProduct(slug: string, opts?: { includeUnpublished?: boolean }): Promise<Product | null>;

  getCart(token: string): Promise<Cart | null>;
  createCart(): Promise<Cart>;
  addLine(token: string, variantId: string, qty: number): Promise<{ cart: Cart; notice?: string }>;
  updateLine(token: string, lineId: string, qty: number): Promise<{ cart: Cart; notice?: string }>;
  removeLine(token: string, lineId: string): Promise<Cart>;

  createOrder(input: CreateOrderInput): Promise<Order>;
  getOrder(id: string): Promise<Order | null>;
  getOrderByPaymentIntent(pi: string): Promise<Order | null>;
  listOrders(opts?: { status?: OrderStatus; limit?: number; withItems?: boolean }): Promise<Order[]>;
  updateOrderStatus(id: string, status: OrderStatus): Promise<Order>;

  // Admin surfaces
  getDashboardStats(): Promise<DashboardStats>;
  getLowStock(threshold?: number): Promise<LowStockRow[]>;
  updateVariant(variantId: string, patch: { priceCents?: number; stock?: number }): Promise<void>;
  setProductPublished(productId: string, published: boolean): Promise<void>;
}

/** Thrown by the provider when a cart line can no longer be honoured (§13.2 step 3). */
export class StockError extends Error {
  constructor(
    message: string,
    public readonly details: Array<{ variantId: string; message: string }>,
  ) {
    super(message);
    this.name = 'StockError';
  }
}
