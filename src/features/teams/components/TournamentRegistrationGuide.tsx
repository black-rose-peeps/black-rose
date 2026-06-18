import registrationGuideImg from "@/assets/Tournament-registration-process-instructions.png";
import { cn } from "@/lib/utils";

const GUIDE_ALT =
  "Tournament registration process: complete your website profile, create a team and invite members, browse and register your team, wait for admin approval, then your team appears on the tournament public page.";

interface TournamentRegistrationGuideProps {
  className?: string;
}

/** Visual walkthrough of profile → team → tournament registration → approval. */
export function TournamentRegistrationGuide({ className }: TournamentRegistrationGuideProps) {
  return (
    <div className={cn("clip-angle-lg overflow-hidden border border-white/10 bg-black", className)}>
      <img src={registrationGuideImg} alt={GUIDE_ALT} className="h-auto w-full" />
    </div>
  );
}
