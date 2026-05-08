/**
 * useSmartPolling — production-grade polling hook
 *
 * Combines all 5 optimizations from the polling best-practices guide:
 *
 * 1. Page Visibility API   — pauses when tab is hidden, resumes + refreshes on focus
 * 2. Adaptive polling      — backs off exponentially when data hasn't changed,
 *                            resets to baseInterval when new data arrives
 * 3. Proper cleanup        — clearInterval/removeEventListener on unmount (no leaks)
 * 4. Silent background     — background refreshes never trigger loading state
 * 5. Immediate on focus    — user returning to tab gets fresh data instantly
 *
 * Usage:
 *   const { refresh } = useSmartPolling(fetchFn, {
 *     baseInterval: 30_000,   // poll every 30s when active
 *     maxInterval:  300_000,  // back off up to 5 min when idle
 *     enabled: true
 *   });
 *
 * The fetchFn receives a `silent` boolean:
 *   silent=false → first load / user-triggered → show spinner
 *   silent=true  → background refresh → update data without flicker
 */

import { useEffect, useRef, useCallback } from 'react';

interface Options {
  /** Base polling interval in ms (default 30 000 = 30s) */
  baseInterval?: number;
  /** Maximum back-off interval in ms (default 300 000 = 5 min) */
  maxInterval?: number;
  /** Back-off multiplier when data is unchanged (default 2) */
  backoffFactor?: number;
  /** Whether polling is active (default true) */
  enabled?: boolean;
}

type FetchFn = (silent: boolean) => Promise<boolean | void>;
// fetchFn should return true if new data was received, false/void if unchanged

export function useSmartPolling(
  fetchFn: FetchFn,
  {
    baseInterval  = 30_000,
    maxInterval   = 300_000,
    backoffFactor = 2,
    enabled       = true
  }: Options = {}
) {
  const timerRef        = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentInterval = useRef(baseInterval);
  const isMounted       = useRef(true);
  const fetchRef        = useRef(fetchFn);

  // Keep fetchRef current without re-triggering the effect
  useEffect(() => { fetchRef.current = fetchFn; });

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const scheduleNext = useCallback(() => {
    clearTimer();
    if (!isMounted.current || !enabled) return;
    timerRef.current = setTimeout(async () => {
      if (!isMounted.current || document.hidden) return;
      try {
        const hasNewData = await fetchRef.current(true); // silent
        if (hasNewData) {
          // New data → reset to base interval
          currentInterval.current = baseInterval;
        } else {
          // No change → back off (cap at maxInterval)
          currentInterval.current = Math.min(
            currentInterval.current * backoffFactor,
            maxInterval
          );
        }
      } catch {
        // On error, back off too
        currentInterval.current = Math.min(
          currentInterval.current * backoffFactor,
          maxInterval
        );
      }
      scheduleNext();
    }, currentInterval.current);
  }, [enabled, baseInterval, maxInterval, backoffFactor, clearTimer]);

  // Manual refresh (e.g. button click) — resets back-off
  const refresh = useCallback(async (silent = false) => {
    clearTimer();
    currentInterval.current = baseInterval;
    try {
      await fetchRef.current(silent);
    } catch { /* caller handles */ }
    scheduleNext();
  }, [baseInterval, clearTimer, scheduleNext]);

  useEffect(() => {
    if (!enabled) return;
    isMounted.current = true;
    currentInterval.current = baseInterval;

    // Initial fetch (not silent — show spinner on first load)
    fetchRef.current(false).catch(() => {});

    // Page Visibility API — pause when hidden, refresh immediately on focus
    const handleVisibility = () => {
      if (document.hidden) {
        clearTimer(); // stop polling while tab is hidden
      } else {
        // User returned — fetch immediately then resume schedule
        currentInterval.current = baseInterval; // reset back-off
        fetchRef.current(true).catch(() => {});  // silent refresh
        scheduleNext();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    scheduleNext();

    return () => {
      isMounted.current = false;
      clearTimer();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [enabled, baseInterval, clearTimer, scheduleNext]);

  return { refresh };
}
