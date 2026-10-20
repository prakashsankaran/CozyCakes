"use client";

import { useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { requestCode, verifyCode } from "@/app/(admin)/admin/actions";

/** Email → 6-digit code sign-in for the owner and staff (tasks T047). */
export function SignInForm() {
  const denied = useSearchParams().get("denied") === "1";
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(
    denied ? "That account can't open the kitchen. Sign in with the owner's email." : null,
  );
  const [pending, start] = useTransition();

  const field =
    "mt-2 w-full rounded-[var(--radius-md)] bg-white px-4 py-3 text-lg ring-1 ring-cocoa-900/20 focus:outline-none focus:ring-2 focus:ring-blush-700";
  const button =
    "mt-4 w-full rounded-[var(--radius-pill)] bg-cocoa-900 px-6 py-3 font-bold text-cream-50 transition-transform hover:-translate-y-0.5 active:scale-95 disabled:opacity-60";

  if (!sent) {
    return (
      <form
        className="mt-6"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const result = await requestCode(email);
            if (result.ok) {
              setSent(true);
              setError(null);
            } else setError(result.errors[0]!);
          });
        }}
      >
        <label htmlFor="email" className="font-bold">
          Email
        </label>
        <input
          id="email"
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
    <form
      className="mt-6"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const result = await verifyCode(email, code);
          if (!result.ok) setError(result.errors[0]!);
        });
      }}
    >
      <p className="rounded-[var(--radius-md)] bg-pistachio-200 p-3 text-sm">
        If <strong>{email}</strong> has access, a code is on its way. It works for 10 minutes.
      </p>
      <label htmlFor="code" className="mt-4 block font-bold">
        6-digit code
      </label>
      <input
        id="code"
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
      <button
        type="button"
        onClick={() => {
          setSent(false);
          setCode("");
          setError(null);
        }}
        className="mt-3 w-full text-sm font-bold text-cocoa-700 underline"
      >
        Use a different email
      </button>
    </form>
  );
}
