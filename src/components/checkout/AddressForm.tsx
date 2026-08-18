'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { SUPPORTED_COUNTRIES } from '@/lib/shipping';

export type AddressFields = {
  email: string;
  name: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  postalCode: string;
  country: string;
};

function Field({
  id,
  label,
  error,
  optional,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label htmlFor={id} className="mb-1.5">
        {label}
        {optional ? <span className="ml-1 font-normal text-muted-foreground">(optional)</span> : null}
      </Label>
      {children}
      {/* Specific inline errors, never a generic banner (PRD 4.1 US-05). */}
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-1 text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function AddressForm({
  values,
  errors,
  disabled,
  onChange,
}: {
  values: AddressFields;
  errors: Record<string, string>;
  disabled?: boolean;
  onChange: (field: keyof AddressFields, value: string) => void;
}) {
  const props = (field: keyof AddressFields, id: string) => ({
    id,
    value: values[field],
    disabled,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      onChange(field, e.target.value),
    'aria-invalid': Boolean(errors[id]),
    'aria-describedby': errors[id] ? `${id}-error` : undefined,
  });

  return (
    <div className="space-y-8">
      <section aria-labelledby="contact-heading">
        <h2 id="contact-heading" className="text-h3">
          Contact
        </h2>
        <div className="mt-4">
          <Field id="email" label="Email" error={errors.email}>
            <Input type="email" autoComplete="email" inputMode="email" {...props('email', 'email')} />
          </Field>
        </div>
      </section>

      <section aria-labelledby="address-heading">
        <h2 id="address-heading" className="text-h3">
          Shipping address
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field id="address.name" label="Full name" error={errors['address.name']}>
              <Input autoComplete="name" {...props('name', 'address.name')} />
            </Field>
          </div>

          <div className="sm:col-span-2">
            <Field id="address.phone" label="Phone" error={errors['address.phone']}>
              <Input type="tel" autoComplete="tel" inputMode="tel" {...props('phone', 'address.phone')} />
            </Field>
          </div>

          <div className="sm:col-span-2">
            <Field id="address.line1" label="Address line 1" error={errors['address.line1']}>
              <Input autoComplete="address-line1" {...props('line1', 'address.line1')} />
            </Field>
          </div>

          <div className="sm:col-span-2">
            <Field id="address.line2" label="Address line 2" optional error={errors['address.line2']}>
              <Input autoComplete="address-line2" {...props('line2', 'address.line2')} />
            </Field>
          </div>

          <Field id="address.city" label="City" error={errors['address.city']}>
            <Input autoComplete="address-level2" {...props('city', 'address.city')} />
          </Field>

          <Field id="address.postalCode" label="Postal code" optional error={errors['address.postalCode']}>
            <Input autoComplete="postal-code" {...props('postalCode', 'address.postalCode')} />
          </Field>

          <div className="sm:col-span-2">
            <Field id="address.country" label="Country" error={errors['address.country']}>
              <Select className="w-full" autoComplete="country" {...props('country', 'address.country')}>
                {SUPPORTED_COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </div>
      </section>
    </div>
  );
}
