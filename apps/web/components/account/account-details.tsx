"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { SavedAddress } from "@cozycakes/core";
import { deleteAddress, saveAddress, updateProfile } from "@/app/(store)/me/actions";

const field =
  "mt-1 w-full rounded-[var(--radius-md)] bg-white px-4 py-3 ring-1 ring-cocoa-900/20 focus:outline-none focus:ring-2 focus:ring-blush-700";
const primary =
  "rounded-[var(--radius-pill)] bg-cocoa-900 px-5 py-2.5 font-bold text-cream-50 transition-transform hover:-translate-y-0.5 active:scale-95 disabled:opacity-60";

const oneLine = (a: Omit<SavedAddress, "id" | "label">) =>
  [a.line1, a.line2, a.landmark, a.city, a.postalCode].filter(Boolean).join(", ");

/** Name, mobile and saved addresses: what checkout fills in for the customer (US6). */
export function AccountDetails({
  name,
  phone,
  addresses,
}: {
  name: string;
  phone: string;
  addresses: SavedAddress[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [profile, setProfile] = useState({ name, phone });
  const [profileNote, setProfileNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [adding, setAdding] = useState(false);
  const [address, setAddress] = useState({
    label: "",
    line1: "",
    line2: "",
    landmark: "",
    city: "",
    postalCode: "",
  });
  const [addressError, setAddressError] = useState<string | null>(null);
  const setLine = (key: keyof typeof address) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setAddress((a) => ({ ...a, [key]: e.target.value }));

  return (
    <>
      <section aria-labelledby="my-details">
        <h2 id="my-details" className="font-display text-2xl font-semibold">
          Your details
        </h2>
        <form
          aria-label="Your details"
          className="mt-3 grid gap-3 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const result = await updateProfile(profile);
              setProfileNote(
                result.ok ? { ok: true, text: "Saved" } : { ok: false, text: result.error },
              );
              if (result.ok) router.refresh();
            });
          }}
        >
          <div>
            <label htmlFor="me-name" className="font-bold">
              Name
            </label>
            <input
              id="me-name"
              autoComplete="name"
              value={profile.name}
              onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
              className={field}
            />
          </div>
          <div>
            <label htmlFor="me-phone" className="font-bold">
              Mobile number
            </label>
            <input
              id="me-phone"
              type="tel"
              autoComplete="tel"
              value={profile.phone}
              onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
              className={field}
            />
          </div>
          <div className="flex items-center gap-3 sm:col-span-2">
            <button type="submit" disabled={pending} className={primary}>
              Save details
            </button>
            {profileNote && (
              <p
                role={profileNote.ok ? "status" : "alert"}
                className={`font-bold ${profileNote.ok ? "text-pistachio-700" : "text-blush-700"}`}
              >
                {profileNote.text}
              </p>
            )}
          </div>
        </form>
      </section>

      <section aria-labelledby="my-addresses">
        <h2 id="my-addresses" className="font-display text-2xl font-semibold">
          Saved addresses
        </h2>
        {addresses.length === 0 && !adding && (
          <p className="mt-2 text-cocoa-700">
            None yet. Addresses you save show up as one-tap choices at checkout.
          </p>
        )}
        <ul className="mt-3 grid gap-3">
          {addresses.map((a) => (
            <li
              key={a.id}
              className="flex items-start justify-between gap-3 rounded-[var(--radius-md)] bg-white/70 p-4 ring-1 ring-cocoa-900/5"
            >
              <span>
                {a.label && <span className="block font-bold">{a.label}</span>}
                {oneLine(a)}
              </span>
              <button
                type="button"
                disabled={pending}
                aria-label={`Remove ${a.label || a.line1}`}
                onClick={() =>
                  start(async () => {
                    await deleteAddress(a.id);
                    router.refresh();
                  })
                }
                className="shrink-0 text-sm font-bold text-cocoa-700 underline"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
        {adding ? (
          <form
            aria-label="Add an address"
            className="mt-4 grid gap-3 rounded-[var(--radius-lg)] bg-white/70 p-4 ring-1 ring-cocoa-900/5 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              start(async () => {
                const result = await saveAddress(address);
                if (result.ok) {
                  setAdding(false);
                  setAddressError(null);
                  setAddress({
                    label: "",
                    line1: "",
                    line2: "",
                    landmark: "",
                    city: "",
                    postalCode: "",
                  });
                  router.refresh();
                } else setAddressError(result.error);
              });
            }}
          >
            {(
              [
                ["label", "Name it (like Home)", "off"],
                ["line1", "House and street", "address-line1"],
                ["line2", "Area (optional)", "address-line2"],
                ["landmark", "Landmark (optional)", "off"],
                ["city", "City", "address-level2"],
                ["postalCode", "PIN code", "postal-code"],
              ] as const
            ).map(([key, label, autoComplete]) => (
              <div key={key}>
                <label htmlFor={`addr-${key}`} className="font-bold">
                  {label}
                </label>
                <input
                  id={`addr-${key}`}
                  autoComplete={autoComplete}
                  inputMode={key === "postalCode" ? "numeric" : undefined}
                  maxLength={key === "postalCode" ? 6 : 120}
                  value={address[key]}
                  onChange={setLine(key)}
                  className={field}
                />
              </div>
            ))}
            {addressError && (
              <p role="alert" className="font-bold text-blush-700 sm:col-span-2">
                {addressError}
              </p>
            )}
            <div className="flex gap-2 sm:col-span-2">
              <button type="submit" disabled={pending} className={primary}>
                Save address
              </button>
              <button
                type="button"
                onClick={() => setAdding(false)}
                className="rounded-[var(--radius-pill)] px-4 py-2 font-bold text-cocoa-700"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="mt-3 rounded-[var(--radius-pill)] px-4 py-2 font-bold ring-1 ring-cocoa-900/15 hover:bg-cream-200"
          >
            + Add an address
          </button>
        )}
      </section>
    </>
  );
}
