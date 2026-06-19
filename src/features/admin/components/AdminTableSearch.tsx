import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface AdminTableSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
}

export function AdminTableSearch({
  value,
  onChange,
  placeholder,
  disabled = false,
}: AdminTableSearchProps) {
  return (
    <div className="relative mb-4 max-w-md">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="bg-background/50 pl-9"
        aria-label={placeholder}
      />
    </div>
  );
}
