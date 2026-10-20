export function LogoMark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className={className}>
      <rect width="64" height="64" rx="18" fill="#F4B6C2" />
      <ellipse cx="32" cy="50" rx="20" ry="3" fill="#3B2420" opacity=".15" />
      <rect x="15" y="29" width="34" height="20" rx="5" fill="#FFF8F0" />
      <rect x="15" y="38" width="34" height="3.5" fill="#D9925B" />
      <path
        d="M15 33c0-3 2-4.5 4.5-4.5h25c2.5 0 4.5 1.5 4.5 4.5v2c-1.6 2.6-3.2 2.6-4.5 0-1.6 3-3.4 3-5 0-1.8 3.4-3.8 3.4-5.5 0-1.6 2.6-3.4 2.6-5 0-1.8 3.8-4 3.8-5.5 0-1.4 2.6-3 2.6-4.5 0-1.4 2.2-2.6 2.2-4 0z"
        fill="#3B2420"
      />
      <path
        d="M32 24c1-4 3-6 6-7"
        stroke="#4E7342"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
      <circle cx="32" cy="24" r="4.5" fill="#A84860" />
    </svg>
  );
}

export function Wordmark() {
  return (
    <span className="flex items-center gap-2">
      <LogoMark />
      <span className="font-display text-2xl font-semibold tracking-tight">
        Cozy<span className="italic text-blush-700">Cakes</span>
      </span>
    </span>
  );
}
