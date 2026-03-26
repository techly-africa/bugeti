"use client";
import { useState } from "react";
import { HelpCircle, X } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface Props {
  title: string;
  children: React.ReactNode;
}

export function SectionHelp({ title, children }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label={`Learn more: ${title}`}
        className="inline-flex items-center justify-center w-5 h-5 rounded-full border border-muted-foreground/30 text-muted-foreground hover:border-primary hover:text-primary transition-colors shrink-0"
      >
        <HelpCircle size={12} />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[70vh] overflow-y-auto">
          <SheetHeader className="pb-3">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-base">{title}</SheetTitle>
              <button
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          </SheetHeader>
          <div className="text-sm text-muted-foreground leading-relaxed space-y-3 pb-6">
            {children}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
