import { differenceInMonths } from "date-fns";

export interface AgeData {
  value: number;
  unit: 'months' | 'years';
}

/**
 * Calculate the current age based on registration date and initial age
 * Handles automatic conversion from months to years when reaching 12 months
 */
export function calculateCurrentAge(
  initialValue: number,
  initialUnit: 'months' | 'years',
  registeredAt: Date
): AgeData {
  const now = new Date();
  const monthsPassed = differenceInMonths(now, registeredAt);
  
  if (initialUnit === 'months') {
    // Add months passed to initial months
    let totalMonths = initialValue + monthsPassed;
    
    // Convert to years if 12 or more months
    if (totalMonths >= 12) {
      const years = Math.floor(totalMonths / 12);
      const remainingMonths = totalMonths % 12;
      
      // If there are remaining months, we still show in months until next year conversion
      // But per requirements, once we hit 12 months, we convert to years
      if (remainingMonths === 0) {
        return { value: years, unit: 'years' };
      } else {
        // After first year, continue counting in years
        return { value: years, unit: 'years' };
      }
    }
    
    return { value: totalMonths, unit: 'months' };
  } else {
    // For years, add a year for every 12 months passed
    const yearsToAdd = Math.floor(monthsPassed / 12);
    return { value: initialValue + yearsToAdd, unit: 'years' };
  }
}

/**
 * Format age for display (e.g., "3 years" or "7 months")
 */
export function formatAge(ageData: AgeData): string {
  const { value, unit } = ageData;
  if (value === 1) {
    return `${value} ${unit === 'months' ? 'month' : 'year'}`;
  }
  return `${value} ${unit}`;
}

/**
 * Normalize age unit to standard format
 */
export function normalizeAgeUnit(unit: string): 'months' | 'years' {
  if (unit === 'month' || unit === 'months') {
    return 'months';
  }
  return 'years';
}
