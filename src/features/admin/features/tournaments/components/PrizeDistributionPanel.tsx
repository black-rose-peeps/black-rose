import { useEffect, useMemo, useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Panel } from "@/features/admin/components/ui";
import {
  formatPrizeDigits,
  formatPrizePool,
  parsePrizeDigits,
  parseStoredPrizePool,
  prizeDigitsToNumber,
} from "@/lib/currency";
import { DEFAULT_PRIZE_TIERS } from "@/features/tournaments/utils/tournament-placements";
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
      const remaining = Math.max(0, poolTotal - allocatedExcludingTier(id));
      amount = Math.min(amount, remaining);
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
    <Panel>
      <div className="border-b border-border px-6 py-4">
        <p className="text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground">
          Economy
        </p>
        <h2 className="font-display text-xl font-bold tracking-wider-2">Prize Distribution</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Define podium slots for this event. The bracket podium only shows these placements —
          default tiers are Champion, Runner-up, and Bronze.
        </p>
      </div>

      <div className="space-y-4 px-6 py-5">
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

        <div className="space-y-3">
          {tiers.map((tier) => (
            <div
              key={tier.id}
              className="grid gap-3 border border-border bg-card/40 p-4 md:grid-cols-[1fr_180px_auto]"
            >
              <div>
                <label className="mb-1.5 block text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground">
                  Placement label
                </label>
                <Input
                  value={tier.place}
                  onChange={(event) => updateTier(tier.id, { place: event.target.value })}
                  placeholder="Champion, Runner-up, Bronze…"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground">
                  Prize amount
                </label>
                <Input
                  value={formatPrizeDigits(parsePrizeDigits(tier.prize))}
                  onChange={(event) => updateTierPrize(tier.id, event.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="flex items-end">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  disabled={tiers.length <= 1}
                  onClick={() => removeTier(tier.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <div className="text-sm text-muted-foreground">
            <span className="font-tech text-[10px] uppercase tracking-wider-2">Allocated</span>
            <div className="font-display text-xl tracking-display">
              {allocatedTotal > 0 ? formatPrizePool(String(allocatedTotal), currency) : "—"}
              {poolTotal > 0 && (
                <span className="ml-2 text-sm text-muted-foreground">/ {tournament.prizePool}</span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2 font-tech uppercase tracking-wider"
              onClick={addTier}
            >
              <Plus className="h-4 w-4" />
              Add tier
            </Button>
            <Button
              type="button"
              size="sm"
              className="gap-2 font-tech uppercase tracking-wider"
              disabled={isSaving || !canSave}
              onClick={() => void handleSave()}
            >
              <Save className="h-4 w-4" />
              {isSaving ? "Saving…" : saved ? "Saved" : "Save distribution"}
            </Button>
          </div>
        </div>
      </div>
    </Panel>
  );
}
