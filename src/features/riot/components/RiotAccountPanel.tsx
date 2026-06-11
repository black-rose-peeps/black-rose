import { useState } from "react";
import { AlertCircle, CheckCircle, ChevronDown, Link2, Loader2, Unlink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { RiotAccount } from "@/features/member/types";
import { unlinkRiotAccount } from "@/features/riot/functions/unlink-riot-account";
import { updateRiotVisibility } from "@/features/riot/functions/update-riot-visibility";
import { isRiotRsoConfigured, startRiotOAuth } from "@/features/riot/services/riot-rso";
import { RiotOptInDisclaimer } from "./RiotOptInDisclaimer";
import { cn } from "@/lib/utils";

interface RiotAccountPanelProps {
  memberId: string;
  region?: string;
  riotAccount: RiotAccount | null;
  onRiotAccountChange?: (account: RiotAccount | null) => void;
  className?: string;
  compact?: boolean;
  /** Profile page: collapse opt-in disclaimer + consent behind a chevron toggle. */
  collapsibleOptIn?: boolean;
}

export function RiotAccountPanel({
  memberId,
  region = "",
  riotAccount,
  onRiotAccountChange,
  className,
  compact = false,
  collapsibleOptIn = false,
}: RiotAccountPanelProps) {
  const [optInOpen, setOptInOpen] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);
  const [showPublicly, setShowPublicly] = useState(riotAccount?.isPublic ?? false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isLinked = Boolean(riotAccount?.isLinked);
  const rsoReady = isRiotRsoConfigured();

  async function handleVisibilityChange(checked: boolean) {
    if (!isLinked) {
      setShowPublicly(checked);
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const { riotAccount: updated } = await updateRiotVisibility({
        data: { memberId, isPublic: checked },
      });
      setShowPublicly(updated.isPublic ?? false);
      onRiotAccountChange?.(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update visibility.");
    } finally {
      setBusy(false);
    }
  }

  function handleLink() {
    if (!consentChecked) {
      setError("Please confirm you understand the Riot data opt-in policy.");
      return;
    }

    setError(null);
    startRiotOAuth({
      memberId,
      isPublic: showPublicly,
      region,
    });
  }

  async function handleUnlink() {
    setBusy(true);
    setError(null);
    try {
      await unlinkRiotAccount({ data: { memberId } });
      setConsentChecked(false);
      setShowPublicly(false);
      onRiotAccountChange?.(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not unlink Riot account.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div className="flex items-center gap-3">
        {isLinked ? (
          <>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-emerald-400/20 bg-emerald-400/5">
              <CheckCircle className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-medium">
                {riotAccount!.gameName}#{riotAccount!.tagline}
              </p>
              {riotAccount?.region ? (
                <p className="text-xs text-muted-foreground">{riotAccount.region}</p>
              ) : null}
            </div>
          </>
        ) : (
          <>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-amber-400/20 bg-amber-400/5">
              <AlertCircle className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Not linked</p>
              <p className="text-xs text-muted-foreground/60">
                Required for Valorant tournaments
              </p>
            </div>
          </>
        )}
      </div>

      {!isLinked && collapsibleOptIn && (
        <Collapsible open={optInOpen} onOpenChange={setOptInOpen}>
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center justify-between gap-3 border border-amber-400/20 bg-amber-400/5 px-4 py-3 text-left transition-colors hover:bg-amber-400/10"
              aria-expanded={optInOpen}
            >
              <span className="font-tech text-[10px] uppercase tracking-wider-2 text-amber-300/90">
                Riot data opt-in
              </span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 shrink-0 text-amber-300/70 transition-transform duration-200",
                  optInOpen && "rotate-180",
                )}
                aria-hidden
              />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3 space-y-4 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0">
            <RiotOptInDisclaimer hideTitle />
            <div className="flex items-start gap-3">
              <Checkbox
                id={`riot-consent-${memberId}`}
                checked={consentChecked}
                onCheckedChange={(checked) => setConsentChecked(checked === true)}
                disabled={!rsoReady || busy}
              />
              <Label
                htmlFor={`riot-consent-${memberId}`}
                className="cursor-pointer text-xs leading-relaxed text-muted-foreground"
              >
                I understand that linking my Riot account opts me in to data sharing with Black Rose
                as described above.
              </Label>
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {!isLinked && !collapsibleOptIn && <RiotOptInDisclaimer compact={compact} />}

      {!isLinked && (
        <div className="space-y-4">
          {!collapsibleOptIn && (
            <div className="flex items-start gap-3">
              <Checkbox
                id={`riot-consent-${memberId}`}
                checked={consentChecked}
                onCheckedChange={(checked) => setConsentChecked(checked === true)}
                disabled={!rsoReady || busy}
              />
              <Label
                htmlFor={`riot-consent-${memberId}`}
                className="cursor-pointer text-xs leading-relaxed text-muted-foreground"
              >
                I understand that linking my Riot account opts me in to data sharing with Black Rose
                as described above.
              </Label>
            </div>
          )}

          <div className="flex items-center justify-between gap-4 border border-white/6 bg-white/[0.02] px-4 py-3">
            <div>
              <p className="text-sm font-medium">Show Riot ID on public profile</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Other members can see your game name and tag when enabled.
              </p>
            </div>
            <Switch
              checked={showPublicly}
              onCheckedChange={(checked) => void handleVisibilityChange(checked)}
              disabled={busy}
            />
          </div>
        </div>
      )}

      {isLinked && (
        <div className="flex items-center justify-between gap-4 border border-white/6 bg-white/[0.02] px-4 py-3">
          <div>
            <p className="text-sm font-medium">Show Riot ID on public profile</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {showPublicly
                ? "Your Riot ID is visible on your member profile."
                : "Only you and admins can see your linked Riot account."}
            </p>
          </div>
          <Switch
            checked={showPublicly}
            onCheckedChange={(checked) => void handleVisibilityChange(checked)}
            disabled={busy}
          />
        </div>
      )}

      {!rsoReady && (
        <p className="text-xs text-amber-400/90">
          Riot linking is not configured. Set VITE_RIOT_RSO_CLIENT_ID and server-side Riot secrets in
          your environment.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {isLinked ? (
          <Button
            type="button"
            variant="outline"
            disabled={busy || !rsoReady}
            onClick={() => void handleUnlink()}
            className="rounded-none border-white/10 font-tech text-[10px] uppercase tracking-wider-2"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Unlink className="h-3.5 w-3.5" />}
            Unlink
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            disabled={busy || !rsoReady || !consentChecked}
            onClick={handleLink}
            className="rounded-none border-white/10 font-tech text-[10px] uppercase tracking-wider-2"
          >
            <Link2 className="h-3.5 w-3.5" />
            Link Riot Account
          </Button>
        )}
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
