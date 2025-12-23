'use client';

import { useState, useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { getAllCountries, Country } from '@/lib/api/masters/countries';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface CountrySelectProps {
  value?: number;
  onChange: (countryId: number) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  showLabel?: boolean;
  activeOnly?: boolean;
}

export function CountrySelect({
  value,
  onChange,
  label = 'Country',
  placeholder = 'Select a country',
  required = false,
  disabled = false,
  error,
  showLabel = true,
  activeOnly = true,
}: CountrySelectProps) {
  const [countries, setCountries] = useState<Country[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCountries();
  }, []);

  const loadCountries = async () => {
    try {
      setIsLoading(true);
      const data = await getAllCountries();
      const filteredData = activeOnly ? data.filter((c) => c.isActive) : data;
      setCountries(filteredData);
    } catch (error) {
      toast.error('Failed to load countries');
      console.error('Error loading countries:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      {showLabel && (
        <Label htmlFor="country-select">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}
      <Select
        value={value?.toString()}
        onValueChange={(val) => onChange(Number(val))}
        disabled={disabled || isLoading}
        required={required}
      >
        <SelectTrigger
          id="country-select"
          className={error ? 'border-red-500' : ''}
        >
          {isLoading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-gray-500">Loading countries...</span>
            </div>
          ) : (
            <SelectValue placeholder={placeholder} />
          )}
        </SelectTrigger>
        <SelectContent>
          {countries.length === 0 ? (
            <div className="py-6 text-center text-sm text-gray-500">
              No countries available
            </div>
          ) : (
            countries.map((country) => (
              <SelectItem key={country.id} value={country.id.toString()}>
                <div className="flex items-center gap-2">
                  <span>{country.name}</span>
                  <span className="text-xs text-gray-500">
                    ({country.phoneCode})
                  </span>
                </div>
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
