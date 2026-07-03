import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Hook for punch in/out live timer.
 * Ports the timer logic from script.js L362-L448.
 */
export default function useLiveTimer() {
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [startTime, setStartTime] = useState(null);
  const intervalRef = useRef(null);

  const formatDuration = useCallback((totalSeconds) => {
    const hrs = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
    const mins = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
    const secs = String(totalSeconds % 60).padStart(2, '0');
    return `${hrs}:${mins}:${secs}`;
  }, []);

  const start = useCallback(() => {
    const now = Date.now();
    setStartTime(now);
    setRunning(true);
    setElapsed(0);
  }, []);

  const stop = useCallback(() => {
    setRunning(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const resume = useCallback((savedStartTime) => {
    setStartTime(savedStartTime);
    setRunning(true);
    const diffSecs = Math.floor((Date.now() - savedStartTime) / 1000);
    setElapsed(diffSecs);
  }, []);

  useEffect(() => {
    if (running && startTime) {
      intervalRef.current = setInterval(() => {
        const diffSecs = Math.floor((Date.now() - startTime) / 1000);
        setElapsed(diffSecs);
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [running, startTime]);

  return {
    elapsed,
    running,
    startTime,
    formatted: formatDuration(elapsed),
    start,
    stop,
    resume,
    setRunning,
  };
}
