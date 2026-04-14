'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { Clock, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

// Generate time options at 15-minute intervals from 6:00 to 23:00
function generateTimeOptions(): { value: string; label: string; hour: number }[] {
  const options: { value: string; label: string; hour: number }[] = [];
  for (let h = 6; h <= 23; h++) {
    for (const m of [0, 15, 30, 45]) {
      if (h === 23 && m > 0) break;
      const value = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      const label = `${h}:${String(m).padStart(2, '0')}`;
      options.push({ value, label, hour: h });
    }
  }
  return options;
}

const ALL_TIME_OPTIONS = generateTimeOptions();

// Quick preset options for start time
const START_TIME_PRESETS = ['08:30', '09:00'];

interface TimePickerProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  /** Show quick preset buttons (08:30, 09:00) at top */
  showPresets?: boolean;
  /** Placeholder text */
  placeholder?: string;
}

export function TimePicker({
  value,
  onChange,
  disabled = false,
  className,
  showPresets = false,
  placeholder = '--:--',
}: TimePickerProps) {
  const [open, setOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Find the currently selected time in the list
  const selectedIndex = useMemo(() => {
    if (!value) return -1;
    return ALL_TIME_OPTIONS.findIndex((t) => t.value === value);
  }, [value]);

  // Scroll to selected time when popover opens
  useEffect(() => {
    if (open && scrollRef.current && selectedIndex >= 0) {
      // Each item is 32px tall, center the selected item
      const container = scrollRef.current;
      const itemHeight = 32;
      const targetScroll = Math.max(0, selectedIndex * itemHeight - container.clientHeight / 2 + itemHeight / 2);
      container.scrollTop = targetScroll;
    }
  }, [open, selectedIndex]);

  const handleSelect = (timeValue: string) => {
    onChange(timeValue);
    setOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setOpen(false);
  };

  // Display value (remove leading zero from hour for cleaner look)
  const displayValue = value
    ? value.replace(/^0(\d)/, '$1')
    : '';

  return (
    <div className={cn('relative', className)}>
      {/* Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(!open)}
        className={cn(
          'flex h-8 w-full items-center justify-between rounded-md border px-2 text-xs transition-colors',
          'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
          disabled
            ? 'cursor-not-allowed opacity-50 bg-muted'
            : 'cursor-pointer bg-background hover:bg-accent hover:text-accent-foreground',
          !value && 'text-muted-foreground'
        )}
      >
        <span className="flex items-center gap-1 min-w-0">
          <Clock className="size-3 shrink-0 opacity-40" />
          <span className={cn('truncate', value ? '' : 'opacity-60')}>
            {displayValue || placeholder}
          </span>
        </span>
        {value && !disabled && (
          <X
            className="size-3 shrink-0 opacity-40 hover:opacity-100 transition-opacity"
            onClick={handleClear}
          />
        )}
      </button>

      {/* Popover dropdown */}
      {open && !disabled && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          {/* Dropdown */}
          <div className="absolute top-full left-0 z-50 mt-1 w-[140px] rounded-md border bg-popover shadow-md animate-in fade-in-0 zoom-in-95">
            {/* Presets section */}
            {showPresets && (
              <div className="border-b px-1.5 py-1.5">
                <p className="text-[10px] text-muted-foreground px-1 mb-1">クイック選択</p>
                <div className="flex gap-1">
                  {START_TIME_PRESETS.map((t) => (
                    <button
                      key={t}
                      className={cn(
                        'flex-1 text-xs px-2 py-1.5 rounded-md transition-colors font-medium text-center',
                        value === t
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted'
                      )}
                      onClick={() => handleSelect(t)}
                    >
                      {t.replace(/^0/, '')}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Time list */}
            <div
              ref={scrollRef}
              className="max-h-[240px] overflow-y-auto overscroll-contain"
            >
              {ALL_TIME_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  className={cn(
                    'w-full text-left text-xs px-3 py-1.5 transition-colors',
                    value === opt.value
                      ? 'bg-primary text-primary-foreground font-medium'
                      : 'hover:bg-muted'
                  )}
                  onClick={() => handleSelect(opt.value)}
                >
                  <span className="inline-block w-10">{opt.label.replace(/^0/, '')}</span>
                  {/* Hour group separator */}
                  {opt.label.endsWith(':00') && (
                    <span className={cn(
                      'text-[10px] ml-1',
                      value === opt.value ? 'text-primary-foreground/70' : 'text-muted-foreground/50'
                    )}>
                      {opt.hour}時台
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
