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
import { ADMIN_TOURNAMENT_STATUSES, TOURNAMENT_GAMES, TOURNAMENT_REGIONS } from "../constants";
import {
  registrationCapLabel,
  resolveParticipationType,
} from "@/features/tournaments/types/participation";
import { useUpdateTournament } from "../hooks/useUpdateTournament";
import {
  removeTournamentRulesFiles,
  uploadTournamentRulesFile,
  validateTournamentRulesFile,
} from "../services/tournament-rules-file.service";
import type { AdminTournament, CreateTournamentFormValues } from "../types";
import {
  applyGameToParticipationForm,
  formValuesToCreateInput,
  hasFormErrors,
  tournamentToFormValues,
  validateCreateTournamentForm,
} from "../utils";
import { ParticipationModeFields } from "./ParticipationModeFields";
import { TournamentDescriptionField } from "./TournamentDescriptionField";
import { TournamentRulesFileField } from "./TournamentRulesFileField";

interface EditTournamentModalProps {
  open: boolean;
  tournament: AdminTournament | null;
  onClose: () => void;
  onUpdated: (tournament: AdminTournament) => void;
}

export function EditTournamentModal({
  open,
  tournament,
  onClose,
  onUpdated,
}: EditTournamentModalProps) {
  const [values, setValues] = useState<CreateTournamentFormValues>(
    tournament ? tournamentToFormValues(tournament) : ({} as CreateTournamentFormValues),
  );
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof CreateTournamentFormValues, string>>
  >({});
  const [rulesFile, setRulesFile] = useState<File | null>(null);
  const [removeRulesFile, setRemoveRulesFile] = useState(false);
  const [rulesFileError, setRulesFileError] = useState<string | null>(null);
  const { submit, isSubmitting, error, resetError } = useUpdateTournament();

  const selectedFormat = TOURNAMENT_FORMATS.find((f) => f.value === values.format);
  const capLabel = registrationCapLabel(
    resolveParticipationType(values.game, values.wwmMode || null),
  );

  useEffect(() => {
    if (!open || !tournament) return;
    setValues(tournamentToFormValues(tournament));
    setFieldErrors({});
    setRulesFile(null);
    setRemoveRulesFile(false);
    setRulesFileError(null);
    resetError();
  }, [open, tournament, resetError]);

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
    if (!tournament) return;

    const errors = validateCreateTournamentForm(values);
    setFieldErrors(errors);
    if (hasFormErrors(errors)) return;

    if (rulesFile) {
      const fileError = validateTournamentRulesFile(rulesFile);
      if (fileError) {
        setRulesFileError(fileError);
        return;
      }
    }
    setRulesFileError(null);

    try {
      let input = formValuesToCreateInput(values);

      if (removeRulesFile && !rulesFile) {
        await removeTournamentRulesFiles(tournament.id);
        input = { ...input, rulesUrl: null };
      } else if (rulesFile) {
        const rulesUrl = await uploadTournamentRulesFile(tournament.id, rulesFile);
        input = { ...input, rulesUrl };
      } else {
        input = { ...input, rulesUrl: values.rulesUrl.trim() || null };
      }

      const updated = await submit(tournament.id, input);
      onUpdated(updated);
      onClose();
    } catch {
      // error shown in UI
    }
  }

  if (!tournament) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !isSubmitting) onClose();
      }}
    >
      <DialogContent className="custom-scrollbar max-h-[90vh] overflow-y-auto border-border bg-card sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="font-display text-xl tracking-wider">Edit Tournament</DialogTitle>
          <DialogDescription>Update settings for {tournament.name}.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-tournament-name">Tournament Name</Label>
            <Input
              id="edit-tournament-name"
              value={values.name}
              onChange={(e) => updateField("name", e.target.value)}
              disabled={isSubmitting}
              className="bg-background/50"
            />
            {fieldErrors.name && <p className="text-xs text-destructive">{fieldErrors.name}</p>}
          </div>

          <TournamentDescriptionField
            id="edit-tournament-description"
            value={values.description}
            onChange={(description) => updateField("description", description)}
            disabled={isSubmitting}
            error={fieldErrors.description}
          />

          <TournamentRulesFileField
            id="edit-tournament-rules-file"
            existingUrl={values.rulesUrl || tournament.rulesUrl || undefined}
            selectedFile={rulesFile}
            markedForRemoval={removeRulesFile}
            onSelectFile={(file) => {
              setRulesFile(file);
              setRemoveRulesFile(false);
              setRulesFileError(null);
            }}
            onMarkForRemoval={() => {
              setRemoveRulesFile(true);
              setRulesFile(null);
              setRulesFileError(null);
            }}
            onUndoRemoval={() => setRemoveRulesFile(false)}
            disabled={isSubmitting}
            error={rulesFileError ?? undefined}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="edit-tournament-game">Game</Label>
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
                <SelectTrigger id="edit-tournament-game" className="bg-background/50">
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
              <Label htmlFor="edit-tournament-region">Region</Label>
              <Select
                value={values.region}
                onValueChange={(region) => updateField("region", region)}
                disabled={isSubmitting}
              >
                <SelectTrigger id="edit-tournament-region" className="bg-background/50">
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
            <Label htmlFor="edit-tournament-format">Bracket Format</Label>
            <Select
              value={values.format}
              onValueChange={(format) =>
                updateField("format", format as CreateTournamentFormValues["format"])
              }
              disabled={isSubmitting}
            >
              <SelectTrigger id="edit-tournament-format" className="bg-background/50">
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
            id="edit-tournament-prize"
            currency={values.prizeCurrency}
            amountDigits={values.prizeAmount}
            onCurrencyChange={(prizeCurrency) => updateField("prizeCurrency", prizeCurrency)}
            onAmountChange={(prizeAmount) => updateField("prizeAmount", prizeAmount)}
            disabled={isSubmitting}
            error={fieldErrors.prizeAmount}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <AdminDatePicker
              id="edit-tournament-deadline"
              label="Registration Deadline"
              value={values.registrationDeadline}
              onChange={(date) => updateField("registrationDeadline", date)}
              disabled={isSubmitting}
              error={fieldErrors.registrationDeadline}
            />
            <AdminDatePicker
              id="edit-tournament-start"
              label="Start Date"
              value={values.startDate}
              onChange={(date) => updateField("startDate", date)}
              disabled={isSubmitting}
              error={fieldErrors.startDate}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="edit-tournament-cap">{capLabel}</Label>
              <Input
                id="edit-tournament-cap"
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
              <Label htmlFor="edit-tournament-status">Status</Label>
              <Select
                value={values.status}
                onValueChange={(status) =>
                  updateField("status", status as CreateTournamentFormValues["status"])
                }
                disabled={isSubmitting}
              >
                <SelectTrigger id="edit-tournament-status" className="bg-background/50">
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
              {isSubmitting ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
