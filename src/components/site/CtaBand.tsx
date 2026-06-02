import { Emblem } from "./Emblem";

export function CtaBand() {
  return (
    <section className="relative overflow-hidden border-y border-border bg-card py-24 md:py-32">
      <Emblem
        spin
        className="pointer-events-none absolute -right-32 -top-32 h-[28rem] w-[28rem] opacity-[0.06]"
      />
      <Emblem
        spin
        className="pointer-events-none absolute -bottom-40 -left-32 h-[24rem] w-[24rem] opacity-[0.05]"
      />
      <div className="relative mx-auto max-w-4xl px-6 text-center">
        <div className="mb-6 inline-flex items-center gap-3 border border-border px-4 py-1.5 text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground">
          <span className="h-1.5 w-1.5 bg-foreground animate-pulse-soft" />
          Registration Open — Season 01
        </div>
        <h2 className="font-display text-5xl leading-[0.95] tracking-display md:text-7xl">
          Your name. <br />
          <span className="text-stroke">Etched in black.</span>
        </h2>
        <p className="mx-auto mt-6 max-w-xl text-sm text-muted-foreground md:text-base">
          Build your team, claim your bracket, and step into the arena. Black Rose runs the
          competition — you write the history.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <button className="clip-cta inline-flex h-12 items-center gap-3 bg-foreground px-8 font-tech text-sm uppercase tracking-wider-2 text-background hover:bg-foreground/90 transition">
            Create Account
            <span aria-hidden>→</span>
          </button>
          <button className="clip-cta inline-flex h-12 items-center gap-3 border border-border px-8 font-tech text-sm uppercase tracking-wider-2 hover:bg-secondary transition">
            Browse Tournaments
          </button>
        </div>
      </div>
    </section>
  );
}
