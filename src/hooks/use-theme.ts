"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "ecosort.theme.v1";
type Theme = "dark" | "light";

type ThemeStore = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const defaultTheme: Theme = "dark";

function loadInitialTheme(): Theme {
  if (typeof window === "undefined") return defaultTheme;
  const storedTheme = window.localStorage.getItem(STORAGE_KEY);
  return storedTheme === "light" ? "light" : "dark";
}

const ThemeContext = createContext<ThemeStore | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme);

  useEffect(() => {
    setThemeState(loadInitialTheme());
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    try {
        window.localStorage.setItem(STORAGE_KEY, theme);
    } catch {
        // ignore
    }
  }, [theme]);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
  }, []);
  
  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);

  return React.createElement(ThemeContext.Provider, { value }, children);
}

export function useTheme(): ThemeStore {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}
