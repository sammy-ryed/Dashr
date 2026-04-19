'use client';

import { useEffect } from 'react';
import {
  THEME_STORAGE_KEY,
  applyStoredThemePreferences,
  applyThemePreferences,
  loadThemePreferences,
} from '@/lib/theme-preferences';

export default function ThemeBootstrap() {
  useEffect(() => {
    applyStoredThemePreferences();

    function onStorage(event: StorageEvent) {
      if (event.key !== null && event.key !== THEME_STORAGE_KEY) return;
      applyThemePreferences(loadThemePreferences());
    }

    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  return null;
}
