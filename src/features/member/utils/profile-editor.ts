import type { ProfileFormState } from "./profile-form-state";

function stableValue(value: unknown): unknown {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, stableValue(item)]),
    );
  }
  return value;
}

/** Compare every editable value, including hidden identities and visibility flags. */
export function profileEditorHasChanges(saved: ProfileFormState, draft: ProfileFormState): boolean {
  return JSON.stringify(stableValue(saved)) !== JSON.stringify(stableValue(draft));
}

/** Search-only section changes keep the same draft mounted. */
export function shouldGuardProfileExit(dirty: boolean, nextPathname: string): boolean {
  return dirty && nextPathname.replace(/\/+$/, "") !== "/dashboard/profile";
}
