const FALLBACK_TONES = [
  "bg-sky-100 text-sky-800",
  "bg-violet-100 text-violet-800",
  "bg-rose-100 text-rose-800",
  "bg-amber-100 text-amber-800",
  "bg-emerald-100 text-emerald-800",
];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

/** Person picture. Falls back to coloured initials when there is no photoUrl. */
export function Avatar({
  name,
  photoUrl,
  size = 36,
  alt = "",
}: {
  name: string;
  photoUrl: string | null;
  size?: number;
  /** Leave empty when the name is shown right next to the picture. */
  alt?: string;
}) {
  const box = { width: size, height: size };

  if (photoUrl) {
    return (
      // Plain <img>: these are small local SVGs, so next/image optimisation adds nothing.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photoUrl}
        alt={alt}
        width={size}
        height={size}
        style={box}
        className="shrink-0 rounded-full bg-slate-800 object-cover ring-1 ring-white/10"
      />
    );
  }

  const tone = FALLBACK_TONES[[...name].reduce((h, ch) => h + ch.charCodeAt(0), 0) % FALLBACK_TONES.length];
  return (
    <span
      role={alt ? "img" : undefined}
      aria-label={alt || undefined}
      aria-hidden={alt ? undefined : true}
      style={{ ...box, fontSize: size * 0.38 }}
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-medium ring-1 ring-white/10 ${tone}`}
    >
      {initials(name)}
    </span>
  );
}
