'use client';

import { useState } from 'react';
import CreatableSelect from 'react-select/creatable';
import type { MultiValue } from 'react-select';

interface PhrasesInputProps {
  value: string[];
  onChange: (phrases: string[]) => void;
  placeholder?: string;
}

interface Option {
  label: string;
  value: string;
}

export function PhrasesInput({
  value,
  onChange,
  placeholder = 'Type a phrase and press Enter...',
}: PhrasesInputProps) {
  const [inputValue, setInputValue] = useState('');

  const options: Option[] = value.map((p) => ({ label: p, value: p }));

  const addPhrase = (input: string) => {
    const phrase = input.trim();
    if (!phrase || value.includes(phrase)) return;
    onChange([...value, phrase]);
    setInputValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!inputValue) return;
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      addPhrase(inputValue);
    }
  };

  const handleChange = (selected: MultiValue<Option>) => {
    onChange(selected.map((s) => s.value));
  };

  return (
    <CreatableSelect<Option, true>
      isMulti
      menuIsOpen={false}
      components={{ DropdownIndicator: null }}
      inputValue={inputValue}
      onInputChange={(val) => setInputValue(val)}
      value={options}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      onBlur={() => addPhrase(inputValue)}
      placeholder={placeholder}
      styles={{
        control: (base, state) => ({
          ...base,
          backgroundColor: 'hsl(var(--background))',
          borderColor: state.isFocused ? 'hsl(var(--primary))' : 'hsl(var(--input))',
          boxShadow: state.isFocused ? '0 0 0 2px hsl(var(--primary) / 0.2)' : 'none',
          borderRadius: '0.375rem',
          minHeight: '2.25rem',
          '&:hover': { borderColor: 'hsl(var(--primary) / 0.5)' },
        }),
        multiValue: (base) => ({
          ...base,
          backgroundColor: 'hsl(var(--primary) / 0.1)',
          border: '1px solid hsl(var(--primary) / 0.2)',
          borderRadius: '9999px',
          padding: '0 2px',
        }),
        multiValueLabel: (base) => ({
          ...base,
          color: 'hsl(var(--primary))',
          fontSize: '0.75rem',
          fontWeight: 500,
          padding: '1px 4px',
        }),
        multiValueRemove: (base) => ({
          ...base,
          color: 'hsl(var(--primary))',
          borderRadius: '9999px',
          '&:hover': {
            backgroundColor: 'hsl(var(--destructive) / 0.1)',
            color: 'hsl(var(--destructive))',
          },
        }),
        input: (base) => ({
          ...base,
          color: 'hsl(var(--foreground))',
          fontSize: '0.875rem',
        }),
        placeholder: (base) => ({
          ...base,
          color: 'hsl(var(--muted-foreground))',
          fontSize: '0.875rem',
        }),
        menu: () => ({ display: 'none' }),
      }}
    />
  );
}
