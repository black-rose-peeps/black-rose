import { StaffDiscordContact } from "@/features/shared/components/StaffDiscordContact";
import type { RuleSection } from "../../types";

interface RulesTabProps {
  rules: RuleSection[];
  format: string;
}

export function RulesTab({ rules, format }: RulesTabProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="flex flex-col gap-5 lg:col-span-2">
        {format && (
          <p className="font-tech text-label-readable uppercase text-muted-foreground">
            Rules for <span className="text-foreground">{format}</span>
          </p>
        )}
        {rules.length === 0 ? (
          <div className="border border-white/8 bg-[oklch(0.07_0_0)] px-5 py-12 text-center text-sm text-muted-foreground">
            Tournament rules will be posted soon.
          </div>
        ) : (
          rules.map((section) => (
            <div key={section.title} className="border border-white/8 bg-[oklch(0.07_0_0)]">
              <div className="border-b border-white/8 px-5 py-4">
                <h3 className="text-[11px] font-tech uppercase tracking-wider-2 text-foreground">
                  {section.title}
                </h3>
              </div>
              <ul className="divide-y divide-white/5 px-5">
                {section.items.map((item, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-3 py-3.5 text-sm text-muted-foreground"
                  >
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-white/20" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </div>

      <div className="flex flex-col gap-5">
        <div className="border border-white/8 bg-[oklch(0.07_0_0)] p-5">
          <h3 className="text-[11px] font-tech uppercase tracking-wider-2 text-foreground">
            Disputes & Contact
          </h3>
          <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
            All rule disputes must be submitted to tournament staff within 10 minutes of the match
            ending on the Black Rose official Discord server. Staff decisions are final. Attach
            evidence when applicable.
          </p>
          <div className="mt-5 border-t border-white/8 pt-4">
            <div className="font-tech text-label-readable uppercase text-muted-foreground">
              Staff Contact
            </div>
            <StaffDiscordContact className="mt-2" />
          </div>
        </div>

        <div className="border border-white/8 bg-[oklch(0.07_0_0)] p-5">
          <h3 className="text-[11px] font-tech uppercase tracking-wider-2 text-foreground">
            Sportsmanship
          </h3>
          <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
            Black Rose tournaments are built on competitive integrity. Harassment, cheating, and
            unsportsmanlike conduct will result in disqualification and a ban from future events.
          </p>
        </div>
      </div>
    </div>
  );
}
