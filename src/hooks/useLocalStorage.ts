import { useEffect, useState } from "react";

/**
 * Persistent state in localStorage with JSON (de)serialization.
 * Object values are shallow-merged over the initial default so that
 * settings added in later versions keep working.
 */
export function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw == null) return initial;
      const parsed = JSON.parse(raw) as T;
      if (
        parsed !== null &&
        typeof parsed === "object" &&
        !Array.isArray(parsed) &&
        initial !== null &&
        typeof initial === "object" &&
        !Array.isArray(initial)
      ) {
        return { ...(initial as object), ...(parsed as object) } as T;
      }
      return parsed;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* storage may be unavailable (private mode) — state still works in memory */
    }
  }, [key, value]);

  return [value, setValue] as const;
}
