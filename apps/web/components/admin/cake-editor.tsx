"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useTransition, type ReactNode } from "react";
import {
  rupeesToPaise,
  slugify,
  type CakeInput,
  type CakeStatus,
  type Photo,
  type Tag,
} from "@cozycakes/core";
import type { AdminCake, AdminOptionGroup } from "@cozycakes/db";
import { saveCake, signPhotoUpload } from "@/app/(admin)/admin/actions";
import { CakeArt } from "@/components/cake/cake-art";
import { statusLabels } from "./menu-list";
import { Card, buttonClass, inputClass } from "./ui";

/**
 * Create or edit a cake (FR-021, tasks T054): words, photos, sizes and prices, tags, the choices
 * the builder offers, lead time and whether it's on the menu. Prices are typed in rupees.
 */

type SizeRow = {
  key: string;
  id?: string;
  label: string;
  serves: string;
  price: string;
  active: boolean;
};

const blank: CakeInput = {
  name: "",
  slug: "",
  tagline: "",
  story: "",
  leadTimeDays: 2,
  status: "draft",
  featured: false,
  occasionTags: [],
  dietaryTags: [],
  flavourTags: [],
  photos: [],
  sizes: [],
  optionGroupIds: [],
};

let rowKey = 0;
const nextKey = () => `row-${++rowKey}`;

export function CakeEditor({
  cake,
  tags,
  groups,
  uploadsEnabled,
}: {
  cake: AdminCake | null;
  tags: Tag[];
  groups: AdminOptionGroup[];
  uploadsEnabled: boolean;
}) {
  const initial = cake ?? blank;
  const [form, setForm] = useState<CakeInput>(initial);
  const [slugTouched, setSlugTouched] = useState(Boolean(cake));
  const [sizes, setSizes] = useState<SizeRow[]>(() =>
    initial.sizes.length
      ? initial.sizes.map((s) => ({ ...s, key: nextKey(), price: String(s.price / 100) }))
      : [{ key: nextKey(), label: "1 kg", serves: "8–10", price: "", active: true }],
  );
  const [errors, setErrors] = useState<string[]>([]);
  const [pending, start] = useTransition();

  const set = (patch: Partial<CakeInput>) => setForm((f) => ({ ...f, ...patch }));
  const setSize = (key: string, patch: Partial<SizeRow>) =>
    setSizes((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const toggle = (list: string[], value: string) =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

  const submit = () => {
    const problems: string[] = [];
    const parsedSizes = sizes.map((s) => {
      const price = rupeesToPaise(s.price);
      if (price === null || price <= 0) problems.push(`Add a price for "${s.label || "a size"}"`);
      return { id: s.id, label: s.label, serves: s.serves, price: price ?? 0, active: s.active };
    });
    if (problems.length) {
      setErrors(problems);
      return;
    }
    // Builder steps follow the order the choices are listed on the Choices screen.
    const optionGroupIds = groups.map((g) => g.id).filter((id) => form.optionGroupIds.includes(id));
    start(async () => {
      const result = await saveCake(cake?.id ?? null, {
        ...form,
        sizes: parsedSizes,
        optionGroupIds,
      });
      if (result && !result.ok) setErrors(result.errors);
    });
  };

  return (
    <form
      className="mt-6 grid gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <Card>
        <h2 className="font-display text-xl font-semibold">The basics</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="name" className="font-bold">
              Cake name
            </label>
            <input
              id="name"
              required
              value={form.name}
              onChange={(e) =>
                set({
                  name: e.target.value,
                  ...(slugTouched ? {} : { slug: slugify(e.target.value) }),
                })
              }
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="slug" className="font-bold">
              Web address
            </label>
            <div className="mt-1 flex items-center rounded-[var(--radius-sm)] bg-white ring-1 ring-cocoa-900/20 focus-within:ring-2 focus-within:ring-blush-700">
              <span className="pl-3 text-sm text-cocoa-700">/cakes/</span>
              <input
                id="slug"
                required
                value={form.slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  set({ slug: slugify(e.target.value) || e.target.value.toLowerCase() });
                }}
                className="w-full bg-transparent px-1 py-2.5 focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label htmlFor="lead" className="font-bold">
              Order how many days ahead?
            </label>
            <input
              id="lead"
              type="number"
              min={0}
              max={30}
              required
              value={form.leadTimeDays}
              onChange={(e) => set({ leadTimeDays: Number(e.target.value) })}
              className={inputClass}
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="tagline" className="font-bold">
              One-line description
            </label>
            <input
              id="tagline"
              maxLength={140}
              value={form.tagline}
              onChange={(e) => set({ tagline: e.target.value })}
              placeholder="Layers of dark chocolate sponge and silky truffle."
              className={inputClass}
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="story" className="font-bold">
              The story{" "}
              <span className="font-normal text-cocoa-700">(shown as a quote from the baker)</span>
            </label>
            <textarea
              id="story"
              rows={4}
              maxLength={1200}
              value={form.story}
              onChange={(e) => set({ story: e.target.value })}
              className={inputClass}
            />
          </div>
        </div>
      </Card>

      <PhotosCard
        name={form.name}
        slug={form.slug}
        photos={form.photos}
        onChange={(photos) => set({ photos })}
        enabled={uploadsEnabled}
      />

      <Card>
        <h2 className="font-display text-xl font-semibold">Sizes and prices</h2>
        <p className="mt-1 text-sm text-cocoa-700">
          Prices in rupees. Switch a size off to stop offering it.
        </p>
        <ul className="mt-3 grid gap-3">
          {sizes.map((s, i) => (
            <li
              key={s.key}
              className="grid grid-cols-2 gap-2 rounded-[var(--radius-md)] bg-cream-100 p-3 sm:grid-cols-[1fr_1fr_8rem_auto_auto] sm:items-end"
            >
              <div>
                <label htmlFor={`${s.key}-label`} className="text-sm font-bold">
                  Size
                </label>
                <input
                  id={`${s.key}-label`}
                  required
                  value={s.label}
                  onChange={(e) => setSize(s.key, { label: e.target.value })}
                  placeholder="1 kg"
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor={`${s.key}-serves`} className="text-sm font-bold">
                  Serves
                </label>
                <input
                  id={`${s.key}-serves`}
                  required
                  value={s.serves}
                  onChange={(e) => setSize(s.key, { serves: e.target.value })}
                  placeholder="8–10"
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor={`${s.key}-price`} className="text-sm font-bold">
                  Price (₹)
                </label>
                <input
                  id={`${s.key}-price`}
                  inputMode="decimal"
                  required
                  value={s.price}
                  onChange={(e) => setSize(s.key, { price: e.target.value })}
                  placeholder="1400"
                  className={inputClass}
                />
              </div>
              <label className="flex items-center gap-2 text-sm font-bold sm:pb-3">
                <input
                  type="checkbox"
                  checked={s.active}
                  onChange={(e) => setSize(s.key, { active: e.target.checked })}
                  className="h-5 w-5 accent-[var(--color-blush-700)]"
                />
                Offered
              </label>
              <button
                type="button"
                onClick={() => setSizes((rows) => rows.filter((r) => r.key !== s.key))}
                className={`${buttonClass.quiet} sm:mb-1`}
                aria-label={`Remove size ${s.label || i + 1}`}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() =>
            setSizes((rows) => [
              ...rows,
              { key: nextKey(), label: "", serves: "", price: "", active: true },
            ])
          }
          className={`${buttonClass.soft} mt-3`}
        >
          + Add a size
        </button>
      </Card>

      <Card>
        <h2 className="font-display text-xl font-semibold">Choices in the cake builder</h2>
        <p className="mt-1 text-sm text-cocoa-700">
          Customers step through these after picking a size. Edit the choices themselves on the{" "}
          <Link href="/admin/choices" className="font-bold underline">
            Choices
          </Link>{" "}
          screen.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {groups.map((g) => (
            <Chip
              key={g.id}
              checked={form.optionGroupIds.includes(g.id)}
              onChange={() => set({ optionGroupIds: toggle(form.optionGroupIds, g.id) })}
            >
              {g.name}
              <span className="font-normal text-cocoa-700">
                {" "}
                · {g.options.filter((o) => o.active).length} options
              </span>
            </Chip>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="font-display text-xl font-semibold">Tags for the shop filters</h2>
        {(["occasion", "dietary", "flavour"] as const).map((type) => {
          const key = `${type}Tags` as const;
          return (
            <fieldset key={type} className="mt-3">
              <legend className="font-bold">{tagLegends[type]}</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {tags
                  .filter((t) => t.type === type)
                  .map((t) => (
                    <Chip
                      key={t.slug}
                      checked={form[key].includes(t.slug)}
                      onChange={() => set({ [key]: toggle(form[key], t.slug) })}
                    >
                      {t.emoji ? `${t.emoji} ` : ""}
                      {t.label}
                    </Chip>
                  ))}
              </div>
            </fieldset>
          );
        })}
      </Card>

      <Card>
        <h2 className="font-display text-xl font-semibold">In the shop</h2>
        <fieldset className="mt-3">
          <legend className="font-bold">Status</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {(["visible", "paused", "draft"] as CakeStatus[]).map((s) => (
              <Chip
                key={s}
                type="radio"
                name="status"
                checked={form.status === s}
                onChange={() => set({ status: s })}
              >
                {statusLabels[s]}
              </Chip>
            ))}
          </div>
        </fieldset>
        <label className="mt-4 flex items-center gap-2 font-bold">
          <input
            type="checkbox"
            checked={form.featured}
            onChange={(e) => set({ featured: e.target.checked })}
            className="h-5 w-5 accent-[var(--color-blush-700)]"
          />
          Feature it on the home page
        </label>
      </Card>

      <div className="sticky bottom-4 z-10 flex flex-wrap items-center gap-3 rounded-[var(--radius-lg)] bg-cocoa-900 p-3 text-cream-50 shadow-[var(--shadow-lifted)]">
        <div className="min-w-0 flex-1 pl-2 text-sm">
          {errors.length > 0 ? (
            <ul role="alert" className="font-bold text-blush-200">
              {errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          ) : (
            <span className="hidden text-cream-200 sm:inline">
              {form.status === "visible"
                ? "Customers will see it as soon as you save."
                : `Saved as ${statusLabels[form.status].toLowerCase()}.`}
            </span>
          )}
        </div>
        <Link
          href="/admin/menu"
          className="rounded-[var(--radius-pill)] px-4 py-3 font-bold text-cream-50 hover:bg-cream-50/10"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={pending}
          className="rounded-[var(--radius-pill)] bg-blush-400 px-6 py-3 font-bold text-cocoa-900 transition-transform hover:-translate-y-0.5 active:scale-95 disabled:opacity-60"
        >
          {pending ? "Saving…" : cake ? "Save changes" : "Add cake"}
        </button>
      </div>
    </form>
  );
}

const tagLegends = {
  occasion: "Occasion",
  dietary: "Dietary (it is, or can be made)",
  flavour: "Flavour",
};

function Chip({
  checked,
  onChange,
  children,
  type = "checkbox",
  name,
}: {
  checked: boolean;
  onChange: () => void;
  children: ReactNode;
  type?: "checkbox" | "radio";
  name?: string;
}) {
  return (
    <label className="cursor-pointer rounded-[var(--radius-pill)] bg-white px-4 py-2 font-bold ring-1 ring-cocoa-900/15 transition-colors has-checked:bg-cocoa-900 has-checked:text-cream-50 has-checked:[&_span]:text-cream-200 has-focus-visible:outline-3 has-focus-visible:outline-blush-700">
      <input type={type} name={name} checked={checked} onChange={onChange} className="sr-only" />
      {children}
    </label>
  );
}

function PhotosCard({
  name,
  slug,
  photos,
  onChange,
  enabled,
}: {
  name: string;
  slug: string;
  photos: Photo[];
  onChange: (photos: Photo[]) => void;
  enabled: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function upload(files: FileList) {
    setError(null);
    setBusy(true);
    const added: Photo[] = [];
    try {
      for (const file of Array.from(files).slice(0, 8 - photos.length)) {
        if (!file.type.startsWith("image/") || file.size > 10 * 1024 * 1024) {
          setError(`${file.name} isn't an image under 10 MB`);
          continue;
        }
        const signed = await signPhotoUpload();
        if (!signed.ok) {
          setError(signed.errors[0]!);
          break;
        }
        const form = new FormData();
        for (const [k, v] of Object.entries(signed.data.fields)) form.append(k, v);
        form.append("file", file);
        const res = await fetch(signed.data.uploadUrl, { method: "POST", body: form });
        if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
        const body = (await res.json()) as { width?: number; height?: number };
        added.push({
          url: signed.data.url,
          alt: name ? `${name} cake` : "A CozyCakes cake",
          width: body.width ?? 1200,
          height: body.height ?? 1200,
        });
      }
    } catch (err) {
      console.warn(err);
      setError("A photo didn't upload. Check your connection and try again.");
    } finally {
      if (added.length) onChange([...photos, ...added]);
      setBusy(false);
    }
  }

  const move = (from: number, to: number) => {
    const next = [...photos];
    const [p] = next.splice(from, 1);
    next.splice(to, 0, p!);
    onChange(next);
  };

  return (
    <Card>
      <h2 className="font-display text-xl font-semibold">Photos</h2>
      <p className="mt-1 text-sm text-cocoa-700">
        The first photo is the cover. Until you add one, the shop shows a drawing of the cake.
      </p>
      <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {photos.map((p, i) => (
          <li key={p.url} className="rounded-[var(--radius-md)] bg-cream-100 p-2">
            <div className="relative aspect-square overflow-hidden rounded-[var(--radius-sm)]">
              <Image src={p.url} alt={p.alt} fill sizes="200px" className="object-cover" />
              {i === 0 && (
                <span className="absolute left-2 top-2 rounded-[var(--radius-pill)] bg-cocoa-900 px-2 py-0.5 text-xs font-bold text-cream-50">
                  Cover
                </span>
              )}
            </div>
            <label htmlFor={`alt-${i}`} className="mt-2 block text-xs font-bold">
              Describe the photo
            </label>
            <input
              id={`alt-${i}`}
              value={p.alt}
              onChange={(e) =>
                onChange(photos.map((q, j) => (j === i ? { ...q, alt: e.target.value } : q)))
              }
              className={`${inputClass} text-sm`}
            />
            <div className="mt-1 flex justify-between">
              <button
                type="button"
                disabled={i === 0}
                onClick={() => move(i, i - 1)}
                className={buttonClass.quiet}
                aria-label="Move photo earlier"
              >
                ←
              </button>
              <button
                type="button"
                onClick={() => onChange(photos.filter((_, j) => j !== i))}
                className={buttonClass.quiet}
              >
                Remove
              </button>
              <button
                type="button"
                disabled={i === photos.length - 1}
                onClick={() => move(i, i + 1)}
                className={buttonClass.quiet}
                aria-label="Move photo later"
              >
                →
              </button>
            </div>
          </li>
        ))}
        {photos.length === 0 && (
          <li className="overflow-hidden rounded-[var(--radius-md)]">
            <CakeArt
              slug={slug || "new-cake"}
              title="Drawing shown until a photo is added"
              className="aspect-square w-full"
            />
          </li>
        )}
      </ul>
      {enabled ? (
        photos.length < 8 && (
          <label
            className={`${buttonClass.soft} mt-3 cursor-pointer has-focus-visible:outline-3 has-focus-visible:outline-blush-700`}
          >
            {busy ? "Uploading…" : "+ Add photos"}
            <input
              type="file"
              accept="image/*"
              multiple
              disabled={busy}
              className="sr-only"
              onChange={(e) => {
                if (e.target.files?.length) void upload(e.target.files);
                e.target.value = "";
              }}
            />
          </label>
        )
      ) : (
        <p className="mt-3 rounded-[var(--radius-md)] bg-caramel-200 p-3 text-sm">
          Photo uploads switch on once a Cloudinary account is connected (CLOUDINARY_URL in Vercel).
        </p>
      )}
      {error && (
        <p role="alert" className="mt-2 font-bold text-blush-700">
          {error}
        </p>
      )}
    </Card>
  );
}
