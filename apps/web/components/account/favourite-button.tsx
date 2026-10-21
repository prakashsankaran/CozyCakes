"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type State = "loading" | "signed-out" | "on" | "off";

/**
 * The heart on a cake (US6 scenario 2). Saved to the account, so it follows the customer to
 * every device; guests are invited to sign in and come straight back.
 */
export function FavouriteButton({
  cakeId,
  cakeName,
  slug,
}: {
  cakeId: string;
  cakeName: string;
  slug: string;
}) {
  const router = useRouter();
  const [state, setState] = useState<State>("loading");
  const [pop, setPop] = useState(false);

  useEffect(() => {
    let live = true;
    fetch("/api/v1/me/favourites")
      .then(async (res) => {
        if (!live) return;
        if (res.status === 401) return setState("signed-out");
        const { cakeIds } = (await res.json()) as { cakeIds: string[] };
        setState(cakeIds.includes(cakeId) ? "on" : "off");
      })
      .catch(() => live && setState("signed-out"));
    return () => {
      live = false;
    };
  }, [cakeId]);

  async function toggle() {
    if (state === "signed-out") {
      router.push(`/me?reason=favourite&next=${encodeURIComponent(`/cakes/${slug}`)}`);
      return;
    }
    const next = state === "on" ? "off" : "on";
    setState(next);
    if (next === "on") setPop(true);
    const res = await fetch("/api/v1/me/favourites", {
      method: next === "on" ? "POST" : "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ cakeId }),
    });
    if (!res.ok) setState(res.status === 401 ? "signed-out" : state);
  }

  const on = state === "on";
  return (
    <button
      type="button"
      onClick={toggle}
      disabled={state === "loading"}
      aria-pressed={state === "signed-out" || state === "loading" ? undefined : on}
      aria-label={
        state === "signed-out" ? `Sign in to save ${cakeName}` : `Save ${cakeName} to favourites`
      }
      onAnimationEnd={() => setPop(false)}
      className={`grid h-12 w-12 place-items-center rounded-full bg-cream-50/90 text-2xl shadow-[var(--shadow-soft)] backdrop-blur transition-transform hover:scale-110 active:scale-95 disabled:opacity-60 ${
        pop ? "animate-[heart-pop_400ms_ease-out]" : ""
      }`}
    >
      <span aria-hidden="true">{on ? "❤️" : "🤍"}</span>
    </button>
  );
}
