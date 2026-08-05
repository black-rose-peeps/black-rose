import { Link } from "@tanstack/react-router";
import { Emblem } from "@/features/shared/components/Emblem";

const SOCIAL_LINKS = [
  {
    name: "Facebook Page",
    href: "https://www.facebook.com/BlackRoseHQ",
    icon: "/facebook-tile.svg",
  },
  {
    name: "Facebook Group",
    href: "https://www.facebook.com/share/g/19Cb1nZZQY/",
    icon: "/facebook-tile.svg",
  },
  {
    name: "YouTube",
    href: "https://www.youtube.com/@BlackRoseAsia",
    icon: "/youtube-tile.svg",
  },
  {
    name: "Instagram",
    href: "https://www.instagram.com/blackrose.asia",
    icon: "/instagram-icon.svg",
  },
];

export function CtaBand() {
  return (
    <section className="relative overflow-hidden border-y border-white/6 bg-[oklch(0.07_0_0)] py-24 md:py-32">
      {/* Grid texture */}
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-50" />
      {/* Central radial spotlight */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_50%,rgba(255,255,255,0.05),transparent)]" />
      {/* Top and bottom edge fades */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/15 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-linear-to-r from-transparent via-white/10 to-transparent" />

      {/* Decorative spinning emblems */}
      <Emblem
        spin
        className="pointer-events-none absolute -right-32 -top-32 h-112 w-md opacity-[0.07]"
      />
      <Emblem
        spin
        className="pointer-events-none absolute -bottom-40 -left-32 h-96 w-[24rem] opacity-[0.05]"
      />

      <div className="relative mx-auto max-w-4xl px-6 text-center">
        <h2 className="font-display text-5xl leading-[0.95] tracking-display md:text-7xl">
          Your name. <br />
          <span className="text-stroke">Etched in black.</span>
        </h2>

        <p className="mx-auto mt-6 max-w-xl text-base leading-7 text-muted-foreground md:text-lg">
          Connect with the Black Rose community across all platforms. Stay updated on tournaments,
          events, and the competitive scene.
        </p>

        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {SOCIAL_LINKS.map((social) => (
            <a
              key={social.name}
              href={social.href}
              target="_blank"
              rel="noopener noreferrer"
              className="clip-cta group relative inline-flex flex-col items-center gap-3 border border-white/10 bg-white/4 px-6 py-6 transition hover:border-white/20 hover:bg-white/8"
            >
              <div className="relative">
                <img
                  src={social.icon}
                  alt={social.name}
                  className="h-8 w-8 opacity-70 transition group-hover:opacity-100"
                />
                <div className="absolute inset-0 bg-white/0 transition group-hover:bg-white/10" />
              </div>
              <span className="font-tech text-[10px] uppercase tracking-wider-2 text-muted-foreground transition group-hover:text-foreground">
                {social.name}
              </span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
