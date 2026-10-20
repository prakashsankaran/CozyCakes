/**
 * Illustrated placeholder cakes, shown until the baker's real photos are uploaded (tasks T024).
 * Each cake gets a deterministic look from its flavour and slug, so the menu still feels
 * hand-made rather than full of grey boxes.
 */

type Palette = { bg: string; body: string; cap: string; drip: string; accent: string };

const palettes: Record<string, Palette> = {
  chocolate: { bg: "#F3D3B5", body: "#7B4B35", cap: "#8C5A41", drip: "#3E2419", accent: "#F4B6C2" },
  vanilla: { bg: "#FDEBEF", body: "#FFF1D6", cap: "#FFF8EA", drip: "#F4B6C2", accent: "#A84860" },
  "red-velvet": {
    bg: "#FADBE1",
    body: "#FBF3EC",
    cap: "#FFFFFF",
    drip: "#9E2B3A",
    accent: "#9E2B3A",
  },
  pistachio: { bg: "#DCEAD4", body: "#E8F1DE", cap: "#F4F8EE", drip: "#9CBF8C", accent: "#F4B6C2" },
  fruit: { bg: "#FFF1D6", body: "#FFE7B0", cap: "#FFF4D6", drip: "#F6A93B", accent: "#E8742C" },
  coffee: { bg: "#F3D3B5", body: "#E9CDB0", cap: "#F2DCC5", drip: "#8B5A3C", accent: "#3E2419" },
};

type Topping = "berries" | "sprinkles" | "petals" | "candles";
const toppings: Topping[] = ["berries", "sprinkles", "petals", "candles"];

function hash(s: string): number {
  let h = 7;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

function dripPath(x: number, y: number, w: number, seed: number): string {
  const n = 6;
  const s = w / n;
  let d = `M ${x} ${y} L ${x + w} ${y} L ${x + w} ${y + 10}`;
  for (let i = n - 1; i >= 0; i--) {
    const right = x + (i + 1) * s - 0.18 * s;
    const left = x + i * s + 0.3 * s;
    const depth = 22 + ((seed >> i) % 4) * 9;
    d += ` L ${right} ${y + 10} C ${right} ${y + depth} ${left} ${y + depth} ${left} ${y + 10}`;
    d += ` L ${x + i * s} ${y + 10}`;
  }
  return `${d} Z`;
}

function Tier({
  x,
  y,
  w,
  h,
  p,
  seed,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  p: Palette;
  seed: number;
}) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={16} fill={p.body} />
      <rect x={x + 12} y={y + 14} width={10} height={h - 28} rx={5} fill="#FFFFFF" opacity={0.35} />
      <path d={dripPath(x, y, w, seed)} fill={p.drip} />
      <ellipse cx={x + w / 2} cy={y} rx={w / 2} ry={14} fill={p.cap} />
      {Array.from({ length: Math.floor(w / 22) }, (_, i) => (
        <circle key={i} cx={x + 14 + i * 22} cy={y + h - 4} r={7} fill={p.cap} />
      ))}
    </g>
  );
}

function Toppings({
  kind,
  cx,
  y,
  width,
  p,
  seed,
}: {
  kind: Topping;
  cx: number;
  y: number;
  width: number;
  p: Palette;
  seed: number;
}) {
  const span = width * 0.7;
  const left = cx - span / 2;
  switch (kind) {
    case "berries":
      return (
        <g>
          {[0, 1, 2, 3, 4].map((i) => (
            <g key={i}>
              <circle cx={left + (i * span) / 4} cy={y - 8 - (i % 2) * 6} r={11} fill={p.accent} />
              <circle
                cx={left + (i * span) / 4 - 4}
                cy={y - 12 - (i % 2) * 6}
                r={3}
                fill="#FFFFFF"
                opacity={0.6}
              />
            </g>
          ))}
        </g>
      );
    case "sprinkles": {
      const colors = ["#F4B6C2", "#A8C99B", "#D9925B", "#FFFFFF", "#A84860"];
      return (
        <g>
          {Array.from({ length: 16 }, (_, i) => (
            <rect
              key={i}
              x={left + (((seed >> (i % 8)) % 100) / 100) * span}
              y={y - 6 + ((i * 7) % 10)}
              width={10}
              height={3.5}
              rx={1.75}
              fill={colors[i % colors.length]}
              transform={`rotate(${(i * 47) % 180} ${left + (((seed >> (i % 8)) % 100) / 100) * span + 5} ${y - 4 + ((i * 7) % 10)})`}
            />
          ))}
        </g>
      );
    }
    case "petals":
      return (
        <g>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <ellipse
              key={i}
              cx={left + (i * span) / 5}
              cy={y - 6 - (i % 3) * 4}
              rx={9}
              ry={5}
              fill={i % 2 ? "#F4B6C2" : "#E88FA3"}
              transform={`rotate(${i * 35} ${left + (i * span) / 5} ${y - 6 - (i % 3) * 4})`}
            />
          ))}
          <circle cx={cx} cy={y - 14} r={6} fill="#A8C99B" />
        </g>
      );
    case "candles":
      return (
        <g>
          {[-1, 0, 1].map((i) => (
            <g key={i}>
              <rect
                x={cx + i * 34 - 4}
                y={y - 52}
                width={8}
                height={46}
                rx={3}
                fill={i === 0 ? "#F4B6C2" : "#FFFFFF"}
              />
              <path
                d={`M ${cx + i * 34} ${y - 72} c 8 10 6 16 0 18 c -6 -2 -8 -8 0 -18 z`}
                fill="#F6B042"
                className="animate-float"
                style={{ ["--delay" as string]: `${(i + 1) * 300}ms` }}
              />
            </g>
          ))}
        </g>
      );
  }
}

export function CakeArt({
  slug,
  flavour,
  title,
  className,
}: {
  slug: string;
  flavour?: string;
  title: string;
  className?: string;
}) {
  const seed = hash(slug);
  const p = palettes[flavour ?? ""] ?? palettes.vanilla!;
  const twoTier = seed % 3 === 0;
  const topping = toppings[seed % toppings.length]!;

  return (
    <svg
      viewBox="0 0 400 400"
      role="img"
      aria-label={title}
      preserveAspectRatio="xMidYMid slice"
      className={className}
    >
      <rect width="400" height="400" fill={p.bg} />
      <circle cx={70 + (seed % 60)} cy={80} r={90} fill="#FFFFFF" opacity={0.35} />
      <circle cx={340} cy={330} r={110} fill="#FFFFFF" opacity={0.25} />
      <ellipse cx="200" cy="334" rx="150" ry="18" fill="#3B2420" opacity={0.12} />
      <ellipse cx="200" cy="326" rx="140" ry="14" fill="#FFFFFF" />
      {twoTier ? (
        <>
          <Tier x={95} y={225} w={210} h={98} p={p} seed={seed} />
          <Tier x={135} y={150} w={130} h={78} p={p} seed={seed >> 3} />
          <Toppings kind={topping} cx={200} y={150} width={130} p={p} seed={seed} />
        </>
      ) : (
        <>
          <Tier x={85} y={190} w={230} h={132} p={p} seed={seed} />
          <Toppings kind={topping} cx={200} y={190} width={230} p={p} seed={seed} />
        </>
      )}
    </svg>
  );
}
