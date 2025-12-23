'use client';

import { useState, useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { getAllStates } from '@/lib/api/masters/states';
import { State } from '@/lib/api/masters/countries';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface StateSelectProps {
  countryId?: number;
  value?: number;
  onChange: (stateId: number) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  showLabel?: boolean;
  activeOnly?: boolean;
  groupByType?: boolean;
}

export function StateSelect({
  countryId,
  value,
  onChange,
  label = 'State / UT',
  placeholder = 'Select a state',
  required = false,
  disabled = false,
  error,
  showLabel = true,
  activeOnly = true,
  groupByType = true,
}: StateSelectProps) {
  const [states, setStates] = useState<State[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (countryId) {
      loadStates();
    } else {
      setStates([]);
      setIsLoading(false);
    }
  }, [countryId]);

  const loadStates = async () => {
    try {
      setIsLoading(true);
      const data = await getAllStates(countryId, activeOnly);
      setStates(data);
    } catch (error) {
      toast.error('Failed to load states');
      console.error('Error loading states:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Group states by type if enabled
  const groupedStates = groupByType
    ? {
        States: states.filter((s) => s.type === 'State'),
        'Union Territories': states.filter((s) => s.type === 'Union Territory'),
      }
    : { All: states };

  return (
    <div className="space-y-2">
      {showLabel && (
        <Label htmlFor="state-select">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}
      <Select
        value={value?.toString()}
        onValueChange={(val) => onChange(Number(val))}
        disabled={disabled || isLoading || !countryId}
        required={required}
      >
        <SelectTrigger
          id="state-select"
          className={error ? 'border-red-500' : ''}
        >
          {isLoading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-gray-500">Loading states...</span>
            </div>
          ) : (
            <SelectValue
              placeholder={
                !countryId ? 'Select a country first' : placeholder
              }
            />
          )}
        </SelectTrigger>
        <SelectContent>
          {!countryId ? (
            <div className="py-6 text-center text-sm text-gray-500">
              Please select a country first
            </div>
          ) : states.length === 0 ? (
            <div className="py-6 text-center text-sm text-gray-500">
              No states available for selected country
            </div>
          ) : groupByType ? (
            <>
              {(groupedStates.States?.length ?? 0) > 0 && (
                <SelectGroup>
                  <SelectLabel>States</SelectLabel>
                  {groupedStates.States?.map((state) => (
                    <SelectItem key={state.id} value={state.id.toString()}>
                      {state.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              )}
              {(groupedStates['Union Territories']?.length ?? 0) > 0 && (
                <SelectGroup>
                  <SelectLabel>Union Territories</SelectLabel>
                  {groupedStates['Union Territories']?.map((state) => (
                    <SelectItem key={state.id} value={state.id.toString()}>
                      {state.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              )}
            </>
          ) : (
            states.map((state) => (
              <SelectItem key={state.id} value={state.id.toString()}>
                {state.name}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
