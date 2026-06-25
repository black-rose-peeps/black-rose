import { useEffect, useMemo, useState } from "react";
import { Coins, Plus, Save, Trash2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  formatPrizeDigits,
  formatPrizePool,
  parsePrizeDigits,
  parseStoredPrizePool,
  prizeDigitsToNumber,
} from "@/lib/currency";
import { DEFAULT_PRIZE_TIERS } from "@/features/tournaments/utils/tournament-placements";
import { FeaturePanelShell } from "@/features/shared/components/FeaturePanelShell";
import { cn } from "@/lib/utils";
import { updateTournamentPrizeBreakdown } from "../services/tournaments.service";
import type { MockTournament } from "@/lib/mock-data";

interface EditableTier {
  id: string;
  place: string;
  prize: string;
}

interface PrizeDistributionPanelProps {
  tournament: MockTournament;
  onUpdated?: (tournament: MockTournament) => void;
}

function newTierId(): string {
  return `tier-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function toEditableTiers(tiers: { place: string; prize: string }[]): EditableTier[] {
  return tiers.map((tier) => ({
    id: newTierId(),
    place: tier.place,
    prize: tier.prize,
  }));
}

function fromEditableTiers(tiers: EditableTier[]) {
  return tiers.map((tier) => ({
    place: tier.place.trim(),
    prize: tier.prize.trim(),
  }));
}

export function PrizeDistributionPanel({ tournament, onUpdated }: PrizeDistributionPanelProps) {
  const { currency } = useMemo(
    () => parseStoredPrizePool(tournament.prizePool),
    [tournament.prizePool],
  );
  const poolDigits = useMemo(
    () => parsePrizeDigits(parseStoredPrizePool(tournament.prizePool).digits),
    [tournament.prizePool],
  );
  const poolTotal = prizeDigitsToNumber(poolDigits);

  const [tiers, setTiers] = useState<EditableTier[]>(() =>
    toEditableTiers(
      tournament.prizeBreakdown?.length ? tournament.prizeBreakdown : DEFAULT_PRIZE_TIERS,
    ),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setTiers(
      toEditableTiers(
        tournament.prizeBreakdown?.length ? tournament.prizeBreakdown : DEFAULT_PRIZE_TIERS,
      ),
    );
  }, [tournament.id]);

  const allocatedTotal = tiers.reduce(
    (sum, tier) => sum + prizeDigitsToNumber(parsePrizeDigits(tier.prize)),
    0,
  );
  const overAllocated = poolTotal > 0 && allocatedTotal > poolTotal;
  const canSave = !overAllocated && tiers.some((tier) => tier.place.trim() || tier.prize.trim());
  const remaining =
    poolTotal > 0 ? Math.max(0, poolTotal - allocatedTotal) : null;

  function allocatedExcludingTier(id: string): number {
    return tiers
      .filter((tier) => tier.id !== id)
      .reduce((sum, tier) => sum + prizeDigitsToNumber(parsePrizeDigits(tier.prize)), 0);
  }

  function updateTier(id: string, patch: Partial<Pick<EditableTier, "place" | "prize">>) {
    setTiers((current) => current.map((tier) => (tier.id === id ? { ...tier, ...patch } : tier)));
    setSaved(false);
  }

  function updateTierPrize(id: string, raw: string) {
    const digits = parsePrizeDigits(raw);
    let amount = prizeDigitsToNumber(digits);
    if (poolTotal > 0) {
      const remainingForTier = Math.max(0, poolTotal - allocatedExcludingTier(id));
      amount = Math.min(amount, remainingForTier);
    }
    updateTier(id, {
      prize: amount > 0 ? formatPrizePool(String(amount), currency) : "",
    });
  }

  function addTier() {
    setTiers((current) => [...current, { id: newTierId(), place: "Placement", prize: "" }]);
    setSaved(false);
  }

  function removeTier(id: string) {
    setTiers((current) => current.filter((tier) => tier.id !== id));
    setSaved(false);
  }

  async function handleSave() {
    if (poolTotal > 0 && allocatedTotal > poolTotal) {
      setError("Total prize allocation cannot exceed the tournament prize pool.");
      return;
    }

    setIsSaving(true);
    setError(null);
    setSaved(false);
    try {
      const cleaned = fromEditableTiers(tiers).filter((tier) => tier.place || tier.prize);
      const updated = await updateTournamentPrizeBreakdown(tournament.id, cleaned);
      onUpdated?.(updated);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save prize distribution.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <FeaturePanelShell
      unified
      eyebrow="Admin Console · Economy"
      title="Prize Distribution"
      subtitle="Define podium slots for this event. The bracket podium only shows these placements — default tiers are Champion, Runner-up, and 3rd Place."
      stats={[
        { label: "Pool", value: tournament.prizePool || "—", accent: true },
        { label: "Allocated", value: allocatedTotal > 0 ? formatPrizePool(String(allocatedTotal), currency) : "—" },
        { label: "Tiers", value: tiers.length },
        ...(remaining !== null ? [{ label: "Remaining", value: formatPrizePool(String(remaining), currency) }] : []),
      ]}
      headerExtra={
        overAllocated ? (
          <span className="inline-flex items-center border border-red-400/35 bg-red-400/10 px-2.5 py-1 font-tech text-[9px] uppercase tracking-wider text-red-300">
            Over allocated
          </span>
        ) : saved ? (
          <span className="inline-flex items-center border border-emerald-400/35 bg-emerald-400/10 px-2.5 py-1 font-tech text-[9px] uppercase tracking-wider text-emerald-300">
            Saved
          </span>
        ) : null
      }
      contentClassName="bg-[oklch(0.06_0_0)]"
    >
      <div className="space-y-4 px-4 py-5 sm:px-6">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {overAllocated && (
          <Alert variant="destructive">
            <AlertDescription>
              Allocated {formatPrizePool(String(allocatedTotal), currency)} exceeds the pool total
              of {tournament.prizePool}. Reduce tier amounts before saving.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex items-center gap-2 border-b border-white/[0.06] pb-3 font-tech text-[10px] uppercase tracking-[0.18em] text-white/45">
          <Coins className="h-3.5 w-3.5" />
          Prize tiers
        </div>

        <div className="space-y-3">
          {tiers.map((tier, index) => (
            <div
              key={tier.id}
              className="grid gap-3 border border-white/[0.08] bg-[oklch(0.05_0_0)] p-4 md:grid-cols-[1fr_180px_auto]"
            >
              <div className="flex items-start gap-3 md:col-span-1">
                <span className="mt-2 font-mono text-xs tabular-nums text-white/30">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0 flex-1">
                  <label className="mb-1.5 block font-tech text-[10px] uppercase tracking-[0.18em] text-white/40">
                    Placement label
                  </label>
                  <Input
                    value={tier.place}
                    onChange={(event) => updateTier(tier.id, { place: event.target.value })}
                    placeholder="Champion, Runner-up, 3rd Place…"
                    className="border-white/10 bg-white/[0.03]"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block font-tech text-[10px] uppercase tracking-[0.18em] text-white/40">
                  Prize amount
                </label>
                <Input
                  value={formatPrizeDigits(parsePrizeDigits(tier.prize))}
                  onChange={(event) => updateTierPrize(tier.id, event.target.value)}
                  placeholder="0"
                  className="border-white/10 bg-white/[0.03] font-mono"
                />
              </div>
              <div className="flex items-end">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="shrink-0 border-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:text-red-300"
                  disabled={tiers.length <= 1}
                  onClick={() => removeTier(tier.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-4">
          <div className="text-sm text-white/45">
            <span className="font-tech text-[10px] uppercase tracking-[0.18em]">Allocated total</span>
            <div className="font-display text-xl tracking-display text-white">
              {allocatedTotal > 0 ? formatPrizePool(String(allocatedTotal), currency) : "—"}
              {poolTotal > 0 && (
                <span className="ml-2 text-sm text-white/40">/ {tournament.prizePool}</span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2 border-white/10 bg-white/[0.02] font-tech uppercase tracking-wider hover:bg-white/[0.05]"
              onClick={addTier}
            >
              <Plus className="h-4 w-4" />
              Add tier
            </Button>
            <Button
              type="button"
              size="sm"
              className={cn(
                "gap-2 font-tech uppercase tracking-wider",
                saved && "border-emerald-400/40 bg-emerald-950/30",
              )}
              disabled={isSaving || !canSave}
              onClick={() => void handleSave()}
            >
              <Save className="h-4 w-4" />
              {isSaving ? "Saving…" : saved ? "Saved" : "Save distribution"}
            </Button>
          </div>
        </div>
      </div>
    </FeaturePanelShell>
  );
}
