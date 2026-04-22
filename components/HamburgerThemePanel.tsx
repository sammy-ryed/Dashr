'use client';

import { useId, useState, useEffect } from 'react';
import {
  THEME_PRESETS,
  DEFAULT_THEME_PREFERENCES,
  type ThemePreferences,
  applyThemePreferences,
  clearThemePreferences,
  getThemePresetById,
  normalizeThemePreferences,
  saveThemePreferences,
} from '@/lib/theme-preferences';

// IDs grouped for dark/light sections
const DARK_IDS  = ['classic','void-red','midnight','forest-night','deep-purple','molten','abyss','carbon','rose-noir','copper'];
const LIGHT_IDS = ['paper','purple-pop','sunset','mint','slate'];

type SectionKey = 'dark' | 'light' | 'custom' | null;

export default function HamburgerThemePanel() {
  const panelId = useId();

  // ── Hydration-safe: start with defaults on both server & client, patch on mount ──
  const [prefs, setPrefs]           = useState<ThemePreferences>(DEFAULT_THEME_PREFERENCES);
  const [mounted, setMounted]       = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [openSection, setOpenSection] = useState<SectionKey>('dark');

  useEffect(() => {
    // Only run on client after hydration
    const { loadThemePreferences } = require('@/lib/theme-preferences') as typeof import('@/lib/theme-preferences');
    const stored = loadThemePreferences();
    setPrefs(stored);
    applyThemePreferences(stored);
    setMounted(true);
  }, []);

  function updateTheme(next: ThemePreferences) {
    const normalized = normalizeThemePreferences(next);
    setPrefs(normalized);
    applyThemePreferences(normalized);
    saveThemePreferences(normalized);
  }

  function applyPreset(presetId: string) {
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

  function toggleSection(key: SectionKey) {
    setOpenSection((prev) => (prev === key ? null : key));
  }

  const darkPresets  = THEME_PRESETS.filter((p) => DARK_IDS.includes(p.id));
  const lightPresets = THEME_PRESETS.filter((p) => LIGHT_IDS.includes(p.id));

  // Current accent for the live bar — use real prefs if mounted, otherwise fallback
  const currentAccent = mounted ? prefs.accentColor : '#e9b50b';
  const currentBg     = mounted ? prefs.bgColor     : '#0f0f0f';
  const currentBox    = mounted ? prefs.boxColor    : '#1a1a1a';

  return (
    <div className="theme-panel-wrap">
      {/* ── Toggle button ── */}
      <button
        type="button"
        className={`theme-toggle-btn${isExpanded ? ' open' : ''}`}
        onClick={() => setIsExpanded((p) => !p)}
        aria-expanded={isExpanded}
        aria-controls={panelId}
      >
        <span>THEME STUDIO</span>
        <span className="theme-toggle-indicator" aria-hidden="true">
          {isExpanded ? '−' : '+'}
        </span>
      </button>

      {/* ── Collapsible panel ── */}
      <div id={panelId} className={`theme-panel${isExpanded ? ' is-open' : ''}`}>

        {/* Live palette preview bar */}
        <div style={{ display: 'flex', height: '0.4rem', marginBottom: '1rem', gap: '0.18rem' }}>
          {[currentBg, currentBox, currentAccent].map((c, i) => (
            <div
              key={i}
              style={{
                flex: i === 2 ? 2 : 1,
                background: c,
                border: '0.06rem solid rgba(128,128,128,0.2)',
                transition: 'background 0.3s ease',
              }}
            />
          ))}
        </div>

        {/* Active preset name */}
        <div style={{
          fontFamily: 'var(--mono)',
          fontSize: '0.52rem',
          fontWeight: 700,
          color: 'var(--yellow)',
          textTransform: 'uppercase',
          letterSpacing: '0.14em',
          marginBottom: '0.9rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <span>
            {mounted ? (THEME_PRESETS.find(p => p.id === prefs.presetId)?.label ?? 'Custom') : 'Classic'}
          </span>
          <span style={{ opacity: 0.4 }}>ACTIVE</span>
        </div>

        {/* ── Dark section ── */}
        <div style={{ marginBottom: '0.5rem' }}>
          <button
            type="button"
            onClick={() => toggleSection('dark')}
            style={{
              width: '100%',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0.5rem 0',
              background: 'none',
              border: 'none',
              borderTop: '0.08rem solid rgba(128,128,128,0.15)',
              cursor: 'pointer',
              fontFamily: 'var(--mono)',
              fontSize: '0.55rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.14em',
              color: openSection === 'dark' ? 'var(--yellow)' : 'var(--muted)',
              transition: 'color 0.15s',
            }}
          >
            Dark Themes ({darkPresets.length})
            <span style={{
              fontSize: '0.65rem',
              transform: openSection === 'dark' ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.2s',
              display: 'inline-block',
            }}>v</span>
          </button>

          {openSection === 'dark' && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '0.4rem',
              paddingTop: '0.5rem',
              paddingBottom: '0.4rem',
            }}>
              {darkPresets.map((preset) => {
                const active = mounted && prefs.presetId === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => applyPreset(preset.id)}
                    title={preset.label}
                    style={{
                      background: preset.bgColor,
                      border: active
                        ? `0.16rem solid ${preset.accentColor}`
                        : '0.1rem solid rgba(255,255,255,0.08)',
                      boxShadow: active ? `0.18rem 0.18rem 0 ${preset.accentColor}` : 'none',
                      padding: '0.6rem 0.55rem 0.5rem',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'box-shadow 0.15s ease, border-color 0.15s ease',
                      position: 'relative',
                    }}
                  >
                    {/* 3 colour swatches */}
                    <div style={{ display: 'flex', gap: '0.2rem', marginBottom: '0.35rem' }}>
                      {[preset.bgColor, preset.boxColor, preset.accentColor].map((c, i) => (
                        <div
                          key={i}
                          style={{
                            width: i === 2 ? '1.4rem' : '0.7rem',
                            height: '0.7rem',
                            background: c,
                            border: '0.05rem solid rgba(255,255,255,0.1)',
                            transition: 'width 0.15s',
                          }}
                        />
                      ))}
                    </div>
                    {/* Name */}
                    <div style={{
                      fontFamily: 'var(--mono)',
                      fontSize: '0.5rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      color: preset.accentColor,
                      lineHeight: 1.2,
                    }}>
                      {preset.label}
                    </div>
                    {/* Active tick */}
                    {active && (
                      <div style={{
                        position: 'absolute',
                        top: '0.25rem',
                        right: '0.35rem',
                        width: '0.35rem',
                        height: '0.35rem',
                        background: preset.accentColor,
                        borderRadius: '50%',
                      }} />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Light section ── */}
        <div style={{ marginBottom: '0.5rem' }}>
          <button
            type="button"
            onClick={() => toggleSection('light')}
            style={{
              width: '100%',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0.5rem 0',
              background: 'none',
              border: 'none',
              borderTop: '0.08rem solid rgba(128,128,128,0.15)',
              cursor: 'pointer',
              fontFamily: 'var(--mono)',
              fontSize: '0.55rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.14em',
              color: openSection === 'light' ? 'var(--yellow)' : 'var(--muted)',
              transition: 'color 0.15s',
            }}
          >
            Light Themes ({lightPresets.length})
            <span style={{
              fontSize: '0.65rem',
              transform: openSection === 'light' ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.2s',
              display: 'inline-block',
            }}>v</span>
          </button>

          {openSection === 'light' && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '0.4rem',
              paddingTop: '0.5rem',
              paddingBottom: '0.4rem',
            }}>
              {lightPresets.map((preset) => {
                const active = mounted && prefs.presetId === preset.id;
                const isDark = false;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => applyPreset(preset.id)}
                    title={preset.label}
                    style={{
                      background: preset.bgColor,
                      border: active
                        ? `0.16rem solid ${preset.accentColor}`
                        : '0.1rem solid rgba(0,0,0,0.12)',
                      boxShadow: active ? `0.18rem 0.18rem 0 ${preset.accentColor}` : 'none',
                      padding: '0.6rem 0.55rem 0.5rem',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'box-shadow 0.15s ease, border-color 0.15s ease',
                      position: 'relative',
                    }}
                  >
                    <div style={{ display: 'flex', gap: '0.2rem', marginBottom: '0.35rem' }}>
                      {[preset.bgColor, preset.boxColor, preset.accentColor].map((c, i) => (
                        <div
                          key={i}
                          style={{
                            width: i === 2 ? '1.4rem' : '0.7rem',
                            height: '0.7rem',
                            background: c,
                            border: '0.05rem solid rgba(0,0,0,0.1)',
                          }}
                        />
                      ))}
                    </div>
                    <div style={{
                      fontFamily: 'var(--mono)',
                      fontSize: '0.5rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      color: preset.accentColor,
                      lineHeight: 1.2,
                    }}>
                      {preset.label}
                    </div>
                    {active && (
                      <div style={{
                        position: 'absolute',
                        top: '0.25rem',
                        right: '0.35rem',
                        width: '0.35rem',
                        height: '0.35rem',
                        background: preset.accentColor,
                        borderRadius: '50%',
                      }} />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Fine-tune / Custom ── */}
        <div style={{ marginBottom: '0.5rem' }}>
          <button
            type="button"
            onClick={() => toggleSection('custom')}
            style={{
              width: '100%',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0.5rem 0',
              background: 'none',
              border: 'none',
              borderTop: '0.08rem solid rgba(128,128,128,0.15)',
              cursor: 'pointer',
              fontFamily: 'var(--mono)',
              fontSize: '0.55rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.14em',
              color: openSection === 'custom' ? 'var(--yellow)' : 'var(--muted)',
              transition: 'color 0.15s',
            }}
          >
            Fine-Tune Colors
            <span style={{
              fontSize: '0.65rem',
              transform: openSection === 'custom' ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.2s',
              display: 'inline-block',
            }}>v</span>
          </button>

          {openSection === 'custom' && (
            <div style={{ paddingTop: '0.5rem', paddingBottom: '0.3rem' }}>
              <div className="theme-color-grid">
                {([
                  ['theme-bg',        'Background',   'bgColor'],
                  ['theme-box',       'Box / Card',   'boxColor'],
                  ['theme-accent',    'Accent',       'accentColor'],
                  ['theme-header',    'Header',       'headerBgColor'],
                  ['theme-hamburger', 'Menu BG',      'hamburgerBgColor'],
                ] as const).map(([id, label, key]) => (
                  <label key={id} className="theme-color-control" htmlFor={id}>
                    <span>{label}</span>
                    <input
                      id={id}
                      type="color"
                      value={mounted ? prefs[key] : DEFAULT_THEME_PREFERENCES[key]}
                      onChange={(e) =>
                        updateTheme({ ...prefs, presetId: 'custom', [key]: e.target.value })
                      }
                    />
                  </label>
                ))}
              </div>
              {mounted && prefs.presetId === 'custom' && (
                <div style={{
                  fontFamily: 'var(--mono)',
                  fontSize: '0.48rem',
                  color: 'var(--yellow)',
                  marginTop: '0.5rem',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                }}>
                  Custom palette active
                </div>
              )}
            </div>
          )}
        </div>

        {/* Reset */}
        <div style={{ borderTop: '0.08rem solid rgba(128,128,128,0.15)', paddingTop: '0.7rem', marginTop: '0.2rem' }}>
          <button
            type="button"
            className="btn btn-sm btn-ghost theme-reset-btn"
            onClick={resetTheme}
          >
            Reset to Default
          </button>
        </div>
      </div>
    </div>
  );
}
