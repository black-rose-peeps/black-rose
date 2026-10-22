import type {
  GameProfileField,
  GameProfileFieldConfig,
  GameProfileFieldKey,
} from "@/features/game-membership/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const fields: GameProfileFieldKey[] = ["class", "server", "faction"];
const title = (key: string) => key.charAt(0).toUpperCase() + key.slice(1);

export function validateGameProfileFields(config: GameProfileFieldConfig): string | null {
  for (const key of fields) {
    const field = config[key];
    if (!field?.enabled) continue;
    if (!field.label.trim()) return `${title(key)} needs a label.`;
    if (field.kind === "select" && !field.options.some((option) => option.trim())) {
      return `${title(key)} needs at least one option.`;
    }
  }
  return null;
}

export function GameProfileFieldEditor({
  value,
  onChange,
}: {
  value: GameProfileFieldConfig;
  onChange: (value: GameProfileFieldConfig) => void;
}) {
  return (
    <fieldset className="space-y-4 rounded-md border border-border p-4">
      <legend className="px-1 text-sm font-medium">Optional game profile fields</legend>
      <p className="text-xs text-muted-foreground">
        All fields are optional for members. Disabling a field or changing options does not erase
        saved profile values.
      </p>
      {fields.map((key) => {
        const field: GameProfileField = value[key] ?? {
          enabled: false,
          label: title(key),
          kind: "text",
          options: [],
        };
        const id = `game-field-${key}`;
        const update = (patch: Partial<GameProfileField>) =>
          onChange({ ...value, [key]: { ...field, ...patch } });
        return (
          <div key={key} className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                id={`${id}-enabled`}
                type="checkbox"
                checked={field.enabled}
                onChange={(event) => update({ enabled: event.target.checked })}
              />
              <Label htmlFor={`${id}-enabled`}>Enable {key}</Label>
            </div>
            {field.enabled && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor={`${id}-label`}>{title(key)} label</Label>
                  <Input
                    id={`${id}-label`}
                    value={field.label}
                    aria-invalid={!field.label.trim()}
                    onChange={(event) => update({ label: event.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`${id}-kind`}>{title(key)} input</Label>
                  <select
                    id={`${id}-kind`}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={field.kind}
                    onChange={(event) =>
                      update({ kind: event.target.value as GameProfileField["kind"] })
                    }
                  >
                    <option value="text">Free text</option>
                    <option value="select">Select options</option>
                  </select>
                </div>
                {field.kind === "select" && (
                  <div className="space-y-1 sm:col-span-2">
                    <Label htmlFor={`${id}-options`}>{title(key)} options (one per line)</Label>
                    <Textarea
                      id={`${id}-options`}
                      value={field.options.join("\n")}
                      aria-describedby={`${id}-hint`}
                      aria-invalid={!field.options.some((option) => option.trim())}
                      onChange={(event) => update({ options: event.target.value.split("\n") })}
                    />
                    <p id={`${id}-hint`} className="text-xs text-muted-foreground">
                      Provide at least one nonempty option. Previous values remain in saved
                      profiles.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </fieldset>
  );
}
