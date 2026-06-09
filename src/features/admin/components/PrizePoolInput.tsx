import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  formatPrizeDigits,
  getCurrencySymbol,
  parsePrizeDigits,
  type PrizeCurrency,
  PRIZE_CURRENCIES,
} from "@/lib/currency";
import { cn } from "@/lib/utils";

interface PrizePoolInputProps {
  id?: string;
  label?: string;
  currency: PrizeCurrency;
  amountDigits: string;
  onCurrencyChange: (currency: PrizeCurrency) => void;
  onAmountChange: (digits: string) => void;
  disabled?: boolean;
  error?: string;
  className?: string;
}

export function PrizePoolInput({
  id = "prize-pool",
  label = "Prize Pool",
  currency,
  amountDigits,
  onCurrencyChange,
  onAmountChange,
  disabled,
  error,
  className,
}: PrizePoolInputProps) {
  const displayAmount = formatPrizeDigits(amountDigits);
  const symbol = getCurrencySymbol(currency);

  function handleAmountChange(raw: string) {
    onAmountChange(parsePrizeDigits(raw));
  }

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={id}>{label}</Label>
      <div className="flex gap-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              disabled={disabled}
              className={cn(
                "h-10 shrink-0 gap-1 rounded-r-none border-r-0 bg-background/50 px-3 font-tech uppercase tracking-wider",
              )}
              aria-label="Prize currency"
            >
              <span className="text-base">{symbol}</span>
              <span className="text-xs text-muted-foreground">{currency}</span>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[10rem]">
            <DropdownMenuRadioGroup
              value={currency}
              onValueChange={(value) => onCurrencyChange(value as PrizeCurrency)}
            >
              {PRIZE_CURRENCIES.map((c) => (
                <DropdownMenuRadioItem key={c.code} value={c.code} className="gap-2">
                  <span className="font-medium">{c.symbol}</span>
                  <span>{c.label}</span>
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <Input
          id={id}
          inputMode="numeric"
          value={displayAmount}
          onChange={(e) => handleAmountChange(e.target.value)}
          placeholder="0"
          disabled={disabled}
          className="h-10 flex-1 rounded-l-none bg-background/50 font-medium tabular-nums"
          aria-describedby={error ? `${id}-error` : undefined}
        />
      </div>
      {amountDigits && (
        <p className="text-xs text-muted-foreground">
          Preview: {symbol}
          {displayAmount || "0"}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
