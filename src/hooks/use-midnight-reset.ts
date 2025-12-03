import { useEffect, useCallback, useRef } from "react";

/**
 * Hook that triggers a callback exactly at midnight (00:00:00)
 * Also triggers on visibility change and checks every minute as backup
 */
export const useMidnightReset = (onReset: () => void) => {
  const lastDateRef = useRef<string>(new Date().toISOString().split("T")[0]);
  const midnightTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const getMillisecondsUntilMidnight = useCallback(() => {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setDate(midnight.getDate() + 1);
    midnight.setHours(0, 0, 0, 0);
    return midnight.getTime() - now.getTime();
  }, []);

  const checkDateChange = useCallback(() => {
    const currentDate = new Date().toISOString().split("T")[0];
    if (lastDateRef.current !== currentDate) {
      lastDateRef.current = currentDate;
      onReset();
    }
  }, [onReset]);

  const scheduleMidnightReset = useCallback(() => {
    // Clear any existing timeout
    if (midnightTimeoutRef.current) {
      clearTimeout(midnightTimeoutRef.current);
    }

    const msUntilMidnight = getMillisecondsUntilMidnight();
    
    // Schedule the reset for exactly midnight
    midnightTimeoutRef.current = setTimeout(() => {
      checkDateChange();
      // Schedule the next midnight reset
      scheduleMidnightReset();
    }, msUntilMidnight);
  }, [getMillisecondsUntilMidnight, checkDateChange]);

  useEffect(() => {
    // Initial setup
    lastDateRef.current = new Date().toISOString().split("T")[0];
    
    // Schedule midnight reset
    scheduleMidnightReset();

    // Backup: Check every minute in case the timeout drifts
    const minuteInterval = setInterval(checkDateChange, 60000);

    // Check on visibility change (when user returns to tab)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkDateChange();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Cleanup
    return () => {
      if (midnightTimeoutRef.current) {
        clearTimeout(midnightTimeoutRef.current);
      }
      clearInterval(minuteInterval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [scheduleMidnightReset, checkDateChange]);
};
