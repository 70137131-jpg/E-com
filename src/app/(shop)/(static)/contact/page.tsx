import type { Metadata } from 'next';
import { BRAND } from '@/lib/brand';

export const metadata: Metadata = {
  title: 'Contact',
  description: `Get in touch with ${BRAND.name}.`,
  alternates: { canonical: '/contact' },
};

/**
 * PRD 6.7: no contact form. A form that does not send anywhere is worse than no
 * form, so this page lists the ways to reach a human and nothing else.
 */
export default function ContactPage() {
  return (
    <>
      <h1>Contact</h1>

      <p>
        Questions about sizing, an order, or a return — email is fastest and reaches the same two
        people who pack the boxes.
      </p>

      <h2>Email</h2>
      <p>
        <a href={`mailto:${BRAND.email}`}>{BRAND.email}</a>
        <br />
        We reply within one working day, usually sooner.
      </p>

      <h2>Phone</h2>
      <p>
        <a href={`tel:${BRAND.phone.replace(/\s/g, '')}`}>{BRAND.phone}</a>
        <br />
        Monday to Saturday, 11am – 7pm PKT.
      </p>

      <h2>Studio</h2>
      <p>
        {BRAND.addressLine}
        <br />
        Visits by appointment, and for store pickup collections.
      </p>

      <p className="text-sm">
        <strong>Note:</strong> {BRAND.name} is a fictional brand built for a portfolio
        demonstration. These contact details are not real.
      </p>
    </>
  );
}
