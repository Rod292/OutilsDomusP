import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { formatFullDate } from '../utils/dateUtils';

interface DatePickerCellProps {
  date: Date | null | undefined;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
}

const DatePickerCell: React.FC<DatePickerCellProps> = ({
  date,
  onChange,
  placeholder = 'Sélectionner une date'
}) => {
  const [open, setOpen] = useState(false);

  const handleDateSelect = (selectedDate: Date | undefined) => {
    onChange(selectedDate);
    setOpen(false);
  };

  return (
    <div className="inline-block">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "font-normal text-sm min-w-[150px] justify-start",
              !date && "text-gray-500",
              "h-8"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? formatFullDate(date) : placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date || undefined}
            onSelect={handleDateSelect}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default DatePickerCell; 