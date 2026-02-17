"use client";

import { useState, useEffect, useCallback } from "react";
import { ChildConfig } from "@/lib/types";
import { DEFAULT_CHILDREN } from "@/lib/constants";

const STORAGE_KEY = "contracts";

export function useContracts() {
  const [children, setChildren] = useState<ChildConfig[]>(DEFAULT_CHILDREN);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as ChildConfig[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setChildren(parsed);
        }
      } catch {
        // ignore invalid data
      }
    }
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(children));
    }
  }, [children, isHydrated]);

  const updateChild = useCallback((index: number, updates: Partial<ChildConfig>) => {
    setChildren((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...updates };
      return next;
    });
  }, []);

  return { children, updateChild, isHydrated };
}
