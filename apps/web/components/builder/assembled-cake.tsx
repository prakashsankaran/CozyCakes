import { hash, palettes, Tier, Toppings, type Palette, type Topping } from "../cake/cake-art";

/**
 * The "cake assembles" summary (tasks T042): an illustrated cake that grows with the size, takes
 * the frosting and flavour colours, and gains toppers, candles, flowers and the piped message as
 * the customer picks them. New pieces pop in; colours ease between choices.
 */

export type AssemblyState = {
  slug: string;
  flavourTag?: string;
  /** 0 = smallest size, 1 = largest; null before a size is picked. */
  sizeScale: number | null;
  flavourSwatch: string | null;
  frostingSwatch: string | null;
  addOns: string[];
  dietary: string[];
  message: string;
};

function toppingFor(name: string): Topping | "topper" | null {
  const n = name.toLowerCase();
  if (n.includes("topper")) return "topper";
  if (n.includes("candle")) return "candles";
  if (n.includes("flower") || n.includes("petal") || n.includes("rose")) return "petals";
  if (n.includes("sprinkle")) return "sprinkles";
  if (n.includes("berr") || n.includes("fruit")) return "berries";
  return null;
}

function messageLines(message: string): string[] {
  const text = message.trim();
  if (text.length <= 20) return text ? [text] : [];
  const middle = text.length / 2;
  let split = -1;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === " " && (split < 0 || Math.abs(i - middle) < Math.abs(split - middle)))
      split = i;
  }
  return split < 0 ? [text] : [text.slice(0, split), text.slice(split + 1)];
}

export function AssembledCake({ state, className }: { state: AssemblyState; className?: string }) {
  const seed = hash(state.slug);
  const base = palettes[state.flavourTag ?? ""] ?? palettes.vanilla!;
  const p: Palette = {
    ...base,
    body: state.frostingSwatch ?? base.body,
    cap: state.frostingSwatch ?? base.cap,
    drip: state.flavourSwatch ?? base.drip,
  };

  const scale = state.sizeScale;
  const twoTier = scale !== null && scale > 0.66;
  const bottom =
    scale === null
      ? { w: 200, h: 116 }
      : twoTier
        ? { w: 230, h: 104 }
        : { w: 180 + scale * 70, h: 104 + scale * 30 };
  const bottomX = 200 - bottom.w / 2;
  const bottomY = 322 - bottom.h;
  const top = { w: 140, h: 76 };
  const topY = bottomY - top.h + 4;
  const crownY = twoTier ? topY : bottomY;
  const crownW = twoTier ? top.w : bottom.w;

  const toppings = [...new Set(state.addOns.map(toppingFor).filter((t) => t !== null))];
  const lines = messageLines(state.message);
  const fontSize = lines.some((l) => l.length > 14) ? 12 : 15;

  return (
    <svg viewBox="0 0 400 360" role="img" aria-label="Preview of your cake" className={className}>
      <rect width="400" height="360" rx="28" fill={p.bg} className="cake-fill" />
      <circle cx={80 + (seed % 50)} cy={70} r={80} fill="#FFFFFF" opacity={0.35} />
      <ellipse cx="200" cy="334" rx="150" ry="16" fill="#3B2420" opacity={0.12} />
      <ellipse cx="200" cy="326" rx="140" ry="13" fill="#FFFFFF" />

      {scale === null ? (
        <g opacity={0.5}>
          <rect
            x={bottomX}
            y={bottomY}
            width={bottom.w}
            height={bottom.h}
            rx={16}
            fill="none"
            stroke="#3B2420"
            strokeWidth={2.5}
            strokeDasharray="8 8"
          />
          <text
            x="200"
            y={bottomY + bottom.h / 2 + 6}
            textAnchor="middle"
            fill="#3B2420"
            fontSize={16}
          >
            Pick a size to start
          </text>
        </g>
      ) : (
        <g key={twoTier ? "two" : "one"} className="animate-pop cake-fill">
          <Tier x={bottomX} y={bottomY} w={bottom.w} h={bottom.h} p={p} seed={seed} />
          <rect
            x={bottomX}
            y={bottomY + bottom.h * 0.55}
            width={bottom.w}
            height={8}
            fill={p.drip}
            opacity={0.85}
          />
          {twoTier && (
            <>
              <Tier x={200 - top.w / 2} y={topY} w={top.w} h={top.h} p={p} seed={seed >> 3} />
              <rect
                x={200 - top.w / 2}
                y={topY + top.h * 0.55}
                width={top.w}
                height={7}
                fill={p.drip}
                opacity={0.85}
              />
            </>
          )}
        </g>
      )}

      {scale !== null &&
        toppings.map((t) =>
          t === "topper" ? (
            <g key={t} className="animate-pop">
              <rect x={168} y={crownY - 78} width={3} height={64} fill="#8F5424" />
              <rect x={229} y={crownY - 78} width={3} height={64} fill="#8F5424" />
              <path
                d={`M 150 ${crownY - 92} Q 200 ${crownY - 104} 250 ${crownY - 92} L 246 ${crownY - 66} Q 200 ${crownY - 78} 154 ${crownY - 66} Z`}
                fill="#A84860"
              />
              <text
                x="200"
                y={crownY - 79}
                textAnchor="middle"
                fontSize={12}
                fontWeight={700}
                fill="#FFF8F0"
              >
                Happy Birthday
              </text>
            </g>
          ) : (
            <g key={t} className="animate-pop">
              <Toppings kind={t} cx={200} y={crownY} width={crownW} p={p} seed={seed} />
            </g>
          ),
        )}

      {scale !== null && lines.length > 0 && (
        <g key="plaque" className="animate-pop">
          <rect
            x={200 - Math.min(bottom.w - 30, 170) / 2}
            y={bottomY + bottom.h * 0.18}
            width={Math.min(bottom.w - 30, 170)}
            height={lines.length === 2 ? 40 : 28}
            rx={12}
            fill="#FFF8F0"
            opacity={0.95}
          />
          {lines.map((line, i) => (
            <text
              key={i}
              x="200"
              y={bottomY + bottom.h * 0.18 + 19 + i * 15}
              textAnchor="middle"
              fontSize={fontSize}
              fontStyle="italic"
              fill="#A84860"
              className="font-display"
            >
              {line}
            </text>
          ))}
        </g>
      )}

      {state.dietary.length > 0 && (
        <g key="dietary" className="animate-pop">
          <rect
            x={18}
            y={18}
            width={state.dietary.length > 1 ? 168 : 112}
            height={30}
            rx={15}
            fill="#DCEAD4"
          />
          <text x={32} y={38} fontSize={13} fontWeight={700} fill="#3B2420">
            🌱 {state.dietary.map((d) => d.replace(/^make it /i, "")).join(" · ")}
          </text>
        </g>
      )}
    </svg>
  );
}
