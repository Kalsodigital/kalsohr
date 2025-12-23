# Form Components

Reusable form components for the KalsoHR admin panel.

## CountrySelect

A dropdown component for selecting countries with phone codes.

### Usage

```tsx
import { CountrySelect } from '@/components/forms';

function MyForm() {
  const [countryId, setCountryId] = useState<number>();

  return (
    <CountrySelect
      value={countryId}
      onChange={setCountryId}
      label="Country"
      placeholder="Select a country"
      required
    />
  );
}
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `number` | - | Selected country ID |
| `onChange` | `(countryId: number) => void` | - | Callback when selection changes |
| `label` | `string` | `'Country'` | Label text |
| `placeholder` | `string` | `'Select a country'` | Placeholder text |
| `required` | `boolean` | `false` | Whether field is required |
| `disabled` | `boolean` | `false` | Disable the select |
| `error` | `string` | - | Error message to display |
| `showLabel` | `boolean` | `true` | Show/hide the label |
| `activeOnly` | `boolean` | `true` | Show only active countries |

## StateSelect

A dropdown component for selecting states/UTs with automatic grouping.

### Usage

```tsx
import { StateSelect } from '@/components/forms';

function MyForm() {
  const [countryId, setCountryId] = useState<number>();
  const [stateId, setStateId] = useState<number>();

  return (
    <>
      <CountrySelect
        value={countryId}
        onChange={setCountryId}
        required
      />

      <StateSelect
        countryId={countryId}
        value={stateId}
        onChange={setStateId}
        label="State / UT"
        placeholder="Select a state"
        required
        groupByType
      />
    </>
  );
}
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `countryId` | `number` | - | Filter states by country ID |
| `value` | `number` | - | Selected state ID |
| `onChange` | `(stateId: number) => void` | - | Callback when selection changes |
| `label` | `string` | `'State / UT'` | Label text |
| `placeholder` | `string` | `'Select a state'` | Placeholder text |
| `required` | `boolean` | `false` | Whether field is required |
| `disabled` | `boolean` | `false` | Disable the select |
| `error` | `string` | - | Error message to display |
| `showLabel` | `boolean` | `true` | Show/hide the label |
| `activeOnly` | `boolean` | `true` | Show only active states |
| `groupByType` | `boolean` | `true` | Group states and UTs separately |

## Features

- **Automatic loading**: Countries and states are fetched automatically
- **Loading states**: Shows spinner while data is loading
- **Error handling**: Displays toast notifications on API errors
- **Validation**: Built-in required field validation
- **Cascading**: StateSelect automatically filters by selected country
- **Grouping**: States and Union Territories grouped separately (optional)
- **Phone codes**: Country select displays phone codes
- **Type-safe**: Full TypeScript support with proper interfaces

## Example: Complete Form

```tsx
'use client';

import { useState } from 'react';
import { CountrySelect, StateSelect } from '@/components/forms';
import { Button } from '@/components/ui/button';

export function AddressForm() {
  const [countryId, setCountryId] = useState<number>();
  const [stateId, setStateId] = useState<number>();
  const [errors, setErrors] = useState<{ country?: string; state?: string }>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    const newErrors: typeof errors = {};
    if (!countryId) newErrors.country = 'Country is required';
    if (!stateId) newErrors.state = 'State is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Submit form...
    console.log({ countryId, stateId });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <CountrySelect
        value={countryId}
        onChange={(id) => {
          setCountryId(id);
          setStateId(undefined); // Reset state when country changes
          setErrors({});
        }}
        required
        error={errors.country}
      />

      <StateSelect
        countryId={countryId}
        value={stateId}
        onChange={(id) => {
          setStateId(id);
          setErrors({});
        }}
        required
        error={errors.state}
      />

      <Button type="submit">Submit</Button>
    </form>
  );
}
```
