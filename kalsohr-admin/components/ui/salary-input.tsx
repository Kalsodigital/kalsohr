'use client';

import React from 'react';
import { Input } from './input';
import { Label } from './label';

interface SalaryInputProps {
  label: string;
  value: number | undefined; // Yearly value from database
  onChange: (yearlyValue: number | undefined) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
}

export function SalaryInput({
  label,
  value,
  onChange,
  placeholder,
  required,
  disabled,
}: SalaryInputProps) {
  // Calculate monthly from yearly (value / 12)
  const monthlySalary = value ? Math.round(value / 12) : undefined;

  // Handle monthly input change
  const handleMonthlyChange = (monthlyValue: number | undefined) => {
    const yearlyValue = monthlyValue ? monthlyValue * 12 : undefined;
    onChange(yearlyValue);
  };

  return (
    <div className="space-y-2">
      <Label>
        {label} {required && <span className="text-red-500">*</span>}
      </Label>

      {/* Monthly Salary Input */}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
          ₹
        </span>
        <Input
          type="number"
          min="0"
          value={monthlySalary !== undefined ? monthlySalary : ''}
          onChange={e =>
            handleMonthlyChange(e.target.value ? parseInt(e.target.value) : undefined)
          }
          placeholder={placeholder || '50000'}
          className="pl-8 pr-16"
          disabled={disabled}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">
          /month
        </span>
      </div>

      {/* Yearly CTC Display */}
      {value && (
        <div className="flex items-center gap-2 text-sm bg-green-50 px-3 py-2 rounded-md border border-green-200">
          <span className="text-gray-700">Yearly CTC:</span>
          <span className="font-semibold text-green-700">
            ₹{value.toLocaleString('en-IN')} /year
          </span>
        </div>
      )}
    </div>
  );
}
