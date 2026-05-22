"use client";

import { useState, useEffect, useRef, useCallback } from "react";

export function useElapsedTimer(running: boolean, initialElapsed?: number) {
  const [elapsed, setElapsed] = useState(initialElapsed ?? 0);
  const startRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const initialElapsedRef = useRef(initialElapsed);

  // Seed the timer with an initial offset (e.g. from a previous session)
  // so return-visits don't start from zero.
  useEffect(() => {
    if (initialElapsed !== undefined && initialElapsed > 0) {
      initialElapsedRef.current = initialElapsed;
      setElapsed(initialElapsed);
    }
  }, [initialElapsed]);

  useEffect(() => {
    if (running) {
      if (startRef.current === null) {
        startRef.current = Date.now() - elapsed * 1000;
      }
      intervalRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startRef.current!) / 1000));
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  const reset = useCallback(() => {
    startRef.current = null;
    setElapsed(0);
  }, []);

  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const s = elapsed % 60;

  const formatted = [
    String(h).padStart(2, "0"),
    String(m).padStart(2, "0"),
    String(s).padStart(2, "0"),
  ].join(":");

  return { elapsed, formatted, reset };
}
