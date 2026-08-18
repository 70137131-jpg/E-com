import type { CommerceProvider } from '../types';
import * as catalog from './catalog';
import * as cart from './cart';
import * as orders from './orders';

/**
 * The local (Postgres) implementation of the commerce boundary. A Shopify
 * adapter would satisfy the same interface and nothing above lib/commerce/
 * would change (PRD 15.1).
 */
export const localProvider: CommerceProvider = {
  getCollections: catalog.getCollections,
  getCollection: catalog.getCollection,
  getProducts: catalog.getProducts,
  getProduct: catalog.getProduct,

  getCart: cart.getCart,
  createCart: () => cart.createCart(),
  addLine: cart.addLine,
  updateLine: cart.updateLine,
  removeLine: cart.removeLine,

  createOrder: orders.createOrder,
  getOrder: orders.getOrder,
  getOrderByPaymentIntent: orders.getOrderByPaymentIntent,
  listOrders: orders.listOrders,
  updateOrderStatus: orders.updateOrderStatus,

  getDashboardStats: orders.getDashboardStats,
  getLowStock: orders.getLowStock,
  updateVariant: orders.updateVariant,
  setProductPublished: orders.setProductPublished,
};

export { newCartToken, deleteCartByToken } from './cart';
export { priceCart } from './orders';
