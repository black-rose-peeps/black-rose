interface CommunitySectionProps {
  eyebrow: string;
  heading: string;
  description: string;
  children: React.ReactNode;
}

export function CommunitySection({
  eyebrow,
  heading,
  description,
  children,
}: CommunitySectionProps) {
  return (
    <main className="relative bg-[oklch(0.05_0_0)]">
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-30" />
      <div className="relative mx-auto max-w-7xl px-6 py-14">
        <div className="mb-10">
          <p className="font-tech text-label-readable uppercase text-muted-foreground">
            {eyebrow}
          </p>
          <h2 className="mt-1 font-display text-3xl tracking-display text-white sm:text-4xl">
            {heading}
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-7 text-muted-foreground md:text-base">
            {description}
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
      </div>
    </main>
  );
}
