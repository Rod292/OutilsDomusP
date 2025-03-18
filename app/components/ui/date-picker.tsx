"use client";

import * as React from "react";
import ReactDatePicker from "react-datepicker";
import { fr } from "date-fns/locale";

import "react-datepicker/dist/react-datepicker.css";
import { Input } from "./input";
import { cn } from "@/lib/utils";

export interface DatePickerProps {
  selected: Date | null;
  onChange: (date: Date | null) => void;
  placeholderText?: string;
  className?: string;
  showTimeSelect?: boolean;
  dateFormat?: string;
}

export function DatePicker({
  selected,
  onChange,
  placeholderText = "Sélectionner une date",
  className,
  showTimeSelect = false,
  dateFormat = "dd/MM/yyyy",
  ...props
}: DatePickerProps & React.ComponentPropsWithoutRef<typeof ReactDatePicker>) {
  return (
    <ReactDatePicker
      selected={selected}
      onChange={onChange}
      locale={fr}
      placeholderText={placeholderText}
      dateFormat={dateFormat}
      showTimeSelect={showTimeSelect}
      className={cn(
        "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
} 