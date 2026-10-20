"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import {
  CAKE_MESSAGE_MAX,
  CakeConfigSchema,
  configurationIssues,
  describeChoices,
  formatMoney,
  MAX_QUANTITY,
  selectedIn,
  unitPrice,
  type CakeConfig,
  type CakeDetail,
  type OptionGroup,
} from "@cozycakes/core";
import { cart, openCartSheet, useCart, type StoredCartItem } from "@/lib/cart/store";
import { AssembledCake, type AssemblyState } from "./assembled-cake";
import { PhotoStep } from "./photo-step";
import { QuantityStepper } from "./quantity-stepper";

/**
 * Step-by-step "build your cake" flow (FR-006, tasks T041): size → the cake's option groups in the
 * baker's order (flavour, frosting, dietary, add-ons) → message → reference photo. The price comes
 * from the same `@cozycakes/core` rules the server uses (FR-007). `?edit=<line id>` reopens a cart
 * item with its choices pre-selected (US2 scenario 5).
 */
export function CakeBuilder({
  cake,
  uploadsEnabled,
}: {
  cake: CakeDetail;
  uploadsEnabled: boolean;
}) {
  const editId = useSearchParams().get("edit");
  const items = useCart();
  const editing = editId ? items.find((i) => i.id === editId && i.cakeId === cake.id) : undefined;
  // Remount when the cart item loads from the device so its choices become the initial state.
  return (
    <BuilderForm
      key={editing?.id ?? "new"}
      cake={cake}
      uploadsEnabled={uploadsEnabled}
      editing={editing}
    />
  );
}

type Step =
  | { kind: "size"; title: string }
  | { kind: "group"; title: string; group: OptionGroup }
  | { kind: "message"; title: string }
  | { kind: "photo"; title: string };

const questions: Record<string, string> = {
  flavour: "Which flavour inside?",
  frosting: "And the frosting?",
  dietary: "Any dietary needs?",
  "add-ons": "A little something extra?",
};

function question(step: Step) {
  switch (step.kind) {
    case "size":
      return "How big is the celebration?";
    case "group":
      return (
        questions[step.group.name.toLowerCase()] ?? `Choose your ${step.group.name.toLowerCase()}`
      );
    case "message":
      return "What should I pipe on top?";
    case "photo":
      return "Got a theme in mind?";
  }
}

function emptyConfig(cake: CakeDetail): CakeConfig {
  return {
    cakeId: cake.id,
    sizeId: "",
    optionIds: [],
    message: "",
    referencePhoto: null,
    quantity: 1,
  };
}

function BuilderForm({
  cake,
  uploadsEnabled,
  editing,
}: {
  cake: CakeDetail;
  uploadsEnabled: boolean;
  editing: StoredCartItem | undefined;
}) {
  const router = useRouter();
  const steps: Step[] = [
    { kind: "size", title: "Size" },
    ...cake.optionGroups.map((group) => ({ kind: "group" as const, title: group.name, group })),
    { kind: "message", title: "Message" },
    { kind: "photo", title: "Photo" },
  ];

  const [config, setConfig] = useState<CakeConfig>(() =>
    editing ? CakeConfigSchema.parse(editing) : emptyConfig(cake),
  );
  const [stepIndex, setStepIndex] = useState(0);
  const [nudge, setNudge] = useState<string | null>(null);
  const [added, setAdded] = useState(false);

  const step = steps[stepIndex]!;
  const issues = configurationIssues(cake, config);
  const price = unitPrice(cake, config);
  const hasSize = cake.sizes.some((s) => s.id === config.sizeId);

  const update = (patch: Partial<CakeConfig>) => {
    setConfig((c) => ({ ...c, ...patch }));
    setNudge(null);
    setAdded(false);
  };

  const toggleOption = (group: OptionGroup, optionId: string) => {
    const others = config.optionIds.filter((id) => !group.options.some((o) => o.id === id));
    const current = selectedIn(group, config.optionIds).map((o) => o.id);
    let next: string[];
    if (group.kind === "single") {
      next = current.includes(optionId) && !group.required ? [] : [optionId];
    } else if (current.includes(optionId)) {
      next = current.filter((id) => id !== optionId);
    } else {
      if (group.maxSelect !== null && current.length >= group.maxSelect) {
        setNudge(`You can pick up to ${group.maxSelect}`);
        return;
      }
      next = [...current, optionId];
    }
    update({ optionIds: [...others, ...next] });
  };

  const stepDone = (s: Step) => {
    if (s.kind === "size") return hasSize;
    if (s.kind === "group") return selectedIn(s.group, config.optionIds).length > 0;
    if (s.kind === "message") return config.message.trim().length > 0;
    return config.referencePhoto !== null;
  };
  const stepSummary = (s: Step) => {
    if (s.kind === "size") return cake.sizes.find((x) => x.id === config.sizeId)?.label;
    if (s.kind === "group") {
      const names = selectedIn(s.group, config.optionIds).map((o) => o.name);
      return names.length > 1 ? `${names.length} picked` : names[0];
    }
    if (s.kind === "message") return config.message.trim() ? "Added" : undefined;
    return config.referencePhoto ? "Added" : undefined;
  };

  const firstIncomplete = () =>
    steps.findIndex(
      (s) =>
        (s.kind === "size" && !hasSize) || (s.kind === "group" && s.group.required && !stepDone(s)),
    );

  const addToCart = () => {
    if (issues.length > 0) {
      const missing = firstIncomplete();
      if (missing >= 0) setStepIndex(missing);
      setNudge(issues[0]!);
      return;
    }
    const item: Omit<StoredCartItem, "id"> = {
      ...config,
      message: config.message.trim(),
      snapshot: {
        cakeSlug: cake.slug,
        cakeName: cake.name,
        flavourTag: cake.flavourTags[0],
        sizeLabel: cake.sizes.find((s) => s.id === config.sizeId)!.label,
        choices: describeChoices(cake, config.optionIds),
        unitPrice: price,
      },
    };
    if (editing) {
      cart.replace(editing.id, item);
      router.replace(`/cakes/${cake.slug}`, { scroll: false });
    } else {
      cart.add(item);
    }
    setAdded(true);
    openCartSheet();
  };

  const pickedIn = (pattern: RegExp) =>
    cake.optionGroups
      .filter((g) => pattern.test(g.name))
      .flatMap((g) => selectedIn(g, config.optionIds));
  const sizeIndex = cake.sizes.findIndex((s) => s.id === config.sizeId);
  const assembly: AssemblyState = {
    slug: cake.slug,
    flavourTag: cake.flavourTags[0],
    sizeScale:
      sizeIndex < 0 ? null : cake.sizes.length > 1 ? sizeIndex / (cake.sizes.length - 1) : 0.5,
    flavourSwatch: pickedIn(/flavou?r/i)[0]?.swatch ?? null,
    frostingSwatch: pickedIn(/frost|icing/i)[0]?.swatch ?? null,
    dietary: pickedIn(/diet/i).map((o) => o.name),
    addOns: cake.optionGroups
      .filter((g) => g.kind === "multi" && !/diet/i.test(g.name))
      .flatMap((g) => selectedIn(g, config.optionIds).map((o) => o.name)),
    message: config.message,
  };

  return (
    <section
      aria-labelledby="builder-title"
      className="mt-10 rounded-[var(--radius-lg)] bg-white/70 p-4 shadow-[var(--shadow-soft)] ring-1 ring-cocoa-900/5 sm:p-6"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="builder-title" className="font-display text-2xl font-semibold">
          {editing ? "Edit your cake" : "Build your cake"}
        </h2>
        <p className="text-sm font-bold text-cocoa-700">
          Step {stepIndex + 1} of {steps.length}
        </p>
      </div>

      <AssembledCake state={assembly} className="mx-auto mt-4 w-full max-w-sm md:max-w-xs" />

      <ol className="no-scrollbar -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {steps.map((s, i) => {
          const done = stepDone(s);
          const summary = stepSummary(s);
          return (
            <li key={`${s.kind}-${s.title}`} className="shrink-0">
              <button
                type="button"
                onClick={() => setStepIndex(i)}
                aria-current={i === stepIndex ? "step" : undefined}
                className={`flex flex-col items-start rounded-[var(--radius-md)] px-3 py-1.5 text-left text-sm transition-colors ${
                  i === stepIndex
                    ? "bg-cocoa-900 text-cream-50"
                    : done
                      ? "bg-pistachio-200 text-cocoa-900"
                      : "bg-cream-100 text-cocoa-900 hover:bg-cream-200"
                }`}
              >
                <span className="font-bold">
                  {done && i !== stepIndex && <span aria-hidden="true">✓ </span>}
                  {s.title}
                </span>
                {summary && <span className="max-w-32 truncate text-xs opacity-90">{summary}</span>}
              </button>
            </li>
          );
        })}
      </ol>

      <fieldset key={stepIndex} className="animate-rise mt-5 min-w-0">
        <legend className="font-display text-xl font-semibold">{question(step)}</legend>
        {step.kind === "group" && step.group.kind === "multi" && step.group.maxSelect && (
          <p className="mt-1 text-sm text-cocoa-700">Pick up to {step.group.maxSelect}</p>
        )}

        <div className="mt-4">
          {step.kind === "size" && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {cake.sizes.map((s) => (
                <ChoiceCard
                  key={s.id}
                  type="radio"
                  name="size"
                  checked={config.sizeId === s.id}
                  onChange={() => update({ sizeId: s.id })}
                  title={s.label}
                  detail={`Serves ${s.serves}`}
                  price={formatMoney(s.price)}
                />
              ))}
            </div>
          )}

          {step.kind === "group" && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {step.group.options.map((o) => (
                <ChoiceCard
                  key={o.id}
                  type={step.group.kind === "single" ? "radio" : "checkbox"}
                  name={step.group.id}
                  checked={config.optionIds.includes(o.id)}
                  onChange={() => toggleOption(step.group, o.id)}
                  title={o.name}
                  swatch={o.swatch}
                  price={o.priceDelta > 0 ? `+${formatMoney(o.priceDelta)}` : "Included"}
                />
              ))}
            </div>
          )}

          {step.kind === "message" && (
            <MessageField value={config.message} onChange={(message) => update({ message })} />
          )}

          {step.kind === "photo" && (
            <PhotoStep
              enabled={uploadsEnabled}
              photo={config.referencePhoto}
              onChange={(referencePhoto) => update({ referencePhoto })}
            />
          )}
        </div>
      </fieldset>

      <div className="mt-5 flex justify-between gap-3">
        <button
          type="button"
          onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
          disabled={stepIndex === 0}
          className="rounded-[var(--radius-pill)] px-5 py-3 font-bold text-cocoa-700 hover:bg-cream-100 disabled:invisible"
        >
          <span aria-hidden="true">←</span> Back
        </button>
        {stepIndex < steps.length - 1 && (
          <button
            type="button"
            onClick={() => setStepIndex((i) => Math.min(steps.length - 1, i + 1))}
            className="rounded-[var(--radius-pill)] bg-cream-200 px-6 py-3 font-bold text-cocoa-900 transition-transform hover:-translate-y-0.5 active:scale-95"
          >
            Next: {steps[stepIndex + 1]!.title} <span aria-hidden="true">→</span>
          </button>
        )}
      </div>

      <div className="sticky bottom-[calc(var(--bottom-nav-height)+1.25rem)] z-20 -mx-2 mt-6 rounded-[var(--radius-lg)] bg-cocoa-900 p-3 text-cream-50 shadow-[var(--shadow-lifted)] sm:bottom-4">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <div className="min-w-0 flex-1 pl-2">
            <p className="text-xs font-bold uppercase tracking-wide text-cream-200">
              {hasSize ? "Your cake" : "Starts at"}
            </p>
            <p
              aria-live="polite"
              className="font-display text-xl font-semibold sm:text-2xl"
              data-testid="live-price"
            >
              {formatMoney(hasSize ? price * config.quantity : (cake.startingPrice ?? 0))}
            </p>
          </div>
          <QuantityStepper
            value={config.quantity}
            max={MAX_QUANTITY}
            onChange={(quantity) => update({ quantity })}
            tone="dark"
          />
          <button
            type="button"
            onClick={addToCart}
            className="rounded-[var(--radius-pill)] bg-blush-400 px-5 py-3 font-bold text-cocoa-900 transition-transform hover:-translate-y-0.5 active:scale-95"
          >
            {added ? "Added ✓" : editing ? "Update cake" : "Add to cart"}
          </button>
        </div>
        {nudge && (
          <p role="alert" className="mt-2 pl-2 text-sm font-bold text-blush-200">
            {nudge}
          </p>
        )}
      </div>
    </section>
  );
}

function ChoiceCard({
  type,
  name,
  checked,
  onChange,
  title,
  detail,
  price,
  swatch,
}: {
  type: "radio" | "checkbox";
  name: string;
  checked: boolean;
  onChange: () => void;
  title: string;
  detail?: string;
  price: string;
  swatch?: string | null;
}) {
  return (
    <label className="relative flex cursor-pointer flex-col gap-1 rounded-[var(--radius-md)] bg-cream-50 p-4 ring-1 ring-cocoa-900/10 transition-all has-checked:-translate-y-0.5 has-checked:bg-blush-100 has-checked:shadow-[var(--shadow-soft)] has-checked:ring-2 has-checked:ring-blush-700 has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-blush-700">
      <input type={type} name={name} checked={checked} onChange={onChange} className="sr-only" />
      <span className="flex items-center gap-2 font-bold">
        {swatch && (
          <span
            aria-hidden="true"
            className="h-4 w-4 shrink-0 rounded-full ring-1 ring-cocoa-900/20"
            style={{ background: swatch }}
          />
        )}
        {title}
      </span>
      {detail && <span className="text-sm text-cocoa-700">{detail}</span>}
      <span className="text-sm font-bold text-cocoa-700">{price}</span>
      <span
        aria-hidden="true"
        className={`absolute right-3 top-3 grid h-6 w-6 place-items-center rounded-full text-xs font-bold transition-all ${
          checked ? "scale-100 bg-blush-700 text-cream-50" : "scale-0"
        }`}
      >
        ✓
      </span>
    </label>
  );
}

function MessageField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const left = CAKE_MESSAGE_MAX - value.length;
  return (
    <div>
      <label htmlFor="cake-message" className="font-bold">
        Message on the cake <span className="font-normal text-cocoa-700">(optional)</span>
      </label>
      <input
        id="cake-message"
        type="text"
        value={value}
        maxLength={CAKE_MESSAGE_MAX}
        onChange={(e) => onChange(e.target.value.slice(0, CAKE_MESSAGE_MAX))}
        placeholder="Happy 30th, Ananya!"
        aria-describedby="cake-message-count"
        autoComplete="off"
        className="mt-2 w-full rounded-[var(--radius-md)] bg-cream-50 px-4 py-3 text-lg ring-1 ring-cocoa-900/20 focus:ring-2 focus:ring-blush-700 focus:outline-none"
      />
      <p
        id="cake-message-count"
        aria-live="polite"
        className={`mt-2 text-sm font-bold ${left <= 5 ? "text-blush-700" : "text-cocoa-700"}`}
      >
        {value.length}/{CAKE_MESSAGE_MAX} characters
        {left === 0 && " · that's the most I can pipe neatly"}
      </p>
    </div>
  );
}
