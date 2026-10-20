"use client";

export function QuantityStepper({
  value,
  max,
  onChange,
  tone = "light",
  label = "Quantity",
}: {
  value: number;
  max: number;
  onChange: (value: number) => void;
  tone?: "light" | "dark";
  label?: string;
}) {
  const button =
    tone === "dark"
      ? "bg-cream-50/15 text-cream-50 hover:bg-cream-50/25"
      : "bg-cream-100 text-cocoa-900 hover:bg-cream-200";
  return (
    <div role="group" aria-label={label} className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => onChange(value - 1)}
        disabled={value <= 1}
        aria-label="One fewer"
        className={`grid h-9 w-9 place-items-center rounded-full text-xl font-bold disabled:opacity-40 ${button}`}
      >
        −
      </button>
      <output aria-live="polite" className="w-6 text-center text-lg font-bold">
        {value}
      </output>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        disabled={value >= max}
        aria-label="One more"
        className={`grid h-9 w-9 place-items-center rounded-full text-xl font-bold disabled:opacity-40 ${button}`}
      >
        +
      </button>
    </div>
  );
}
