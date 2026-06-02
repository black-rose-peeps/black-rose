import { createFileRoute, Link } from "@tanstack/react-router";
import { Emblem } from "@/features/shared/components/Emblem";

export const Route = createFileRoute("/unauthorized")({
  head: () => ({
    meta: [{ title: "Access Denied — Black Rose" }],
  }),
  component: UnauthorizedPage,
});

function UnauthorizedPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-6">
      <div className="absolute inset-0 grid-bg opacity-50" />
      <div className="absolute inset-0 radial-fade" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-[520px] w-[520px] opacity-[0.05]">
        <Emblem className="h-full w-full" spin />
      </div>

      <div className="relative z-10 max-w-lg text-center">
        <div className="mb-5 inline-flex items-center gap-3 text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground">
          <span className="h-px w-10 bg-border" />
          Error 403
          <span className="h-px w-10 bg-border" />
        </div>
        <h1 className="font-display text-6xl tracking-display sm:text-7xl">Access Denied</h1>
        <p className="mx-auto mt-4 max-w-sm text-sm text-muted-foreground">
          You do not have the clearance to enter the Black Rose operations console. This area is
          reserved for tournament administrators.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            to="/"
            className="clip-cta inline-flex h-11 items-center bg-foreground px-6 text-xs font-tech uppercase tracking-wider-2 text-background transition hover:bg-foreground/90"
          >
            Return Home
          </Link>
          <Link
            to="/login"
            className="inline-flex h-11 items-center border border-border bg-secondary px-6 text-xs font-tech uppercase tracking-wider-2 text-foreground transition hover:border-foreground/60 hover:bg-accent"
          >
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
