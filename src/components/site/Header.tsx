import { Link } from "@tanstack/react-router";
import { Emblem } from "./Emblem";

const nav = [
  { label: "Tournaments", href: "/" },
  { label: "Teams", href: "/" },
  { label: "Champions", href: "/" },
  { label: "Community", href: "/" },
];

export function Header() {
  return (
    <header className="fixed top-0 inset-x-0 z-50 border-b border-border/60 bg-background/70 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-3">
          <Emblem className="h-8 w-8" />
          <span className="font-display text-xl tracking-wider-2">BLACK ROSE</span>
        </Link>
        <nav className="hidden md:flex items-center gap-10 text-xs font-tech uppercase tracking-wider-2 text-muted-foreground">
          {nav.map((n) => (
            <Link key={n.label} to={n.href} className="hover:text-foreground transition-colors">
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <Link
            to="/login"
            className="hidden sm:inline-flex h-9 items-center px-4 text-xs font-tech uppercase tracking-wider-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            Sign In
          </Link>
          <Link
            to="/register"
            className="clip-cta inline-flex h-9 items-center bg-foreground px-5 text-xs font-tech uppercase tracking-wider-2 text-background hover:bg-foreground/90 transition"
          >
            Register
          </Link>
        </div>
      </div>
    </header>
  );
}
