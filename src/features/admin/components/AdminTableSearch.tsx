import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface AdminTableSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
  className?: string;
}

export function AdminTableSearch({
  value,
  onChange,
  placeholder,
  disabled = false,
  className,
}: AdminTableSearchProps) {
  return (
    <div className={cn("relative mb-4 w-full max-w-xl", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="h-10 border-white/10 bg-background/50 pl-9 font-tech text-sm tracking-wide"
        aria-label={placeholder}
      />
    </div>
  );
}
