import { Link } from "@tanstack/react-router";
import { CheckCircle2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { DashboardSection } from "@/features/member/components/DashboardSection";
import {
  isProfileComplete,
  profileCompletionHint,
} from "@/features/member/utils/profile-completion";
import { cn } from "@/lib/utils";

interface ProfileCompletionPanelProps {
  completion: number;
}

export function ProfileCompletionPanel({ completion }: ProfileCompletionPanelProps) {
  const complete = isProfileComplete(completion);

  return (
    <DashboardSection
      label="Profile"
      title={complete ? "Arena Ready" : "Completion"}
      action={
        complete ? (
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="h-auto rounded-none p-0 font-tech text-label-readable uppercase text-emerald-400/90 hover:bg-transparent hover:text-emerald-300"
          >
            <Link to="/dashboard/profile" search={{ tab: "identity" }}>
              View →
            </Link>
          </Button>
        ) : (
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="h-auto rounded-none p-0 font-tech text-label-readable uppercase text-muted-foreground hover:bg-transparent hover:text-foreground"
          >
            <Link to="/dashboard/profile" search={{ tab: "identity" }}>
              Edit →
            </Link>
          </Button>
        )
      }
      className={cn(
        complete &&
          "relative overflow-hidden border-emerald-400/20 bg-emerald-400/[0.03] shadow-[inset_0_1px_0_rgba(52,211,153,0.08)]",
      )}
    >
      {complete && (
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/40 to-transparent"
          aria-hidden={true}
        />
      )}

      <div className="mb-3 flex items-end justify-between gap-3">
        {complete ? (
          <div className="flex items-center gap-2.5">
            <span className="grid h-10 w-10 shrink-0 place-items-center border border-emerald-400/25 bg-emerald-400/10 text-emerald-300">
              <CheckCircle2 className="h-5 w-5" aria-hidden={true} />
            </span>
            <div>
              <span className="font-display text-3xl tracking-display text-emerald-100">100%</span>
              <p className="font-tech text-[10px] uppercase tracking-wider text-emerald-400/80">
                Complete
              </p>
            </div>
          </div>
        ) : (
          <>
            <span className="font-display text-4xl tracking-display">{completion}%</span>
            <span className="mb-1 text-xs text-muted-foreground">Complete</span>
          </>
        )}
      </div>

      <Progress
        value={completion}
        className={cn(
          "mb-4 h-1 rounded-none bg-white/10 [&>div]:rounded-none",
          complete ? "[&>div]:bg-emerald-400" : "[&>div]:bg-white",
        )}
      />

      <p
        className={cn(
          "text-xs leading-relaxed",
          complete ? "text-emerald-200/70" : "text-muted-foreground",
        )}
      >
        {complete && (
          <Sparkles className="mr-1 inline h-3 w-3 -translate-y-px text-emerald-400/80" aria-hidden={true} />
        )}
        {profileCompletionHint(completion)}
      </p>
    </DashboardSection>
  );
}
