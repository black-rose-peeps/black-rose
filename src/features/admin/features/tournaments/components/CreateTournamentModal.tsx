import { useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AdminDatePicker } from "@/features/admin/components/AdminDatePicker";
import { PrizePoolInput } from "@/features/admin/components/PrizePoolInput";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TOURNAMENT_FORMATS } from "@/features/tournaments/constants/formats";
import {
  ADMIN_TOURNAMENT_STATUSES,
  DEFAULT_CREATE_TOURNAMENT_FORM,
  TOURNAMENT_GAMES,
  TOURNAMENT_REGIONS,
} from "../constants";
import {
  registrationCapLabel,
  resolveParticipationType,
} from "@/features/tournaments/types/participation";
import { useCreateTournament } from "../hooks";
import type { AdminTournament, CreateTournamentFormValues } from "../types";
import {
  applyGameToParticipationForm,
  formValuesToCreateInput,
  hasFormErrors,
  validateCreateTournamentForm,
} from "../utils";
import { ParticipationModeFields } from "./ParticipationModeFields";

interface CreateTournamentModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (tournament: AdminTournament) => void;
}

export function CreateTournamentModal({ open, onClose, onCreated }: CreateTournamentModalProps) {
  const [values, setValues] = useState<CreateTournamentFormValues>(DEFAULT_CREATE_TOURNAMENT_FORM);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof CreateTournamentFormValues, string>>
  >({});
  const { submit, isSubmitting, error, resetError } = useCreateTournament();

  const selectedFormat = TOURNAMENT_FORMATS.find((f) => f.value === values.format);
  const capLabel = registrationCapLabel(
    resolveParticipationType(values.game, values.wwmMode || null),
  );

  useEffect(() => {
    if (!open) return;
    setValues(DEFAULT_CREATE_TOURNAMENT_FORM);
    setFieldErrors({});
    resetError();
  }, [open, resetError]);

  function updateField<K extends keyof CreateTournamentFormValues>(
    key: K,
    value: CreateTournamentFormValues[K],
  ) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
    resetError();
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const errors = validateCreateTournamentForm(values);
    setFieldErrors(errors);
    if (hasFormErrors(errors)) return;

    try {
      const tournament = await submit(formValuesToCreateInput(values));
      onCreated(tournament);
      onClose();
    } catch {
      // error state
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && !isSubmitting && onClose()}>
      <DialogContent className="custom-scrollbar max-h-[90vh] overflow-y-auto border-border bg-card sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="font-display text-xl tracking-wider">
            Create Tournament
          </DialogTitle>
          <DialogDescription>
            Set up a new event, configure prize tiers, and manage brackets for single elimination,
            double elimination, or Swiss formats.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tournament-name">Tournament Name</Label>
            <Input
              id="tournament-name"
              value={values.name}
              onChange={(e) => updateField("name", e.target.value)}
              placeholder="e.g. Valorant Nightfall Cup"
              disabled={isSubmitting}
              className="bg-background/50"
            />
            {fieldErrors.name && <p className="text-xs text-destructive">{fieldErrors.name}</p>}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="tournament-game">Game</Label>
              <Select
                value={values.game}
                onValueChange={(game) => {
                  const nextGame = game as CreateTournamentFormValues["game"];
                  setValues((prev) => ({
                    ...prev,
                    game: nextGame,
                    ...applyGameToParticipationForm(nextGame),
                  }));
                  setFieldErrors((prev) => {
                    const next = { ...prev };
                    delete next.wwmMode;
                    return next;
                  });
                  resetError();
                }}
                disabled={isSubmitting}
              >
                <SelectTrigger id="tournament-game" className="bg-background/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TOURNAMENT_GAMES.map((game) => (
                    <SelectItem key={game} value={game}>
                      {game}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tournament-region">Region</Label>
              <Select
                value={values.region}
                onValueChange={(region) => updateField("region", region)}
                disabled={isSubmitting}
              >
                <SelectTrigger id="tournament-region" className="bg-background/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TOURNAMENT_REGIONS.map((region) => (
                    <SelectItem key={region} value={region}>
                      {region}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tournament-format">Bracket Format</Label>
            <Select
              value={values.format}
              onValueChange={(format) =>
                updateField("format", format as CreateTournamentFormValues["format"])
              }
              disabled={isSubmitting}
            >
              <SelectTrigger id="tournament-format" className="bg-background/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TOURNAMENT_FORMATS.map((f) => (
                  <SelectItem key={f.value} value={f.value}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedFormat && (
              <p className="text-xs text-muted-foreground">{selectedFormat.description}</p>
            )}
          </div>

          <ParticipationModeFields
            values={values}
            disabled={isSubmitting}
            fieldErrors={fieldErrors}
            onWwmModeChange={(wwmMode) => updateField("wwmMode", wwmMode)}
          />

          <PrizePoolInput
            id="tournament-prize"
            currency={values.prizeCurrency}
            amountDigits={values.prizeAmount}
            onCurrencyChange={(prizeCurrency) => updateField("prizeCurrency", prizeCurrency)}
            onAmountChange={(prizeAmount) => updateField("prizeAmount", prizeAmount)}
            disabled={isSubmitting}
            error={fieldErrors.prizeAmount}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <AdminDatePicker
              id="tournament-deadline"
              label="Registration Deadline"
              value={values.registrationDeadline}
              onChange={(date) => updateField("registrationDeadline", date)}
              disabled={isSubmitting}
              error={fieldErrors.registrationDeadline}
              placeholder="Select deadline"
            />

            <AdminDatePicker
              id="tournament-start"
              label="Start Date"
              value={values.startDate}
              onChange={(date) => updateField("startDate", date)}
              disabled={isSubmitting}
              error={fieldErrors.startDate}
              placeholder="Select start date"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="tournament-cap">{capLabel}</Label>
              <Input
                id="tournament-cap"
                type="number"
                min={4}
                max={64}
                step={2}
                value={values.teamCap}
                onChange={(e) => updateField("teamCap", e.target.value)}
                disabled={isSubmitting}
                className="bg-background/50"
              />
              {fieldErrors.teamCap && (
                <p className="text-xs text-destructive">{fieldErrors.teamCap}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="tournament-status">Status</Label>
              <Select
                value={values.status}
                onValueChange={(status) =>
                  updateField("status", status as CreateTournamentFormValues["status"])
                }
                disabled={isSubmitting}
              >
                <SelectTrigger id="tournament-status" className="bg-background/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ADMIN_TOURNAMENT_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="font-tech uppercase tracking-wider"
            >
              {isSubmitting ? "Creating…" : "Create Tournament"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
