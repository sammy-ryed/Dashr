'use client';

import { useId, useState } from 'react';
import {
  THEME_PRESETS,
  DEFAULT_THEME_PREFERENCES,
  type ThemePreferences,
  applyThemePreferences,
  clearThemePreferences,
  getThemePresetById,
  loadThemePreferences,
  normalizeThemePreferences,
  saveThemePreferences,
} from '@/lib/theme-preferences';

export default function HamburgerThemePanel() {
  const [prefs, setPrefs] = useState<ThemePreferences>(() => loadThemePreferences());
  const [isExpanded, setIsExpanded] = useState(false);
  const panelId = useId();

  function updateTheme(next: ThemePreferences) {
    const normalized = normalizeThemePreferences(next);
    setPrefs(normalized);
    applyThemePreferences(normalized);
    saveThemePreferences(normalized);
  }

  function onPresetChange(presetId: string) {
    if (presetId === 'custom') return;
    const preset = getThemePresetById(presetId);
    updateTheme({
      presetId: preset.id,
      bgColor: preset.bgColor,
      boxColor: preset.boxColor,
      accentColor: preset.accentColor,
      headerBgColor: preset.headerBgColor,
      hamburgerBgColor: preset.hamburgerBgColor,
    });
  }

  function resetTheme() {
    clearThemePreferences();
    setPrefs(DEFAULT_THEME_PREFERENCES);
    applyThemePreferences(DEFAULT_THEME_PREFERENCES);
  }

  return (
    <div className="theme-panel-wrap">
      <button
        type="button"
        className={`theme-toggle-btn ${isExpanded ? 'open' : ''}`}
        onClick={() => setIsExpanded((prev) => !prev)}
        aria-expanded={isExpanded}
        aria-controls={panelId}
      >
        <span>Theme Studio</span>
        <span className="theme-toggle-indicator" aria-hidden="true">
          {isExpanded ? '−' : '+'}
        </span>
      </button>

      <div id={panelId} className={`theme-panel ${isExpanded ? 'is-open' : ''}`}>
        <div className="theme-panel-title">Customize Colors</div>

        <label className="theme-panel-label" htmlFor="theme-preset">
          Preset
        </label>
        <select
          id="theme-preset"
          className="theme-panel-select"
          value={prefs.presetId}
          onChange={(e) => onPresetChange(e.target.value)}
        >
          {prefs.presetId === 'custom' && <option value="custom">Custom</option>}
          {THEME_PRESETS.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {preset.label}
            </option>
          ))}
        </select>

        <div className="theme-color-grid">
          <label className="theme-color-control" htmlFor="theme-bg-color">
            <span>Background</span>
            <input
              id="theme-bg-color"
              type="color"
              value={prefs.bgColor}
              onChange={(e) => updateTheme({ ...prefs, presetId: 'custom', bgColor: e.target.value })}
            />
          </label>

          <label className="theme-color-control" htmlFor="theme-box-color">
            <span>Box</span>
            <input
              id="theme-box-color"
              type="color"
              value={prefs.boxColor}
              onChange={(e) => updateTheme({ ...prefs, presetId: 'custom', boxColor: e.target.value })}
            />
          </label>

          <label className="theme-color-control" htmlFor="theme-accent-color">
            <span>Accent</span>
            <input
              id="theme-accent-color"
              type="color"
              value={prefs.accentColor}
              onChange={(e) => updateTheme({ ...prefs, presetId: 'custom', accentColor: e.target.value })}
            />
          </label>

          <label className="theme-color-control" htmlFor="theme-header-bg-color">
            <span>Header BG</span>
            <input
              id="theme-header-bg-color"
              type="color"
              value={prefs.headerBgColor}
              onChange={(e) => updateTheme({ ...prefs, presetId: 'custom', headerBgColor: e.target.value })}
            />
          </label>

          <label className="theme-color-control" htmlFor="theme-hamburger-bg-color">
            <span>Hamburger BG</span>
            <input
              id="theme-hamburger-bg-color"
              type="color"
              value={prefs.hamburgerBgColor}
              onChange={(e) => updateTheme({ ...prefs, presetId: 'custom', hamburgerBgColor: e.target.value })}
            />
          </label>
        </div>

        <button type="button" className="btn btn-sm btn-ghost theme-reset-btn" onClick={resetTheme}>
          Reset Theme
        </button>
      </div>
    </div>
  );
}
