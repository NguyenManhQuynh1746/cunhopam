'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { NoteNotation } from '@/lib/chords';

interface AppContextType {
  notation: NoteNotation;
  toggleNotation: () => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [notation, setNotation] = useState<NoteNotation>('en');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Đọc theme từ localStorage hoặc media query hệ thống
    const savedTheme = localStorage.getItem('cunhopam_theme') as 'light' | 'dark' | null;
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = savedTheme || (systemPrefersDark ? 'dark' : 'light');

    setTheme(initialTheme);
    document.documentElement.setAttribute('data-theme', initialTheme);
    if (initialTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Đọc notation từ localStorage
    const savedNotation = localStorage.getItem('cunhopam_notation') as NoteNotation | null;
    if (savedNotation === 'vi' || savedNotation === 'en') {
      setNotation(savedNotation);
    }

    setMounted(true);
  }, []);

  const toggleNotation = () => {
    const next = notation === 'en' ? 'vi' : 'en';
    setNotation(next);
    localStorage.setItem('cunhopam_notation', next);
  };

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    localStorage.setItem('cunhopam_theme', next);
    document.documentElement.setAttribute('data-theme', next);
    if (next === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  return (
    <AppContext.Provider value={{ notation, toggleNotation, theme, toggleTheme }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

