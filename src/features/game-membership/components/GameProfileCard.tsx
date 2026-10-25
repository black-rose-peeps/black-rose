import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MemberSelect } from "@/features/member/components/MemberSelect";
import { techFieldClass } from "@/features/member/components/MemberShell";
import { cn } from "@/lib/utils";
import type { GameMembershipStatus, MemberMembershipAction, MembershipGame } from "../types";
import {
  activeProfileRoles,
  PROFILE_FIELD_PROPERTIES,
  type createGameProfileEditor,
} from "./game-profile-editor";

const STATUS_LABELS: Record<GameMembershipStatus, string> = {
  interested: "Interested",
  applying: "Applying",
  accepted: "Accepted",
  inactive: "Inactive",
  left: "Left",
};
const ACTION_LABELS: Record<MemberMembershipAction, string> = {
  interest: "Mark interested",
  apply: "Apply to join",
  withdraw: "Withdraw application",
  leave: "Leave game",
};
export function GameProfileCard({
  game,
  editor,
}: {
  game: MembershipGame;
  editor: ReturnType<typeof createGameProfileEditor>;
}) {
  const state = useSyncExternalStore(editor.subscribe, editor.getSnapshot, editor.getSnapshot);
  const roles = activeProfileRoles(game);
  const retiredRole = state.draft.roleId && !roles.some((role) => role.id === state.draft.roleId);
  const prefix = `game-profile-${game.id}`;
  const disabled = !game.is_active || state.busy;
  function act(action: MemberMembershipAction) {
    if (
      (action === "leave" || action === "withdraw") &&
      !window.confirm(
        `${ACTION_LABELS[action]} for ${game.display_name}? Your saved game profile will be kept.`,
      )
    )
      return;
    void editor.act(action);
  }
  return (
    <section
      id={prefix}
      aria-labelledby={`${prefix}-title`}
      className="min-w-0 scroll-mt-24 border border-white/10 bg-[oklch(0.07_0_0)] p-4 sm:p-6"
    >
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 id={`${prefix}-title`} className="font-display text-xl">
            {game.display_name}
          </h3>
          {!game.is_active && (
            <p className="mt-1 text-sm text-muted-foreground">
              Game inactive — saved profile is read-only. You can still withdraw an application or
              leave.
            </p>
          )}
        </div>
        <span
          className={cn(
            "border px-3 py-1 text-sm",
            state.membership?.status === "accepted"
              ? "border-emerald-400/30 text-emerald-400"
              : "border-white/15 text-muted-foreground",
          )}
        >
          {state.membership ? STATUS_LABELS[state.membership.status] : "Not joined"}
        </span>
      </header>
      <fieldset disabled={disabled} className="min-w-0 space-y-4">
        <legend className="sr-only">Game profile</legend>
        {state.prefillSource && !state.profile && (
          <p className="text-xs leading-relaxed text-muted-foreground">{state.prefillSource}</p>
        )}
        <div className="grid min-w-0 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor={`${prefix}-ign`}>
              {game.identity_field_label || "In-game name (IGN)"}
            </Label>
            <Input
              id={`${prefix}-ign`}
              value={state.draft.ign}
              onChange={(event) => editor.edit({ ign: event.target.value })}
              placeholder={game.identity_field_placeholder || "Your in-game name"}
              className={techFieldClass}
            />
            {game.identity_helper_text && (
              <p className="text-xs text-muted-foreground">{game.identity_helper_text}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${prefix}-role`}>Game role</Label>
            <MemberSelect
              id={`${prefix}-role`}
              label="Game role"
              value={state.draft.roleId ?? "__none__"}
              disabled={disabled}
              onValueChange={(value) =>
                editor.edit({ roleId: value === "__none__" ? null : value })
              }
              options={[
                { value: "__none__", label: "No role selected" },
                ...(retiredRole
                  ? [
                      {
                        value: state.draft.roleId!,
                        label: `${state.profile?.roleLabel || "Previous role"} (retired; saved)`,
                        disabled: true,
                      },
                    ]
                  : []),
                ...roles.map((role) => ({ value: role.id, label: role.role_name })),
              ]}
            />
            {state.profile?.roleLabel && !state.profile.roleId && (
              <p className="text-xs text-muted-foreground">
                Previous role: {state.profile.roleLabel} (saved)
              </p>
            )}
          </div>
          {(Object.keys(PROFILE_FIELD_PROPERTIES) as (keyof typeof PROFILE_FIELD_PROPERTIES)[]).map(
            (key) => {
              const field = game.profile_field_config?.[key];
              if (!field?.enabled) return null;
              const property = PROFILE_FIELD_PROPERTIES[key];
              const value = state.draft[property];
              const retired = value && field.kind === "select" && !field.options.includes(value);
              return (
                <div key={key} className="space-y-2">
                  <Label htmlFor={`${prefix}-${key}`}>{field.label}</Label>
                  {field.kind === "select" ? (
                    <MemberSelect
                      id={`${prefix}-${key}`}
                      label={field.label}
                      value={value || "__none__"}
                      disabled={disabled}
                      onValueChange={(next) =>
                        editor.edit({ [property]: next === "__none__" ? "" : next })
                      }
                      options={[
                        { value: "__none__", label: "Not specified" },
                        ...(retired
                          ? [{ value, label: `${value} (retired; saved)`, disabled: true }]
                          : []),
                        ...field.options.map((option) => ({ value: option, label: option })),
                      ]}
                    />
                  ) : (
                    <Input
                      id={`${prefix}-${key}`}
                      value={value}
                      onChange={(event) => editor.edit({ [property]: event.target.value })}
                      className={techFieldClass}
                    />
                  )}
                </div>
              );
            },
          )}
        </div>
        {game.is_active && (
          <div className="flex flex-wrap items-center gap-2 [&_button]:w-full sm:[&_button]:w-auto">
            <Button
              type="button"
              className="clip-cta min-h-11 rounded-none font-tech"
              disabled={!state.dirty || state.busy}
              onClick={() => void editor.save()}
            >
              Save game profile
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="min-h-11 rounded-none"
              disabled={!state.dirty || state.busy}
              onClick={() => {
                if (window.confirm(`Discard unsaved ${game.display_name} profile changes?`))
                  editor.discard();
              }}
            >
              Discard game changes
            </Button>
          </div>
        )}
      </fieldset>
      {(Object.keys(PROFILE_FIELD_PROPERTIES) as (keyof typeof PROFILE_FIELD_PROPERTIES)[]).map(
        (key) => {
          const field = game.profile_field_config?.[key];
          const value = state.draft[PROFILE_FIELD_PROPERTIES[key]];
          if (field?.enabled || !value) return null;
          return (
            <p key={key} className="mt-3 break-words text-xs text-muted-foreground">
              {field?.label || key[0].toUpperCase() + key.slice(1)} (disabled; saved): {value}. Kept
              when you save.
            </p>
          );
        },
      )}
      <div
        role="status"
        aria-live="polite"
        className="text-xs text-muted-foreground empty:hidden [&:not(:empty)]:mt-3"
      >
        {state.busy
          ? "Saving…"
          : state.message || (state.hasUserChanges ? "Unsaved game profile changes" : "")}
      </div>
      {state.error && (
        <p role="alert" className="mt-2 text-sm text-red-400">
          {state.error}
        </p>
      )}
      <div className="mt-5 border-t border-white/10 pt-4">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h4 className="text-sm font-medium">Game membership</h4>
          <details className="text-xs text-muted-foreground">
            <summary className="w-fit cursor-pointer py-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">
              About joining
            </summary>
            <p className="mt-2 max-w-prose leading-relaxed">
              Saving a profile does not join this game or change your Main Game preference.
              Applications need a saved IGN and staff approval.
            </p>
          </details>
        </div>
        {state.actions.includes("apply") && !state.profile?.ign.trim() && !state.dirty && (
          <p className="mt-2 text-xs text-muted-foreground">
            Save your in-game name before applying.
          </p>
        )}
        {state.dirty && (
          <p className="mt-2 text-sm text-amber-300">
            Save your game profile first, or discard its changes before changing membership.
          </p>
        )}
        {state.actions.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2 [&_button]:w-full sm:[&_button]:w-auto">
            {state.actions.map((action) => (
              <Button
                type="button"
                key={action}
                variant={action === "apply" ? "default" : "outline"}
                className="min-h-11 rounded-none border-white/15"
                disabled={
                  state.busy || state.dirty || (action === "apply" && !state.profile?.ign.trim())
                }
                onClick={() => act(action)}
              >
                {ACTION_LABELS[action]}
              </Button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
