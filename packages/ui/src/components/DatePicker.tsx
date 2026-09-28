import React, { useState } from 'react';
import { Input } from './Input';
interface DatePickerProps {
  value: string;
  onChange: (date: string) => void;
  placeholder?: string;
  label?: string;
}
export function DatePicker({
  value,
  onChange,
  placeholder = 'AAAA-MM-DD',
  label = 'Fecha',
}: DatePickerProps) {
  const [draft, setDraft] = useState(value),
    [error, setError] = useState('');
  React.useEffect(() => {
    setDraft(value);
  }, [value]);
  return (
    <Input
      label={label}
      value={draft}
      onChangeText={(text) => {
        setDraft(text);
        setError('');
      }}
      placeholder={placeholder}
      accessibilityHint="Fecha en formato año, mes y día"
      onBlur={() => {
        if (!draft) {
          onChange('');
          return;
        }
        const date = new Date(draft + 'T00:00:00Z');
        if (
          !/^\d{4}-\d{2}-\d{2}$/.test(draft) ||
          Number.isNaN(date.getTime()) ||
          date.toISOString().slice(0, 10) !== draft
        ) {
          setError('Usa una fecha válida con formato AAAA-MM-DD');
        } else onChange(draft);
      }}
      error={error}
    />
  );
}
