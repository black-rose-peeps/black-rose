import { FileDown } from "lucide-react";
import { Emblem } from "@/features/shared/components/Emblem";
import { rulesFileDisplayName } from "../../utils/rules-file-display";

interface OfficialRulesetBannerProps {
  rulesUrl: string;
}

const RULE_TOPICS = ["Match flow", "Map veto", "Pauses", "Roster lock", "Conduct"] as const;

export function OfficialRulesetBanner({ rulesUrl }: OfficialRulesetBannerProps) {
  const fileName = rulesFileDisplayName(rulesUrl);

  return (
    <div className="relative overflow-hidden clip-angle-lg border border-white/8 bg-[oklch(0.06_0_0)]">
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-35" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_70%_at_0%_0%,rgba(255,255,255,0.05),transparent_55%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/12 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-linear-to-r from-transparent via-white/6 to-transparent" />

      <div className="pointer-events-none absolute left-3 top-3 hidden h-8 w-8 border-l border-t border-white/10 sm:block" />
      <div className="pointer-events-none absolute bottom-3 right-3 hidden h-8 w-8 border-r border-b border-white/10 sm:block" />

      <Emblem className="pointer-events-none absolute -right-16 -top-20 h-56 w-44 opacity-[0.045]" />
      <Emblem
        spin
        className="pointer-events-none absolute -bottom-24 -left-20 h-48 w-40 opacity-[0.03]"
      />

      <div className="relative flex flex-col gap-6 p-5 sm:p-6 md:flex-row md:items-center md:justify-between md:gap-8">
        <div className="min-w-0 flex-1">
          <div className="inline-flex items-center gap-2.5 border border-white/10 bg-white/3 px-3 py-1 font-tech text-label-readable uppercase text-muted-foreground backdrop-blur-sm">
            <span className="h-1.5 w-1.5 shrink-0 bg-foreground/60 animate-pulse-soft" />
            Official Ruleset
          </div>

          <h2 className="mt-4 font-display text-2xl leading-tight tracking-display sm:text-3xl">
            The binding <span className="text-stroke">rulebook.</span>
          </h2>

          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-[15px] sm:leading-7">
            This tournament ships with a full rules document. When anything below differs, follow
            the official file — it covers match process, eligibility, and penalties.
          </p>

          <ul className="mt-4 flex flex-wrap gap-2">
            {RULE_TOPICS.map((topic) => (
              <li
                key={topic}
                className="border border-white/8 bg-white/3 px-2.5 py-1 font-tech text-[10px] uppercase tracking-wider text-foreground/70"
              >
                {topic}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-start md:items-end md:text-right">
          <a
            href={rulesUrl}
            target="_blank"
            rel="noopener noreferrer"
            download={fileName}
            className="clip-cta inline-flex min-h-12 items-center justify-center gap-2.5 bg-white px-6 font-tech text-ui-readable uppercase text-black transition hover:bg-white/90"
          >
            <FileDown className="h-4 w-4" strokeWidth={1.75} />
            Download ruleset
          </a>
          <p className="max-w-[220px] truncate font-tech text-[10px] uppercase tracking-wider text-muted-foreground/70 md:max-w-[200px]">
            {fileName}
          </p>
        </div>
      </div>
    </div>
  );
}
