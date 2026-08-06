import { Link } from "@tanstack/react-router";

interface GameCardProps {
  title: string;
  subtitle: string;
  description: string;
  tag: string;
  bannerSrc: string;
  bannerAlt: string;
  ctaLabel: string;
  ctaHref: "/servers" | "/guilds";
  accentLine: string;
  accentTag: string;
  /** "filled" = bg-white text-black; "outlined" = border+glass style */
  ctaVariant?: "filled" | "outlined";
}

export function GameCard({
  title,
  subtitle,
  description,
  tag,
  bannerSrc,
  bannerAlt,
  ctaLabel,
  ctaHref,
  accentLine,
  accentTag,
  ctaVariant = "outlined",
}: GameCardProps) {
  return (
    <article className="clip-angle-lg group relative flex flex-col overflow-hidden border border-white/[0.07] bg-[oklch(0.055_0_0)] shadow-[0_0_0_1px_rgba(255,255,255,0.03)_inset] transition duration-500 hover:shadow-[0_24px_64px_rgba(0,0,0,0.65),0_0_0_1px_rgba(255,255,255,0.06)_inset]">
      {/* Cyberpunk corner brackets */}
      <span className="pointer-events-none absolute left-0 top-0 z-10 h-5 w-5 border-l border-t border-white/20" />
      <span className="pointer-events-none absolute right-0 top-0 z-10 h-5 w-5 border-r border-t border-white/20" />
      <span className="pointer-events-none absolute bottom-0 left-0 z-10 h-5 w-5 border-l border-white/15" />
      <span className="pointer-events-none absolute bottom-0 right-0 z-10 h-5 w-5 border-r border-white/15" />

      {/* Banner image */}
      <Link
        to={ctaHref}
        className="relative block h-48 overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 sm:h-56"
      >
        <img
          src={bannerSrc}
          alt={bannerAlt}
          className="h-full w-full object-cover object-center brightness-[0.7] saturate-[0.7] transition duration-700 group-hover:scale-[1.03] group-hover:brightness-90 group-hover:saturate-90"
        />
        {/* Gradient fade */}
        <div className="absolute inset-0 bg-linear-to-t from-[oklch(0.055_0_0)] via-[oklch(0.055_0_0/0.35)] to-transparent" />
        {/* Scan-line */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.05] mix-blend-overlay"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.15) 2px, rgba(255,255,255,0.15) 3px)",
          }}
        />
        {/* Neon baseline */}
        <div
          className={`absolute inset-x-0 bottom-0 h-px bg-linear-to-r opacity-80 transition duration-500 group-hover:opacity-100 ${accentLine}`}
        />
        {/* Top neon line */}
        <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/25 to-transparent opacity-0 transition duration-500 group-hover:opacity-100" />

        {/* Game tag */}
        <div
          className={`absolute right-3 top-3 border px-2 py-0.5 font-tech text-label-readable uppercase backdrop-blur-md ${accentTag}`}
        >
          {tag}
        </div>
      </Link>

      {/* Card body */}
      <div className="relative flex flex-1 flex-col px-5 pb-5 pt-4">
        <div className="pointer-events-none absolute inset-0 grid-bg opacity-[0.15]" />

        <div className="relative">
          <p className="font-tech text-label-readable uppercase tracking-[0.08em] text-muted-foreground">
            {subtitle}
          </p>
          <Link
            to={ctaHref}
            className="mt-1 block font-display text-3xl tracking-display text-white leading-tight transition duration-300 hover:text-white"
          >
            {title}
          </Link>
        </div>

        <div className="relative mt-4 flex-1 border-t border-white/[0.07] pt-4">
          <p className="text-sm leading-6 text-white/50">{description}</p>
        </div>

        <Link
          to={ctaHref}
          className={`relative mt-5 clip-cta inline-flex h-11 w-full items-center justify-center gap-2 font-tech text-ui-readable uppercase transition duration-300 ${
            ctaVariant === "filled"
              ? "bg-white text-black hover:bg-white/92 border border-transparent"
              : "border border-white/25 bg-white/6 text-white backdrop-blur-sm hover:bg-white/10"
          }`}
        >
          {ctaLabel}
          <span aria-hidden className="text-sm leading-none">
            →
          </span>
        </Link>
      </div>
    </article>
  );
}
