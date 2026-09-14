'use client';

import {useEffect, useState, useRef} from 'react';
import {Palette, Check} from 'lucide-react';

export const THEME_ACCENTS = [
  {id: 'nexus', name: 'NEXUS Electric', color: '#4f8ef7', border: '#2563eb'},
  {id: 'gold', name: 'Phantom Gold', color: '#f59e0b', border: '#d97706'},
  {id: 'violet', name: 'Midnight Violet', color: '#8b5cf6', border: '#7c3aed'},
  {id: 'crimson', name: 'Carbon Crimson', color: '#ef4444', border: '#dc2626'},
  {id: 'cyan', name: 'Deep Cyan', color: '#06b6d4', border: '#0891b2'},
  {id: 'emerald', name: 'Slate Emerald', color: '#10b981', border: '#059669'},
];

export default function ThemeAccentPicker() {
  const [open, setOpen] = useState(false);
  const [accent, setAccent] = useState('cyan');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('pds-theme-accent') || 'cyan';
    setAccent(saved);
    document.documentElement.setAttribute('data-accent', saved);
  }, []);

  const selectAccent = (id: string) => {
    setAccent(id);
    localStorage.setItem('pds-theme-accent', id);
    document.documentElement.setAttribute('data-accent', id);
    setOpen(false);
  };

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', onClick);
    return () => document.removeEventListener('pointerdown', onClick);
  }, [open]);

  const current = THEME_ACCENTS.find(a => a.id === accent) || THEME_ACCENTS[0];

  return (
    <div className="theme-accent-picker-wrap" ref={ref}>
      <button
        type="button"
        className="wc-btn wc-btn-secondary theme-accent-trigger"
        onClick={() => setOpen(v => !v)}
        title={`Theme color: ${current.name}`}
        aria-label="Select workspace theme color"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span
          className="theme-accent-dot"
          style={{backgroundColor: current.color}}
        />
        <Palette size={14} />
      </button>

      {open && (
        <div className="theme-accent-menu" role="menu" aria-label="Theme color options">
          <div className="theme-accent-menu-header">NEXUS Themes</div>
          {THEME_ACCENTS.map(item => (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              className={`theme-accent-option ${accent === item.id ? 'active' : ''}`}
              onClick={() => selectAccent(item.id)}
            >
              <span
                className="theme-accent-preview-chip"
                style={{backgroundColor: item.color, borderColor: item.border}}
              />
              <span>{item.name}</span>
              {accent === item.id && <Check size={14} className="theme-accent-check" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
