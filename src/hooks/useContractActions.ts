import { useState, useCallback } from "react";
import { toastError } from "../utils/toastError";

interface UseContractActionsResult {
  execute: <T>(
    fn: (...args: any[]) => Promise<T>,
    args: any[]
  ) => Promise<T | null>;
  isLoading: boolean;
  error: Error | null;
}

export function useContractActions(): UseContractActionsResult {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(
    async <T>(
      fn: (...args: any[]) => Promise<T>,
      args: any[]
    ): Promise<T | null> => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await fn(...args);
        return result;
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        setError(err);
        console.error("Contract action failed:", err);
        toastError(err.message);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return { execute, isLoading, error };
}
