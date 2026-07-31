"use client";

import React from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface DateFilterPickerProps {
  date: Date | undefined;
  onSelect: (date: Date | undefined) => void;
  placeholder?: string;
  className?: string;
}

export function DateFilterPicker({
  date,
  onSelect,
  placeholder = "Filtrer par date...",
  className,
}: DateFilterPickerProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-10 rounded-xl justify-start text-left font-semibold text-xs border-border/60 bg-background/80 hover:bg-muted/40 transition-all",
              !date && "text-muted-foreground",
              date && "border-primary/50 text-primary bg-primary/5"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4 text-primary shrink-0" />
            {date ? (
              format(date, "PPP", { locale: fr })
            ) : (
              <span>{placeholder}</span>
            )}
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-auto p-0 rounded-2xl bg-card border-border/80 shadow-2xl z-50" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={(selectedDate) => {
              onSelect(selectedDate);
              setOpen(false);
            }}
            initialFocus
            locale={fr}
          />
          {date && (
            <div className="p-2 border-t border-border/40 text-right bg-muted/20 rounded-b-2xl">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  onSelect(undefined);
                  setOpen(false);
                }}
                className="h-8 text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 font-bold"
              >
                Réinitialiser la date
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>

      {date && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onSelect(undefined)}
          className="h-9 w-9 p-0 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/40"
          title="Effacer le filtre date"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
