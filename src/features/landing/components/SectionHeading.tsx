export function SectionHeading({
  eyebrow,
  title,
  description,
  className = "",
}: {
  eyebrow: string;
  title: string;
  description?: string;
  className?: string;
}) {
  return (
    <div className={`mb-14 flex flex-col gap-4 ${className}`}>
      <div className="flex items-center gap-3 text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground">
        <span className="h-px w-10 bg-border" />
        {eyebrow}
      </div>
      <h2 className="font-display text-4xl tracking-display sm:text-5xl md:text-6xl">{title}</h2>
      {description && (
        <p className="max-w-xl text-sm text-muted-foreground md:text-base">{description}</p>
      )}
    </div>
  );
}
