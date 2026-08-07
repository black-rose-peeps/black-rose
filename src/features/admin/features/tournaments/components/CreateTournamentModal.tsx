import { useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
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
  DEFAULT_CREATE_TOURNAMENT_FORM,
  TOURNAMENT_REGIONS,
} from "../constants";
import { useActiveGames } from "@/features/admin/features/games/hooks/useGames";
import {
  registrationCapLabel,
  resolveParticipationType,
} from "@/features/tournaments/types/participation";
import { useCreateTournament } from "../hooks";
import { updateTournament } from "../services/tournaments.service";
import {
  uploadTournamentRulesFile,
  validateTournamentRulesFile,
} from "../services/tournament-rules-file.service";
import type { AdminTournament, CreateTournamentFormValues } from "../types";
import {
  applyGameToParticipationForm,
  formValuesToCreateInput,
  hasFormErrors,
  validateCreateTournamentForm,
} from "../utils";
import { ParticipationModeFields } from "./ParticipationModeFields";
import { TournamentDescriptionField } from "./TournamentDescriptionField";
import { TournamentRulesFileField } from "./TournamentRulesFileField";

interface CreateTournamentModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (tournament: AdminTournament) => void;
}

const STEPS = [
  { id: 1, title: "Basic Info" },
  { id: 2, title: "Game & Format" },
  { id: 3, title: "Participation" },
  { id: 4, title: "Schedule & Prize" },
  { id: 5, title: "Finalize" },
] as const;

type Step = (typeof STEPS)[number]["id"];

export function CreateTournamentModal({ open, onClose, onCreated }: CreateTournamentModalProps) {
  const [values, setValues] = useState<CreateTournamentFormValues>(DEFAULT_CREATE_TOURNAMENT_FORM);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof CreateTournamentFormValues, string>>
  >({});
  const [rulesFile, setRulesFile] = useState<File | null>(null);
  const [rulesFileError, setRulesFileError] = useState<string | null>(null);
  const [createdTournamentId, setCreatedTournamentId] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const { submit, isSubmitting, error, resetError } = useCreateTournament();
  const { data: activeGames } = useActiveGames();
  const availableGames = activeGames?.map((g) => g.display_name) || [];

  const selectedFormat = TOURNAMENT_FORMATS.find((f) => f.value === values.format);
  const capLabel = registrationCapLabel(
    resolveParticipationType(values.game, values.wwmMode || null),
  );

  useEffect(() => {
    if (!open) return;
    setValues(DEFAULT_CREATE_TOURNAMENT_FORM);
    setFieldErrors({});
    setRulesFile(null);
    setRulesFileError(null);
    setCreatedTournamentId(null);
    setCurrentStep(1);
    resetError();
  }, [open, resetError]);

  // Set default game to first available game if current game is not in available games
  useEffect(() => {
    if (availableGames.length > 0 && !availableGames.includes(values.game)) {
      setValues((prev) => ({ ...prev, game: availableGames[0] }));
    }
  }, [availableGames, values.game]);

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
      const input = formValuesToCreateInput({ ...values, rulesUrl: "" }, currentGameData);
      let tournament = createdTournamentId
        ? await updateTournament(createdTournamentId, input)
        : await submit(input);

      if (!createdTournamentId) {
        setCreatedTournamentId(tournament.id);
      }

      if (rulesFile) {
        const rulesUrl = await uploadTournamentRulesFile(tournament.id, rulesFile);
        tournament = await updateTournament(tournament.id, { ...input, rulesUrl });
      }

      onCreated(tournament);
      toast.success(`Tournament "${values.name}" created successfully`);
      onClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to create tournament";
      toast.error(errorMessage);
      // error state — createdTournamentId preserved so retry resumes the draft row
    }
  }

  const currentStepData = STEPS.find((s) => s.id === currentStep);
  const progress = (currentStep / STEPS.length) * 100;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && !isSubmitting && onClose()}>
      <DialogContent className="custom-scrollbar max-h-[90vh] overflow-y-auto border-border bg-card sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="font-display text-xl tracking-wider">
            Create Tournament
          </DialogTitle>
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

                <TournamentDescriptionField
                  id="tournament-description"
                  value={values.description}
                  onChange={(description) => updateField("description", description)}
                  disabled={isSubmitting}
                  error={fieldErrors.description}
                />

                <TournamentRulesFileField
                  id="tournament-rules-file"
                  selectedFile={rulesFile}
                  onSelectFile={(file) => {
                    setRulesFile(file);
                    setRulesFileError(null);
                  }}
                  disabled={isSubmitting}
                  error={rulesFileError ?? undefined}
                />
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-300">
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
                        {availableGames.map((game) => (
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
              </div>
            )}

            {currentStep === 4 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-300">
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

                <PrizePoolInput
                  id="tournament-prize"
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

                <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
                  <h3 className="font-semibold text-sm">Review Tournament Details</h3>
                  <div className="grid gap-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Name:</span>
                      <span className="font-medium">{values.name || "-"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Game:</span>
                      <span className="font-medium">{values.game}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Format:</span>
                      <span className="font-medium">{values.format}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Region:</span>
                      <span className="font-medium">{values.region}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Capacity:</span>
                      <span className="font-medium">{values.teamCap}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Prize:</span>
                      <span className="font-medium">{values.prizeCurrency} {values.prizeAmount || "-"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status:</span>
                      <span className="font-medium">{values.status}</span>
                    </div>
                  </div>
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
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              {currentStep > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBack}
                  disabled={isSubmitting}
                >
                  Back
                </Button>
              )}
              {currentStep < STEPS.length ? (
                <Button
                  type="button"
                  onClick={(e) => handleNext(e)}
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
                  {isSubmitting ? "Creating…" : "Create Tournament"}
                </Button>
              )}
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
