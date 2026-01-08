'use client';

import { Star } from 'lucide-react';
import { useState } from 'react';

interface StarRatingProps {
  value: number | null;
  onChange?: (rating: number | null) => void;
  readonly?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export function StarRating({
  value,
  onChange,
  readonly = false,
  size = 'md',
  showLabel = false,
}: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const handleClick = (rating: number) => {
    if (readonly || !onChange) return;

    // If clicking the same rating, clear it
    if (value === rating) {
      onChange(null);
    } else {
      onChange(rating);
    }
  };

  const handleMouseEnter = (rating: number) => {
    if (readonly || !onChange) return;
    setHoverRating(rating);
  };

  const handleMouseLeave = () => {
    if (readonly || !onChange) return;
    setHoverRating(null);
  };

  const displayRating = hoverRating ?? value ?? 0;

  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((rating) => (
          <button
            key={rating}
            type="button"
            onClick={() => handleClick(rating)}
            onMouseEnter={() => handleMouseEnter(rating)}
            onMouseLeave={handleMouseLeave}
            disabled={readonly}
            className={`
              ${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'}
              transition-transform duration-150
              ${!readonly ? 'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-400 rounded' : ''}
            `}
          >
            <Star
              className={`
                ${sizeClasses[size]}
                ${
                  rating <= displayRating
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'fill-none text-gray-300'
                }
                transition-colors duration-150
              `}
            />
          </button>
        ))}
      </div>
      {showLabel && value !== null && (
        <span className="text-sm text-gray-600 ml-1">
          {value}/5
        </span>
      )}
    </div>
  );
}
