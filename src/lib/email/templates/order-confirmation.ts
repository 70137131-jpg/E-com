import { BRAND } from '@/lib/brand';
import { formatMoney } from '@/lib/money';
import { SHIPPING_METHODS } from '@/lib/shipping';
import type { Order } from '@/lib/commerce/types';

/**
 * PRD 8.5 - plain HTML with inline styles. No email framework, no images beyond
 * a text logo, because every extra dependency here is a rendering risk in a
 * mail client we cannot test.
 */
// Read through lib/brand so the email cannot drift from the storefront: a
// handover that changes the brand there must not leave the old name and a dead
// support address going out on every order.
const BRAND_NAME = BRAND.name;
const CONTACT_EMAIL = BRAND.email;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const td = 'padding:8px 0;border-bottom:1px solid #e7e5e4;font-size:14px;color:#1c1917;';
const tdRight = `${td}text-align:right;`;

export function orderConfirmationSubject(order: Order): string {
  return `Order ${order.orderNumber} confirmed`;
}

export function orderConfirmationHtml(order: Order): string {
  const firstName = order.shippingAddress.name.split(' ')[0] || 'there';
  const placed = order.createdAt.toLocaleDateString('en-PK', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const method = SHIPPING_METHODS[order.shippingMethod];
  const addr = order.shippingAddress;

  const rows = order.items
    .map(
      (item) => `
        <tr>
          <td style="${td}">
            ${escapeHtml(item.productTitle)}<br />
            <span style="color:#57534e;font-size:13px;">${escapeHtml(item.variantTitle)}</span>
          </td>
          <td style="${tdRight}">${item.quantity}</td>
          <td style="${tdRight}">${formatMoney(item.lineTotalCents)}</td>
        </tr>`,
    )
    .join('');

  return `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:24px;background:#faf9f8;font-family:Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" style="max-width:560px;margin:0 auto;background:#ffffff;padding:32px;border:1px solid #e7e5e4;border-radius:8px;">
      <tr><td>
        <h1 style="margin:0 0 24px;font-size:20px;font-weight:500;letter-spacing:0.02em;color:#1c1917;">${escapeHtml(BRAND_NAME)}</h1>

        <p style="margin:0 0 8px;font-size:16px;color:#1c1917;">Thanks for your order, ${escapeHtml(firstName)}.</p>
        <p style="margin:0 0 24px;font-size:14px;color:#57534e;">Order ${escapeHtml(order.orderNumber)} — placed ${escapeHtml(placed)}</p>

        <table role="presentation" width="100%" style="border-collapse:collapse;">
          <thead>
            <tr>
              <th align="left" style="${td}font-weight:500;color:#57534e;">Item</th>
              <th align="right" style="${tdRight}font-weight:500;color:#57534e;">Qty</th>
              <th align="right" style="${tdRight}font-weight:500;color:#57534e;">Total</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>

        <table role="presentation" width="100%" style="border-collapse:collapse;margin-top:16px;">
          <tr>
            <td style="padding:4px 0;font-size:14px;color:#57534e;">Subtotal</td>
            <td align="right" style="padding:4px 0;font-size:14px;color:#1c1917;">${formatMoney(order.subtotalCents)}</td>
          </tr>
          <tr>
            <td style="padding:4px 0;font-size:14px;color:#57534e;">Shipping — ${escapeHtml(method.name)}</td>
            <td align="right" style="padding:4px 0;font-size:14px;color:#1c1917;">${order.shippingCents === 0 ? 'Free' : formatMoney(order.shippingCents)}</td>
          </tr>
          <tr>
            <td style="padding:12px 0 0;font-size:16px;font-weight:500;color:#1c1917;border-top:1px solid #e7e5e4;">Total</td>
            <td align="right" style="padding:12px 0 0;font-size:16px;font-weight:500;color:#1c1917;border-top:1px solid #e7e5e4;">${formatMoney(order.totalCents)}</td>
          </tr>
        </table>

        <h2 style="margin:32px 0 8px;font-size:14px;font-weight:500;color:#57534e;text-transform:uppercase;letter-spacing:0.06em;">Shipping to</h2>
        <p style="margin:0;font-size:14px;line-height:1.6;color:#1c1917;">
          ${escapeHtml(addr.name)}<br />
          ${escapeHtml(addr.line1)}<br />
          ${addr.line2 ? `${escapeHtml(addr.line2)}<br />` : ''}
          ${escapeHtml(addr.city)}${addr.postalCode ? ` ${escapeHtml(addr.postalCode)}` : ''}<br />
          ${escapeHtml(addr.country)}<br />
          ${escapeHtml(addr.phone)}
        </p>

        <p style="margin:32px 0 0;font-size:14px;color:#1c1917;">We will email you again when your order ships.</p>

        <p style="margin:24px 0 0;padding-top:16px;border-top:1px solid #e7e5e4;font-size:13px;color:#78716c;">
          Questions? Reply to this email or write to ${CONTACT_EMAIL}.
        </p>
      </td></tr>
    </table>
  </body>
</html>`;
}
