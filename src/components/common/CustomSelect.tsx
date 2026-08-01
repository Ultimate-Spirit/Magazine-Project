import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
}

interface CustomSelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({ options, value, onChange, placeholder = 'Select...', disabled = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(o => o.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between h-9 px-3 bg-background border border-border rounded-lg text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-border/80'}`}
      >
        <span className={selectedOption ? 'text-foreground' : 'text-muted-foreground'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-card border border-border shadow-lg backdrop-blur-md rounded-lg overflow-hidden animate-in fade-in zoom-in-95 duration-100 max-h-60 overflow-y-auto invisible-scrollbar py-1">
          {options.length === 0 ? (
            <div className="px-3 py-2 text-sm text-muted-foreground text-center">No options available</div>
          ) : (
            options.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between hover:bg-muted transition-colors ${value === option.value ? 'bg-muted/50 text-foreground font-medium' : 'text-muted-foreground'}`}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
              >
                {option.label}
                {value === option.value && <Check className="w-4 h-4 text-primary" />}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};
