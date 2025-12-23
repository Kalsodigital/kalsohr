'use client';

import { Loader2 } from 'lucide-react';

interface PageLoaderProps {
  message?: string;
}

export function PageLoader({ message = 'Loading...' }: PageLoaderProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px]">
      <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
      <p className="mt-4 text-gray-600 font-medium">{message}</p>
    </div>
  );
}

interface ContentLoaderProps {
  className?: string;
}

export function ContentLoader({ className = '' }: ContentLoaderProps) {
  return (
    <div className={`flex items-center justify-center py-12 ${className}`}>
      <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
    </div>
  );
}
