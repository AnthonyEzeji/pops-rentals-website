"use client";

import { useActionState } from "react";
import { login, type LoginState } from "./actions";
import { SubmitButton } from "@/components/submit-button";
import { Alert, Field } from "@/components/ui";

const EMPTY: LoginState = {};

export function LoginForm({ next }: { next: string }) {
  const [state, action] = useActionState(login, EMPTY);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      {state.error ? <Alert tone="error">{state.error}</Alert> : null}

      <Field label="Email" name="email">
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          autoFocus
          className="input"
        />
      </Field>

      <Field label="Password" name="password">
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="input"
        />
      </Field>

      <SubmitButton className="btn-primary w-full" pendingLabel="Signing in…">
        Sign in
      </SubmitButton>
    </form>
  );
}
