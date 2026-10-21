"use client";

import { useState, useTransition } from "react";
import { finishSavingDetails, startSavingDetails } from "@/app/(store)/me/actions";
import { CodeForm } from "./code-sign-in";

/**
 * "Save my details" on a guest's order page (US6 scenario 1): one code to the email they ordered
 * with makes an account holding this order, their name, phone and address.
 */
export function SaveDetails({ token }: { token: string }) {
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <section
      aria-labelledby="save-details"
      className="mt-8 rounded-[var(--radius-lg)] bg-blush-100 p-5"
    >
      <h2 id="save-details" className="font-display text-2xl font-semibold">
        Order faster next time
      </h2>
      <p className="mt-1">
        Save your details and this order to an account. No password: just a code by email.
      </p>
      {sentTo === null ? (
        <>
          {error && (
            <p role="alert" className="mt-3 font-bold text-blush-700">
              {error}
            </p>
          )}
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const result = await startSavingDetails(token);
                if (result.ok) {
                  setSentTo(result.data.sentTo);
                  setError(null);
                } else setError(result.error);
              })
            }
            className="mt-4 rounded-[var(--radius-pill)] bg-cocoa-900 px-6 py-3 font-bold text-cream-50 transition-transform hover:-translate-y-0.5 active:scale-95 disabled:opacity-60"
          >
            {pending ? "Sending…" : "Save my details"}
          </button>
        </>
      ) : (
        <CodeForm
          intro={
            <>
              We sent a code to <strong>{sentTo}</strong>, the email on this order.
            </>
          }
          code={code}
          setCode={setCode}
          error={error}
          pending={pending}
          onSubmit={() =>
            start(async () => {
              const result = await finishSavingDetails(token, code);
              if (result && !result.ok) setError(result.error);
            })
          }
        />
      )}
    </section>
  );
}
