"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { formatMoney, type CakeStatus } from "@cozycakes/core";
import type { AdminCakeSummary } from "@cozycakes/db";
import { moveCake, setCakeStatus } from "@/app/(admin)/admin/actions";
import { CakeArt } from "@/components/cake/cake-art";
import { buttonClass } from "./ui";

export const statusLabels: Record<CakeStatus, string> = {
  visible: "On the menu",
  paused: "Back soon",
  draft: "Hidden draft",
  archived: "Archived",
};

const statusStyle: Record<CakeStatus, string> = {
  visible: "bg-pistachio-200",
  paused: "bg-caramel-200",
  draft: "bg-cream-200",
  archived: "bg-cocoa-900 text-cream-50",
};

export function MenuList({ cakes }: { cakes: AdminCakeSummary[] }) {
  const router = useRouter();
  const savedId = useSearchParams().get("saved");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [showArchived, setShowArchived] = useState(false);

  const run = (action: () => Promise<{ ok: boolean; errors?: string[] }>) =>
    start(async () => {
      const result = await action();
      setError(result.ok ? null : (result.errors?.[0] ?? "Something went wrong"));
      router.refresh();
    });

  const shown = cakes.filter((c) => showArchived || c.status !== "archived");
  const saved = cakes.find((c) => c.id === savedId);

  return (
    <div className="mt-6">
      {saved && (
        <p role="status" className="mb-4 rounded-[var(--radius-md)] bg-pistachio-200 p-3 font-bold">
          Saved {saved.name}. The shop shows it straight away.
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="mb-4 rounded-[var(--radius-md)] bg-blush-100 p-3 font-bold text-blush-700"
        >
          {error}
        </p>
      )}
      <ul className="grid gap-3" aria-busy={pending}>
        {shown.map((cake, i) => (
          <li
            key={cake.id}
            className="flex flex-wrap items-center gap-3 rounded-[var(--radius-lg)] bg-cream-50 p-3 ring-1 ring-cocoa-900/5"
          >
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[var(--radius-md)]">
              {cake.cover ? (
                <Image src={cake.cover.url} alt="" fill sizes="64px" className="object-cover" />
              ) : (
                <CakeArt slug={cake.slug} title="" className="h-full w-full" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-lg font-semibold leading-tight">{cake.name}</h2>
              <p className="text-sm text-cocoa-700">
                <span
                  className={`mr-2 rounded-[var(--radius-pill)] px-2 py-0.5 text-xs font-bold ${statusStyle[cake.status]}`}
                >
                  {statusLabels[cake.status]}
                </span>
                {cake.startingPrice !== null
                  ? `from ${formatMoney(cake.startingPrice)} · ${cake.sizeCount} ${cake.sizeCount === 1 ? "size" : "sizes"}`
                  : "No sizes yet"}
              </p>
            </div>
            <div className="flex w-full flex-wrap items-center gap-1 sm:w-auto">
              <Link href={`/admin/menu/${cake.id}`} className={buttonClass.soft}>
                Edit<span className="sr-only"> {cake.name}</span>
              </Link>
              <label className="sr-only" htmlFor={`status-${cake.id}`}>
                Status of {cake.name}
              </label>
              <select
                id={`status-${cake.id}`}
                value={cake.status}
                disabled={pending}
                onChange={(e) => run(() => setCakeStatus(cake.id, e.target.value as CakeStatus))}
                className="rounded-[var(--radius-pill)] bg-white px-3 py-2 text-sm font-bold ring-1 ring-cocoa-900/15"
              >
                {(Object.keys(statusLabels) as CakeStatus[]).map((s) => (
                  <option key={s} value={s}>
                    {statusLabels[s]}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={pending || i === 0}
                onClick={() => run(() => moveCake(cake.id, "up"))}
                className={buttonClass.quiet}
                aria-label={`Move ${cake.name} up`}
              >
                ↑
              </button>
              <button
                type="button"
                disabled={pending || i === shown.length - 1}
                onClick={() => run(() => moveCake(cake.id, "down"))}
                className={buttonClass.quiet}
                aria-label={`Move ${cake.name} down`}
              >
                ↓
              </button>
            </div>
          </li>
        ))}
      </ul>
      {cakes.some((c) => c.status === "archived") && (
        <button
          type="button"
          onClick={() => setShowArchived((v) => !v)}
          className={`${buttonClass.quiet} mt-4`}
        >
          {showArchived ? "Hide archived cakes" : "Show archived cakes"}
        </button>
      )}
    </div>
  );
}
