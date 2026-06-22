import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

interface WaitlistStepDetailsProps {
  label?: string;
  children: ReactNode;
}

export function WaitlistStepDetails({ label = "How this works", children }: WaitlistStepDetailsProps) {
  return (
    <Collapsible className="mt-2.5">
      <CollapsibleTrigger className="group inline-flex items-center gap-1.5 font-tech text-[10px] uppercase tracking-wider-2 text-muted-foreground transition hover:text-foreground">
        <ChevronDown
          className={cn("h-3 w-3 shrink-0 transition-transform group-data-[state=open]:rotate-180")}
        />
        {label}
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2 space-y-2 text-xs leading-relaxed text-muted-foreground">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}
