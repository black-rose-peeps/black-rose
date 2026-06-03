/** Text input field for admin settings forms. */
export function SettingsField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="mb-2 text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground">
        {label}
      </div>
      <input
        defaultValue={value}
        className="h-10 w-full border border-border bg-secondary px-3 text-sm outline-none focus:border-foreground"
      />
    </div>
  );
}

/** Toggle switch for admin settings. */
export function SettingsToggle({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <label className="flex items-center justify-between border border-border bg-secondary px-4 py-3">
      <span className="text-xs">{label}</span>
      <span
        className={`grid h-5 w-10 items-center border ${
          enabled ? "border-foreground bg-foreground/10" : "border-border bg-background"
        }`}
      >
        <span
          className={`h-3 w-3 bg-foreground transition ${enabled ? "translate-x-5" : "translate-x-1"}`}
        />
      </span>
    </label>
  );
}
