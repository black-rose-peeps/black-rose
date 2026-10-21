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
  onViewComplete?: () => void;
}

export function ProfileCompletionPanel({
  completion,
  onViewComplete,
}: ProfileCompletionPanelProps) {
  const complete = isProfileComplete(completion);

  const actionClass =
    "min-h-11 rounded-none px-0 font-tech text-label-readable uppercase text-muted-foreground hover:bg-transparent hover:text-foreground";

  return (
    <DashboardSection
      label="Profile"
      title={complete ? "Arena Ready" : "Completion"}
      className={cn(
        complete &&
          "relative overflow-hidden border-emerald-400/20 bg-emerald-400/[0.03] shadow-[inset_0_1px_0_rgba(52,211,153,0.08)]",
      )}
      action={
        complete && onViewComplete ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={actionClass}
            onClick={onViewComplete}
          >
            View →
          </Button>
        ) : (
          <Button asChild variant="ghost" size="sm" className={actionClass}>
            <Link to="/dashboard/profile" search={{ tab: "identity" }}>
              {complete ? "View →" : "Edit →"}
            </Link>
          </Button>
        )
      }
    >
      <div className="mb-3 flex items-end justify-between gap-3">
        {complete ? (
          <div className="flex items-center gap-2.5">
            <span className="grid h-10 w-10 shrink-0 place-items-center border border-emerald-400/25 bg-emerald-400/10 text-emerald-300">
              <CheckCircle2 className="h-5 w-5" aria-hidden />
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
        aria-label="Profile completion"
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
          <Sparkles
            className="mr-1 inline h-3 w-3 -translate-y-px text-emerald-400/80"
            aria-hidden
          />
        )}
        {profileCompletionHint(completion)}
      </p>
    </DashboardSection>
  );
}
