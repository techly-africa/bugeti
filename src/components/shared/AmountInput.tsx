"use client";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface AmountInputProps {
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  /** Applied to the outer wrapper div (controls width, e.g. "w-28") */
  className?: string;
  /** Applied directly to the inner Input (controls height, e.g. "h-14") */
  inputClassName?: string;
}

export function AmountInput({
  value,
  onChange,
  placeholder = "0",
  className,
  inputClassName,
}: AmountInputProps) {
  const [display, setDisplay] = useState(
    value > 0 ? value.toLocaleString("en-RW") : ""
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, "");
    const num = parseInt(raw, 10) || 0;
    setDisplay(num > 0 ? num.toLocaleString("en-RW") : "");
    onChange(num);
  };

  return (
    <div className={cn("relative flex items-center", className)}>
      <span className="absolute left-3 text-sm text-muted-foreground font-medium pointer-events-none select-none">
        RWF
      </span>
      <Input
        type="text"
        inputMode="numeric"
        value={display}
        onChange={handleChange}
        placeholder={placeholder}
        className={cn("pl-12 font-mono text-lg font-semibold h-12", inputClassName)}
      />
    </div>
  );
}
