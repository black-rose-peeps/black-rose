import { Link } from "@tanstack/react-router";
import { Emblem } from "@/features/shared/components/Emblem";
import { DISCORD_SERVER_INVITE } from "@/features/auth/constants";

type FooterRouteLink = {
  label: string;
  to: string;
  hash?: string;
  search?: Record<string, unknown>;
};

type FooterExternalLink = {
  label: string;
  href: string;
};

type FooterLink = FooterRouteLink | FooterExternalLink;

function isExternalLink(link: FooterLink): link is FooterExternalLink {
  return "href" in link;
}

function FooterLinkItem({ link }: { link: FooterLink }) {
  if (isExternalLink(link)) {
    return (
      <a
        href={link.href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-muted-foreground transition-colors hover:text-foreground"
      >
        {link.label}
      </a>
    );
  }

  return (
    <Link
      to={link.to}
      {...(link.hash ? { hash: link.hash } : {})}
      {...(link.search ? { search: link.search } : {})}
      className="text-muted-foreground transition-colors hover:text-foreground"
    >
      {link.label}
    </Link>
  );
}

const FOOTER_NAV: { title: string; links: FooterLink[] }[] = [
  {
    title: "Explore",
    links: [
      { label: "Tournaments", to: "/tournaments" },
      { label: "Hall of Champions", to: "/champions" },
      { label: "Community", to: "/community" },
      { label: "Open Events", to: "/", hash: "tournaments" },
    ],
  },
  {
    title: "Member",
    links: [
      { label: "Join Black Rose", to: "/login" },
      { label: "Dashboard", to: "/dashboard" },
      { label: "My Teams", to: "/teams", search: { create: false } },
      { label: "My Profile", to: "/dashboard/profile" },
    ],
  },
  {
    title: "Connect",
    links: [
      { label: "Guild Code of Values", to: "/community" },
      { label: "Why Black Rose", to: "/", hash: "why-black-rose" },
      { label: "Discord Server", href: DISCORD_SERVER_INVITE },
    ],
  },
];

export function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-white/6 bg-[oklch(0.04_0_0)]">
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-30" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/10 to-transparent" />

      <div className="relative mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))]">
          <div>
            <Link to="/" className="inline-flex items-center gap-3 transition-opacity hover:opacity-90">
              <Emblem className="h-10 w-10 opacity-80" />
              <span className="font-display text-2xl tracking-wider-2">BLACK ROSE</span>
            </Link>
            <p className="mt-6 max-w-sm text-sm leading-relaxed text-muted-foreground">
              The official home of community esports. Tournament organization, bracket management,
              and competitive integrity — built for players, by players.
            </p>
          </div>

          {FOOTER_NAV.map((column) => (
            <nav key={column.title} aria-label={`${column.title} links`}>
              <div className="text-[10px] font-tech uppercase tracking-wider-2 text-white/30">
                {column.title}
              </div>
              <ul className="mt-4 space-y-3 text-sm">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <FooterLinkItem link={link} />
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-16 flex flex-col items-start justify-between gap-4 border-t border-white/6 pt-8 text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground/60 md:flex-row md:items-center">
          <span>© 2026 Black Rose Esports. All rights reserved.</span>
          <span>Rise as One.</span>
        </div>
      </div>
    </footer>
  );
}
