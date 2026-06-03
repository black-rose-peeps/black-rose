import React, { cloneElement, isValidElement, useId } from "react";

interface SettingsFieldProps {
  label: string;
  description?: string;
  id?: string;
  children: React.ReactNode | ((controlId: string) => React.ReactNode);
}

export function SettingsField({ label, description, id: idProp, children }: SettingsFieldProps) {
  const generatedId = useId();
  const controlId = idProp ?? generatedId;

  const control =
    typeof children === "function"
      ? children(controlId)
      : isValidElement(children)
        ? cloneElement(children as React.ReactElement<{ id?: string }>, { id: controlId })
        : children;

  return (
    <div className="flex flex-col gap-2 py-4 border-b border-border last:border-b-0">
      <div>
        <label htmlFor={controlId} className="text-sm font-medium text-foreground">
          {label}
        </label>
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
      </div>
      <div>{control}</div>
    </div>
  );
}

interface SettingsToggleProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function SettingsToggle({ label, description, checked, onChange }: SettingsToggleProps) {
  return (
    <SettingsField label={label} description={description}>
      {(controlId) => (
        <button
          id={controlId}
          type="button"
          role="switch"
          aria-checked={checked}
          onClick={() => onChange(!checked)}
          className={`
          relative inline-flex h-6 w-11 items-center rounded-full transition-colors
          ${checked ? "bg-emerald-600" : "bg-gray-600"}
        `}
        >
          <span
            className={`
            inline-block h-4 w-4 transform rounded-full bg-white transition-transform
            ${checked ? "translate-x-6" : "translate-x-1"}
          `}
          />
        </button>
      )}
    </SettingsField>
  );
}

interface SettingsInputProps {
  label: string;
  description?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}

export function SettingsInput({
  label,
  description,
  value,
  onChange,
  placeholder,
  type = "text",
}: SettingsInputProps) {
  return (
    <SettingsField label={label} description={description}>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 bg-input border border-border rounded text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-ring"
      />
    </SettingsField>
  );
}

interface SettingsSelectProps {
  label: string;
  description?: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}

export function SettingsSelect({
  label,
  description,
  value,
  onChange,
  options,
}: SettingsSelectProps) {
  return (
    <SettingsField label={label} description={description}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 bg-input border border-border rounded text-foreground focus:outline-none focus:border-ring"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </SettingsField>
  );
}
