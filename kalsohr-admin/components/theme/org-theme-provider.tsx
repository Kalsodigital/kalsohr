'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getOrganizationProfile } from '@/lib/api/org/organization';

interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
}

export function OrgThemeProvider({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const orgSlug = params?.orgSlug as string;
  const [themeColors, setThemeColors] = useState<ThemeColors | null>(null);

  useEffect(() => {
    const fetchThemeColors = async () => {
      try {
        const data = await getOrganizationProfile(orgSlug);
        setThemeColors({
          primary: data.organization.themePrimaryColor || '#3B82F6',
          secondary: data.organization.themeSecondaryColor || '#8B5CF6',
          accent: data.organization.themeAccentColor || '#EC4899',
        });
      } catch (error) {
        console.error('Failed to fetch theme colors:', error);
        // Fallback to default colors
        setThemeColors({
          primary: '#3B82F6',
          secondary: '#8B5CF6',
          accent: '#EC4899',
        });
      }
    };

    if (orgSlug) {
      fetchThemeColors();
    }
  }, [orgSlug]);

  // Don't render children until theme is loaded to avoid flash of unstyled content
  if (!themeColors) {
    return <>{children}</>;
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        :root {
          --color-theme-primary: ${themeColors.primary};
          --color-theme-secondary: ${themeColors.secondary};
          --color-theme-accent: ${themeColors.accent};

          /* RGB values for Tailwind opacity utilities */
          --color-theme-primary-rgb: ${hexToRgb(themeColors.primary)};
          --color-theme-secondary-rgb: ${hexToRgb(themeColors.secondary)};
          --color-theme-accent-rgb: ${hexToRgb(themeColors.accent)};
        }

        /* Apply theme colors to common elements */

        /* Primary buttons - all blue buttons get theme primary color */
        button[class*="bg-blue-"]:not([class*="bg-blue-50"]):not([class*="bg-blue-100"]):not([class*="bg-blue-200"]) {
          background: var(--color-theme-primary) !important;
          border-color: var(--color-theme-primary) !important;
          color: white !important;
        }

        button[class*="bg-blue-"]:hover {
          filter: brightness(0.9) !important;
        }

        /* Active navigation background - sidebar active menu items */
        /* Use simple background color instead of gradients for better compatibility */
        nav a.bg-gradient-to-r.from-blue-50.to-blue-100,
        aside nav a.bg-gradient-to-r.from-blue-50.to-blue-100,
        nav a.from-blue-50.to-blue-100,
        aside nav a.from-blue-50.to-blue-100 {
          background-color: rgba(var(--color-theme-primary-rgb), 0.15) !important;
          background-image: none !important;
        }

        /* Also target just the class combination without parent selector for higher specificity */
        a.bg-gradient-to-r.from-blue-50.to-blue-100 {
          background-color: rgba(var(--color-theme-primary-rgb), 0.15) !important;
          background-image: none !important;
        }

        /* Gradient buttons and badges */
        button[class*="bg-gradient-to-r"][class*="from-blue-"],
        [class*="bg-gradient-to-r"][class*="from-blue-"]:not(nav a):not(aside a) {
          background-image: linear-gradient(to right, var(--color-theme-primary), var(--color-theme-secondary)) !important;
          color: white !important;
        }

        /* Hero gradients */
        [class*="bg-gradient-to-br"][class*="from-blue-"] {
          background-image: linear-gradient(to bottom right, var(--color-theme-primary), var(--color-theme-secondary)) !important;
        }

        /* Active navigation text color */
        nav a[class*="text-blue-700"],
        a[class*="text-blue-700"] {
          color: var(--color-theme-primary) !important;
        }

        /* Text colors - links and active states */
        a[class*="text-blue-"],
        [class*="text-blue-700"],
        [class*="text-blue-600"] {
          color: var(--color-theme-primary) !important;
        }

        /* Border colors */
        [class*="border-blue-"]:not([class*="border-blue-50"]):not([class*="border-blue-100"]) {
          border-color: var(--color-theme-primary) !important;
        }

        /* Icon backgrounds */
        [class*="bg-blue-100"] {
          background-color: rgba(var(--color-theme-primary-rgb), 0.1) !important;
        }

        [class*="bg-blue-600"]:not(button) {
          background-color: var(--color-theme-primary) !important;
        }

        /* Loading spinner */
        [class*="border-blue-600"],
        .animate-spin[class*="border-blue-"] {
          border-color: var(--color-theme-primary) !important;
        }

        /* Focus rings */
        *:focus-visible {
          outline-color: var(--color-theme-primary) !important;
        }

        /* Secondary color - purple elements */
        [class*="bg-purple-600"] {
          background-color: var(--color-theme-secondary) !important;
        }

        [class*="bg-purple-100"] {
          background-color: rgba(var(--color-theme-secondary-rgb), 0.1) !important;
        }

        [class*="text-purple-600"] {
          color: var(--color-theme-secondary) !important;
        }

        /* Gradient with purple */
        [class*="from-purple-"][class*="to-pink-"],
        [class*="bg-gradient-to-r"][class*="from-purple-"] {
          background-image: linear-gradient(to right, var(--color-theme-secondary), var(--color-theme-accent)) !important;
          color: white !important;
        }

        /* Accent color - pink elements */
        [class*="bg-pink-600"] {
          background-color: var(--color-theme-accent) !important;
        }

        [class*="bg-pink-100"] {
          background-color: rgba(var(--color-theme-accent-rgb), 0.1) !important;
        }

        [class*="text-pink-600"] {
          color: var(--color-theme-accent) !important;
        }

        /* Indigo colors - map to secondary */
        [class*="bg-indigo-"] {
          background-color: var(--color-theme-secondary) !important;
        }

        [class*="text-indigo-"] {
          color: var(--color-theme-secondary) !important;
        }

        /* Indigo in gradients */
        [class*="to-indigo-"] {
          /* Handled by gradient rules above */
        }
      ` }} />
      {children}
    </>
  );
}

// Helper function to convert hex to RGB
function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '59, 130, 246'; // fallback to blue-600

  return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`;
}
