import type { Metadata } from 'next';
import { BRAND } from '@/lib/brand';

export const metadata: Metadata = {
  title: 'About',
  description: `${BRAND.name} makes cotton, linen and wool clothing in small runs in Pakistan.`,
  alternates: { canonical: '/about' },
};

export default function AboutPage() {
  return (
    <>
      <h1>About {BRAND.name}</h1>

      <p>
        We started in 2019 with one machinist, a rented room off Zamzama Boulevard, and a stubborn
        conviction that a kurta should survive more than one summer. Everything we sell is cut and
        sewn within a two-hour drive of that room.
      </p>

      <p>
        We work in small runs — usually forty to sixty pieces per colourway. That is inefficient,
        and it is deliberate. It means we can use the lawn and khaddar we actually want rather than
        whatever a mill will sell us by the container, and it means a piece that does not work gets
        retired instead of discounted forever.
      </p>

      <p>
        Our wool comes from the northern valleys, our cotton from Punjab, and our buttons from a
        family in Lahore who have been turning shell since before we existed. We pay for the good
        version of every component, which is why nothing here is the cheapest option available.
      </p>

      <p>
        If something does not fit or does not last, tell us. We would rather fix it than have it sit
        unworn in a cupboard.
      </p>

      <p className="text-sm">
        <strong>Note:</strong> {BRAND.name} is a fictional brand built for a portfolio
        demonstration. No real orders are fulfilled and no real payments are taken.
      </p>
    </>
  );
}
