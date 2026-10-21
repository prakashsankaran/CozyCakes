"use client";

import { useState, useTransition } from "react";
import { requestSignInCode, verifySignInCode } from "@/app/(store)/me/actions";

const field =
  "mt-2 w-full rounded-[var(--radius-md)] bg-white px-4 py-3 text-lg ring-1 ring-cocoa-900/20 focus:outline-none focus:ring-2 focus:ring-blush-700";
const button =
  "mt-4 w-full rounded-[var(--radius-pill)] bg-cocoa-900 px-6 py-3 font-bold text-cream-50 transition-transform hover:-translate-y-0.5 active:scale-95 disabled:opacity-60";

/** Email → 6-digit code. The first sign-in creates the account; no passwords (US6, FR-027). */
export function CodeSignIn({ next }: { next?: string }) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (!sent) {
    return (
      <form
        aria-label="Sign in"
        className="mt-6"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const result = await requestSignInCode(email);
            if (result.ok) {
              setSent(true);
              setError(null);
            } else setError(result.error);
          });
        }}
      >
        <label htmlFor="me-email" className="font-bold">
          Your email
        </label>
        <input
          id="me-email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={field}
        />
        {error && (
          <p role="alert" className="mt-3 font-bold text-blush-700">
            {error}
          </p>
        )}
        <button type="submit" disabled={pending} className={button}>
          {pending ? "Sending…" : "Email me a code"}
        </button>
      </form>
    );
  }

  return (
    <CodeForm
      intro={
        <>
          We sent a code to <strong>{email}</strong>. It works for 10 minutes.
        </>
      }
      code={code}
      setCode={setCode}
      error={error}
      pending={pending}
      onSubmit={() =>
        start(async () => {
          const result = await verifySignInCode(email, code, next);
          if (result && !result.ok) setError(result.error);
        })
      }
      onBack={() => {
        setSent(false);
        setCode("");
        setError(null);
      }}
      backLabel="Use a different email"
    />
  );
}

/** The 6-digit code step, shared with "Save my details" on the order page. */
export function CodeForm({
  intro,
  code,
  setCode,
  error,
  pending,
  onSubmit,
  onBack,
  backLabel,
}: {
  intro: React.ReactNode;
  code: string;
  setCode: (code: string) => void;
  error: string | null;
  pending: boolean;
  onSubmit: () => void;
  onBack?: () => void;
  backLabel?: string;
}) {
  return (
    <form
      aria-label="Enter your code"
      className="mt-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <p className="rounded-[var(--radius-md)] bg-pistachio-200 p-3 text-sm">{intro}</p>
      <label htmlFor="me-code" className="mt-4 block font-bold">
        6-digit code
      </label>
      <input
        id="me-code"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]{6}"
        maxLength={6}
        required
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
        className={`${field} tracking-[0.5em]`}
      />
      {error && (
        <p role="alert" className="mt-3 font-bold text-blush-700">
          {error}
        </p>
      )}
      <button type="submit" disabled={pending} className={button}>
        {pending ? "Checking…" : "Sign in"}
      </button>
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="mt-3 w-full text-sm font-bold text-cocoa-700 underline"
        >
          {backLabel}
        </button>
      )}
    </form>
  );
}
