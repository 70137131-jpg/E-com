'use client';

import * as React from 'react';
import { useFormStatus } from 'react-dom';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BRAND } from '@/lib/brand';
import { login, type LoginState } from '@/server/actions/auth';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" full loading={pending}>
      {pending ? 'Signing in…' : 'Sign in'}
    </Button>
  );
}

/** PRD 6.9 — centred card, single password field. */
export function LoginForm() {
  const [state, formAction] = React.useActionState<LoginState, FormData>(login, {});

  return (
    <form
      action={formAction}
      className="w-full max-w-sm rounded-[var(--radius)] border border-border p-6"
    >
      <h1 className="text-h2">{BRAND.name} admin</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Sign in to manage orders and the catalogue.
      </p>

      {state.error ? (
        <Alert variant="destructive" className="mt-5">
          {state.error}
        </Alert>
      ) : null}

      <div className="mt-5 space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          autoFocus
          required
          aria-invalid={state.error ? true : undefined}
        />
      </div>

      <div className="mt-6">
        <SubmitButton />
      </div>
    </form>
  );
}
