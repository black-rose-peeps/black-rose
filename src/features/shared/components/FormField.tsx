import type { ReactNode } from "react";

/** Labelled form field wrapper with optional hint text. */
export function FormField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div>
        <label className="text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground">
          {label}
        </label>
        {hint && <p className="mt-0.5 text-[10px] text-muted-foreground/60">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

/** Standard text input styled for Black Rose forms. */
export function FormInput({
  value,
  onChange,
  type = "text",
  placeholder,
  required,
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  className?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      required={required}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={`h-11 w-full border border-border bg-secondary px-4 text-sm outline-none transition focus:border-foreground ${className}`}
    />
  );
}
