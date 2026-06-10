import { GUILD_CODE_VALUES } from "../constants/guild-code";

export function GuildCodeGrid() {
  return (
    <div className="grid gap-px bg-white/5 sm:grid-cols-2 xl:grid-cols-3">
      {GUILD_CODE_VALUES.map((value) => (
        <article
          key={value.number}
          className="group relative flex flex-col gap-5 overflow-hidden bg-[oklch(0.055_0_0)] p-8 transition duration-500 hover:bg-[oklch(0.08_0_0)]"
        >
          <span className="pointer-events-none absolute left-0 top-0 h-4 w-4 border-l border-t border-white/20" />
          <span className="pointer-events-none absolute right-0 top-0 h-4 w-4 border-r border-t border-white/20" />
          <span className="pointer-events-none absolute bottom-0 left-0 h-4 w-4 border-b border-l border-white/15" />
          <span className="pointer-events-none absolute bottom-0 right-0 h-4 w-4 border-b border-r border-white/15" />

          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/15 to-transparent opacity-0 transition duration-500 group-hover:opacity-100" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-linear-to-r from-[#ff4655]/40 via-white/10 to-transparent opacity-60 transition duration-500 group-hover:opacity-100" />

          <div className="flex items-start justify-between gap-4">
            <span className="font-display text-4xl tracking-display text-white/20 transition duration-300 group-hover:text-white/55">
              {String(value.number).padStart(2, "0")}
            </span>
            <span className="mt-2 h-px w-10 bg-white/10 transition-all duration-300 group-hover:w-14 group-hover:bg-white/30" />
          </div>

          <h3 className="font-display text-xl leading-tight tracking-[0.04em] text-white md:text-2xl">
            {value.title}
          </h3>
          <p className="text-sm leading-relaxed text-muted-foreground">{value.body}</p>

          <div className="mt-auto font-tech text-[8px] uppercase tracking-[0.2em] text-white/30">
            Guild Code · {String(value.number).padStart(2, "0")}
          </div>
        </article>
      ))}
    </div>
  );
}
