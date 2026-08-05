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
import { Progress } from "@/components/ui/progress";
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
  TOURNAMENT_REGIONS,
} from "../constants";
import { useActiveGames } from "@/features/admin/features/games/hooks/useGames";
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

const STEPS = [
  { id: 1, title: "Basic Info" },
  { id: 2, title: "Game & Format" },
  { id: 3, title: "Participation" },
  { id: 4, title: "Schedule & Prize" },
  { id: 5, title: "Finalize" },
] as const;

type Step = (typeof STEPS)[number]["id"];

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
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const { submit, isSubmitting, error, resetError } = useUpdateTournament();
  const { data: activeGames } = useActiveGames();
  const availableGames = activeGames?.map((g) => g.display_name) || [];

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
    setCurrentStep(1);
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

  function validateStep(step: Step): boolean {
    const stepFields: Record<Step, (keyof CreateTournamentFormValues)[]> = {
      1: ["name", "description"],
      2: ["game", "region", "format"],
      3: ["teamCap"],
      4: ["registrationDeadline", "startDate", "prizeAmount"],
      5: ["status"],
    };

    const fieldsToValidate = stepFields[step];
    const errors = validateCreateTournamentForm(values);
    const stepErrors: Partial<Record<keyof CreateTournamentFormValues, string>> = {};

    fieldsToValidate.forEach((field) => {
      if (errors[field]) {
        stepErrors[field] = errors[field];
      }
    });

    setFieldErrors(stepErrors);
    return !hasFormErrors(stepErrors);
  }

  function handleNext(event?: React.MouseEvent) {
    event?.preventDefault();
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => (Math.min(prev + 1, 5) as Step));
    }
  }

  function handleBack() {
    setCurrentStep((prev) => (Math.max(prev - 1, 1) as Step));
  }

  function goToStep(step: Step, event?: React.MouseEvent) {
    event?.preventDefault();
    if (step < currentStep || validateStep(currentStep)) {
      setCurrentStep(step);
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!tournament) return;

    // Validate all steps
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
      const currentGameData = activeGames?.find((g) => g.display_name === values.game);

      // Require game metadata before converting form values
      if (!currentGameData) {
        throw new Error(
          `Game metadata for "${values.game}" not found. Please ensure the game is active and available.`,
        );
      }

      let input = formValuesToCreateInput({ ...values, rulesUrl: "" }, currentGameData);

      const clearingRulesFile = removeRulesFile && !rulesFile;

      if (clearingRulesFile) {
        input = { ...input, rulesUrl: null };
      } else if (rulesFile) {
        const rulesUrl = await uploadTournamentRulesFile(tournament.id, rulesFile);
        input = { ...input, rulesUrl };
      } else {
        input = { ...input, rulesUrl: values.rulesUrl.trim() || null };
      }

      const updated = await submit(tournament.id, input);

      if (clearingRulesFile) {
        await removeTournamentRulesFiles(tournament.id);
      }

      onUpdated(updated);
      onClose();
    } catch (err) {
      // error shown in UI
    }
  }

  if (!tournament) return null;

  const currentStepData = STEPS.find((s) => s.id === currentStep);
  const progress = (currentStep / STEPS.length) * 100;

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
          <DialogDescription>
            {currentStepData?.title}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Step {currentStep} of {STEPS.length}</span>
            </div>

            <div className="flex justify-between gap-1">
              {STEPS.map((step) => (
                <button
                  key={step.id}
                  type="button"
                  onClick={(e) => goToStep(step.id, e)}
                  disabled={step.id > currentStep}
                  className={`flex-1 h-1 rounded-full transition-colors ${
                    step.id <= currentStep
                      ? "bg-primary"
                      : "bg-primary/20"
                  }`}
                  aria-label={`Go to ${step.title}`}
                />
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {currentStep === 1 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-300">
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
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-300">
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
                      {availableGames.map((game) => (
                        <SelectItem key={game} value={game}>
                          {game}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldErrors.game && <p className="text-xs text-destructive">{fieldErrors.game}</p>}
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
                  {fieldErrors.region && <p className="text-xs text-destructive">{fieldErrors.region}</p>}
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
                  {fieldErrors.format && <p className="text-xs text-destructive">{fieldErrors.format}</p>}
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-300">
                <ParticipationModeFields
                  values={values}
                  disabled={isSubmitting}
                  fieldErrors={fieldErrors}
                  onWwmModeChange={(wwmMode) => updateField("wwmMode", wwmMode)}
                />

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
              </div>
            )}

            {currentStep === 4 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-300">
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

                <PrizePoolInput
                  id="edit-tournament-prize"
                  currency={values.prizeCurrency}
                  amountDigits={values.prizeAmount}
                  onCurrencyChange={(prizeCurrency) => updateField("prizeCurrency", prizeCurrency)}
                  onAmountChange={(prizeAmount) => updateField("prizeAmount", prizeAmount)}
                  disabled={isSubmitting}
                  error={fieldErrors.prizeAmount}
                />
              </div>
            )}

            {currentStep === 5 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-300">
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
                  {fieldErrors.status && <p className="text-xs text-destructive">{fieldErrors.status}</p>}
                </div>
              </div>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                disabled={isSubmitting || currentStep === 1}
              >
                Back
              </Button>
              {currentStep < STEPS.length ? (
                <Button
                  type="button"
                  onClick={handleNext}
                  disabled={isSubmitting}
                  className="font-tech uppercase tracking-wider"
                >
                  Next
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="font-tech uppercase tracking-wider"
                >
                  {isSubmitting ? "Saving…" : "Save Changes"}
                </Button>
              )}
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
